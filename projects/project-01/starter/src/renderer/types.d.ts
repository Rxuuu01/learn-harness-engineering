import type { Document, AppStatus, Chunk, QAResponse, QAHistory } from '../shared/types';
declare global {
 interface Window {
  knowledgeBase: {
   dataDirectory: () => Promise<string>;
   openDataDirectory: () => Promise<string>;
   documents: { pick: () => Promise<Document[]>; list: () => Promise<Document[]>; import: (path: string) => Promise<Document>; get: (id: string) => Promise<Document | null>; delete: (id: string) => Promise<boolean> };
   indexing: { start: (id?: string) => Promise<AppStatus>; status: () => Promise<AppStatus>; chunks: (id: string) => Promise<Chunk[]> };
   qa: { ask: (question: string) => Promise<QAResponse>; history: () => Promise<QAHistory[]> };
  };
 }
}
