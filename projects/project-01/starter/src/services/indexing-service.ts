import { randomUUID } from 'crypto';
import { AppStatus, Chunk, Document } from '../shared/types';
import { PersistenceService } from './persistence-service';
export class IndexingService {
  constructor(private persistence: PersistenceService) {}
  async startIndexing(documentId?: string): Promise<AppStatus> {
    const docs = this.persistence.readJson<Document[]>('documents-meta.json') ?? [];
    if (documentId && !docs.some(d => d.id === documentId)) throw new Error('文档不存在');
    const index = this.persistence.readJson<Record<string, string[]>>('index-meta.json') ?? {};
    for (const doc of docs) {
      if (documentId && doc.id !== documentId) continue;
      const content = this.persistence.readText(`content/${doc.id}.txt`);
      if (content === null) throw new Error('找不到文档正文');
      const chunks: Chunk[] = [];
      for (let offset = 0; offset < content.length; offset += 500) {
        const text = content.slice(offset, offset + 500);
        if (text.trim()) chunks.push({ id: randomUUID(), documentId: doc.id, index: chunks.length, content: text, metadata: { charCount: String(text.length) } });
      }
      this.persistence.writeJson(`chunks/${doc.id}.json`, chunks);
      index[doc.id] = chunks.map(c => c.id);
      doc.status = 'indexed'; doc.chunks = chunks.length;
    }
    this.persistence.writeJson('index-meta.json', index);
    this.persistence.writeJson('documents-meta.json', docs);
    this.persistence.writeJson('last-indexed.json', new Date().toISOString());
    return this.getStatus();
  }
  getStatus(): AppStatus {
    const docs = this.persistence.readJson<Document[]>('documents-meta.json') ?? [];
    return { documentsLoaded: docs.length, indexStatus: docs.length && docs.every(d => d.status === 'indexed') ? 'ready' : 'idle', lastActivity: this.persistence.readJson<string>('last-indexed.json') ?? '' };
  }
  getChunksForDocument(id: string): Chunk[] {
    const docs = this.persistence.readJson<Document[]>('documents-meta.json') ?? [];
    return docs.some(d => d.id === id) ? this.persistence.readJson<Chunk[]>(`chunks/${id}.json`) ?? [] : [];
  }
  getAllChunks(): Chunk[] {
    return (this.persistence.readJson<Document[]>('documents-meta.json') ?? []).flatMap(d => this.getChunksForDocument(d.id));
  }
}
