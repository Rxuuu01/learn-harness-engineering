import { QAResponse, QAHistory, Citation } from '../shared/types';
import { PersistenceService } from './persistence-service';
import { IndexingService } from './indexing-service';

const QA_HISTORY_FILE = 'qa-history.json';

export class QaService {
  private persistence: PersistenceService;
  private indexingService: IndexingService;

  constructor(persistence: PersistenceService, indexingService?: IndexingService) {
    this.persistence = persistence;
    this.indexingService = indexingService ?? new IndexingService(persistence);
  }

  /** Ask a question and get a grounded answer with citations. */
  async ask(question: string): Promise<QAResponse> {
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 400));

    const chunks = this.indexingService.getAllChunks();
    const citations: Citation[] = [];

    if (chunks.length > 0) {
      // Find relevant chunks using keyword matching
      const questionWords = question.toLowerCase().match(/[a-z0-9]+|[\u4e00-\u9fff]/g) ?? [];
      const scored = chunks.map(chunk => {
        const contentLower = chunk.content.toLowerCase();
        const score = questionWords.reduce(
          (acc, word) => acc + (contentLower.includes(word) ? 1 : 0),
          0
        );
        return { chunk, score };
      });

      // Take top 2 relevant chunks as citations
      const relevant = scored
        .filter(s => s.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 2);

      // Get document metadata for citations
      const docs = this.persistence.readJson<Array<{ id: string; title: string }>>('documents-meta.json') ?? [];

      for (const { chunk } of relevant) {
        const doc = docs.find(d => d.id === chunk.documentId);
        citations.push({
          documentId: chunk.documentId,
          documentTitle: doc?.title ?? 'Unknown Document',
          chunkIndex: chunk.index,
          excerpt: chunk.content.substring(0, 200),
        });
      }
    }

    // Generate answer from mock patterns or use fallback
    const answer = this.generateAnswer(question, citations);

    const response: QAResponse = {
      answer,
      citations,
      confidence: citations.length > 0 ? 0.85 : 0.3,
      timestamp: new Date().toISOString(),
    };

    // Save to history
    this.saveToHistory(question, response);

    return response;
  }

  /** Get the Q&A history. */
  getHistory(): QAHistory[] {
    return this.persistence.readJson<QAHistory[]>(QA_HISTORY_FILE) ?? [];
  }

  private generateAnswer(_question: string, citations: Citation[]): string {
    return citations.length > 0
      ? '以下是匹配的本地文档摘录（关键词检索，未连接 AI 模型）：'
      : '未找到相关内容。请先导入文档，或使用文档中的关键词提问。';
  }

  private saveToHistory(question: string, response: QAResponse): void {
    const history = this.getHistory();
    history.push({ question, response });
    this.persistence.writeJson(QA_HISTORY_FILE, history);
  }
}
