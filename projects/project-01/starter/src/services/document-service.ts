import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Document } from '../shared/types';
import { PersistenceService } from './persistence-service';

const DOCUMENTS_META = 'documents-meta.json';

export class DocumentService {
  private persistence: PersistenceService;

  constructor(persistence: PersistenceService) {
    this.persistence = persistence;
  }

  /** List all imported documents. */
  listDocuments(): Document[] {
    const docs = this.persistence.readJson<Document[]>(DOCUMENTS_META);
    return docs ?? [];
  }

  /** Import a file from the given path. */
  importDocument(filePath: string): Document {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const filename = path.basename(filePath);
    if (!['.txt', '.md'].includes(path.extname(filename).toLowerCase())) {
      throw new Error('仅支持 UTF-8 编码的 TXT 和 Markdown 文件');
    }
    if (fs.statSync(filePath).size > 10 * 1024 * 1024) throw new Error('文档不能超过 10 MB');
    const content = fs.readFileSync(filePath, 'utf-8');
    const stats = fs.statSync(filePath);

    const doc: Document = {
      id: uuidv4(),
      title: filename.replace(/\.[^.]+$/, ''),
      filename,
      importedAt: new Date().toISOString(),
      size: stats.size,
      status: 'imported',
    };

    // Copy file to data directory
    this.persistence.copyFileToDocuments(filePath, `${doc.id}-${filename}`);

    // Store content for indexing
    this.persistence.writeText(`content/${doc.id}.txt`, content);

    // Update metadata
    const docs = this.listDocuments();
    docs.push(doc);
    this.persistence.writeJson(DOCUMENTS_META, docs);

    return doc;
  }

  /** Get a single document by ID. */
  getDocument(id: string): Document | null {
    const docs = this.listDocuments();
    return docs.find(d => d.id === id) ?? null;
  }

  /** Get the text content of a document. */
  getDocumentContent(id: string): string | null {
    return this.persistence.readText(`content/${id}.txt`);
  }

  /** Update a document's metadata. */
  updateDocument(id: string, updates: Partial<Document>): Document | null {
    const docs = this.listDocuments();
    const index = docs.findIndex(d => d.id === id);
    if (index === -1) return null;

    docs[index] = { ...docs[index], ...updates };
    this.persistence.writeJson(DOCUMENTS_META, docs);
    return docs[index];
  }

  /** Delete a document by ID. */
  deleteDocument(id: string): boolean {
    const docs = this.listDocuments();
    const doc = docs.find(d => d.id === id);
    if (!doc) return false;

    this.persistence.deleteFromDocuments(`${doc.id}-${doc.filename}`);
    this.persistence.deleteFile(`content/${doc.id}.txt`);
    this.persistence.deleteFile(`chunks/${doc.id}.json`);
    const index = this.persistence.readJson<Record<string, string[]>>('index-meta.json') ?? {};
    delete index[doc.id];
    this.persistence.writeJson('index-meta.json', index);

    const updated = docs.filter(d => d.id !== id);
    this.persistence.writeJson(DOCUMENTS_META, updated);
    return true;
  }
}
