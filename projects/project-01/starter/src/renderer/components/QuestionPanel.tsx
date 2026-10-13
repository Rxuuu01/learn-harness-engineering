import React, { useState } from 'react';

interface Props {
  onAsk: (question: string) => Promise<void>;
}

export function QuestionPanel({ onAsk }: Props) {
  const [question, setQuestion] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || busy) return;
    setBusy(true);
    try { await onAsk(question.trim()); setQuestion(''); }
    catch { /* Parent displays the error; preserve the question for retry. */ }
    finally { setBusy(false); }
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: 'flex',
        padding: '12px 20px',
        borderTop: '1px solid #0f3460',
        background: '#16213e',
      }}
    >
      <input
        type="text"
        value={question}
        onChange={e => setQuestion(e.target.value)}
        aria-label="向知识库提问"
        placeholder="输入问题或文档关键词…"
        style={{
          flex: 1,
          padding: '10px 14px',
          background: '#1a1a2e',
          color: '#e0e0e0',
          border: '1px solid #0f3460',
          borderRadius: '6px',
          fontSize: '14px',
          outline: 'none',
        }}
      />
      <button
        type="submit"
        disabled={busy || !question.trim()}
        style={{
          marginLeft: '10px',
          padding: '10px 20px',
          background: '#533483',
          color: '#fff',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: 500,
        }}
      >
        {busy ? '检索中…' : '提问'}
      </button>
    </form>
  );
}
