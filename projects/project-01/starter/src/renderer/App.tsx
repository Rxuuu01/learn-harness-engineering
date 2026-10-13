import { useState, useCallback, useEffect } from 'react';
import { DocumentList } from './components/DocumentList';
import { QuestionPanel } from './components/QuestionPanel';
import { DocumentDetail } from './components/DocumentDetail';
import { StatusBar } from './components/StatusBar';
import { Document, AppStatus, QAResponse } from '../shared/types';

declare global {
  interface Window {
    knowledgeBase: {
      dataDirectory: () => Promise<string>;
      chooseDocument: () => Promise<Document | null>;
      documents: {
        list: () => Promise<Document[]>;
        import: (filePath: string) => Promise<Document>;
        get: (id: string) => Promise<Document | null>;
        delete: (id: string) => Promise<boolean>;
      };
      indexing: {
        start: (documentId?: string) => Promise<{ status: string }>;
        status: () => Promise<AppStatus>;
        chunks: (documentId: string) => Promise<import('../shared/types').Chunk[]>;
      };
      qa: {
        ask: (question: string) => Promise<QAResponse>;
        history: () => Promise<Array<{ question: string; response: QAResponse }>>;
      };
    };
  }
}

export function App() {
  const [dataDirectory, setDataDirectory] = useState('');
  const [error, setError] = useState('');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [appStatus, setAppStatus] = useState<AppStatus>({
    documentsLoaded: 0,
    indexStatus: 'idle',
    lastActivity: '',
  });
  const [lastResponse, setLastResponse] = useState<QAResponse | null>(null);

  const refreshDocuments = useCallback(async () => {
    try {
      const docs = await window.knowledgeBase.documents.list();
      setDocuments(docs);
      const status = await window.knowledgeBase.indexing.status();
      setAppStatus(status);
    } catch (err) {
      setError(String(err));
    }
  }, []);

  const handleImport = useCallback(async () => {
    setError('');
    try { await window.knowledgeBase.chooseDocument(); await refreshDocuments(); }
    catch (err) { setError(String(err)); }
  }, [refreshDocuments]);

  useEffect(() => {
    void refreshDocuments();
    window.knowledgeBase.dataDirectory().then(setDataDirectory).catch(err => setError(String(err)));
    window.knowledgeBase.qa.history().then(h => { if (h.length) setLastResponse(h[h.length - 1].response); }).catch(err => setError(String(err)));
  }, [refreshDocuments]);

  const handleSelectDocument = useCallback((doc: Document) => {
    setSelectedDoc(doc);
  }, []);

  const handleAskQuestion = useCallback(async (question: string) => {
    try {
      const response = await window.knowledgeBase.qa.ask(question);
      setLastResponse(response);
    } catch (err) {
      setError(String(err));
      throw err;
    }
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <header style={{
        padding: '12px 20px',
        background: '#16213e',
        borderBottom: '1px solid #0f3460',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <h1 style={{ fontSize: '18px', fontWeight: 600 }}>知页 · 本地知识库</h1>
        <button
          onClick={refreshDocuments}
          style={{
            padding: '6px 14px',
            background: '#0f3460',
            color: '#e0e0e0',
            border: '1px solid #1a1a4e',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '13px',
          }}
        >
          刷新
        </button>
      </header>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left panel: Document list */}
        <div style={{
          width: '280px',
          borderRight: '1px solid #0f3460',
          display: 'flex',
          flexDirection: 'column',
          background: '#16213e',
        }}>
          <div style={{
            padding: '10px 16px',
            borderBottom: '1px solid #0f3460',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <span style={{ fontSize: '13px', fontWeight: 500, color: '#a0a0c0' }}>
              我的文档 ({documents.length})
            </span>
            <button
              onClick={handleImport}
              style={{
                padding: '4px 10px',
                background: '#533483',
                color: '#fff',
                border: 'none',
                borderRadius: '3px',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              ＋ 导入文档
            </button>
          </div>
          <DocumentList
            documents={documents}
            onSelect={handleSelectDocument}
            selectedId={selectedDoc?.id ?? null}
          />
        </div>

        {/* Right panel: Document detail + Q&A */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
            {selectedDoc ? (
              <DocumentDetail document={selectedDoc} />
            ) : (
              <div style={{ color: '#666', textAlign: 'center', paddingTop: '40px' }}>
                选择左侧文档，或在下方提问。支持导入 TXT、Markdown 文件。
              </div>
            )}
            {lastResponse && (
              <div style={{
                marginTop: '16px',
                padding: '16px',
                background: '#1a1a3e',
                borderRadius: '6px',
                border: '1px solid #0f3460',
              }}>
                <div style={{ fontSize: '14px', lineHeight: 1.6 }}>{lastResponse.answer}</div>
                {lastResponse.citations.length > 0 && (
                  <div style={{ marginTop: '10px', fontSize: '12px', color: '#8888bb' }}>
                    <strong>原文出处：</strong>
                    {lastResponse.citations.map((c, i) => (
                      <div key={i} style={{ marginTop: '4px', paddingLeft: '8px', borderLeft: '2px solid #533483' }}>
                        {c.documentTitle} (chunk {c.chunkIndex}): {c.excerpt.substring(0, 100)}...
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <QuestionPanel onAsk={handleAskQuestion} />
        </div>
      </div>

      {error && <div role="alert" style={{padding: 12, color: '#ffb5b5'}}>{error}</div>}
      <div style={{padding: '8px 20px', fontSize: 12, overflowWrap: 'anywhere'}}>本地数据目录：{dataDirectory || '正在初始化…'}</div>
      <StatusBar status={appStatus} />
    </div>
  );
}
