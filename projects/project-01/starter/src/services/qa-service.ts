import { QAResponse, QAHistory, Document } from '../shared/types';
import { PersistenceService } from './persistence-service';
import { IndexingService } from './indexing-service';
export class QaService {
  private indexingService: IndexingService;
  constructor(private persistence: PersistenceService, indexingService?: IndexingService) { this.indexingService = indexingService ?? new IndexingService(persistence); }
  async ask(question: string): Promise<QAResponse> {
    if (typeof question !== 'string' || !question.trim() || question.length > 2000) throw new Error('请输入 1–2000 字的问题');
    const tokens = new Set(question.toLowerCase().match(/[a-z0-9]+|[\u4e00-\u9fff]{2}/g) ?? []);
    const docs = this.persistence.readJson<Document[]>('documents-meta.json') ?? [];
    const relevant = this.indexingService.getAllChunks().map(chunk => ({ chunk, score: [...tokens].filter(t => chunk.content.toLowerCase().includes(t)).length })).filter(x => x.score > 0).sort((a,b) => b.score-a.score).slice(0,3);
    const citations = relevant.map(({chunk}) => ({ documentId: chunk.documentId, documentTitle: docs.find(d => d.id === chunk.documentId)?.title ?? '文档', chunkIndex: chunk.index, excerpt: chunk.content }));
    const response: QAResponse = { answer: citations.length ? '在本地文档中找到以下相关内容：\n\n' + citations.map((c,i) => `[${i+1}] ${c.excerpt}`).join('\n\n') : '没有找到相关内容。请先导入文档，或使用文档中的具体关键词提问。', citations, confidence: citations.length ? 0.6 : 0, timestamp: new Date().toISOString() };
    this.persistence.writeJson('qa-history.json', [...this.getHistory(), { question, response }]); return response;
  }
  getHistory(): QAHistory[] { return this.persistence.readJson<QAHistory[]>('qa-history.json') ?? []; }
}
