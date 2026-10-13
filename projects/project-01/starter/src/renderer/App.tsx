import { useState, useEffect, useRef } from 'react';
import type { Document, QAHistory } from '../shared/types';
import './styles.css';
export function App() {
 const [docs,setDocs]=useState<Document[]>([]);
 const [history,setHistory]=useState<QAHistory[]>([]);
 const [search,setSearch]=useState('');
 const [question,setQuestion]=useState('');
 const [directory,setDirectory]=useState('');
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [preview,setPreview]=useState<{doc:Document;text:string}|null>(null);
 const end=useRef<HTMLDivElement>(null);
 const refresh=async()=>setDocs(await window.knowledgeBase.documents.list());
 useEffect(()=>{Promise.all([refresh(),window.knowledgeBase.qa.history().then(setHistory),window.knowledgeBase.dataDirectory().then(setDirectory)]).catch(e=>setError(String(e)));},[]);
 useEffect(()=>{end.current?.scrollIntoView({behavior:'smooth'});},[history,busy]);
 async function run(action:()=>Promise<void>){setError('');setBusy(true);try{await action();}catch(e){setError(String(e));}finally{setBusy(false);}}
 const importDocs=()=>run(async()=>{try{await window.knowledgeBase.documents.pick();}finally{await refresh();}});
 const ask=()=>{if(!question.trim()||busy)return;const text=question.trim();void run(async()=>{const response=await window.knowledgeBase.qa.ask(text);setHistory(items=>[...items,{question:text,response}]);setQuestion('');});};
 const showDoc=(doc:Document)=>run(async()=>{const chunks=await window.knowledgeBase.indexing.chunks(doc.id);setPreview({doc,text:chunks.map(c=>c.content).join('')||'文档为空或尚未索引。'});});
 return <div className="app">
 <header className="topbar"><div className="brand"><span className="logo">知</span><strong>知屿 <span>知识库</span></strong></div><span className="local"><i/> 本地工作空间</span></header>
 <main><aside><div className="eyebrow">MY LIBRARY</div><h2>我的文档 <small>{docs.length}</small></h2><button className="primary import" disabled={busy} onClick={importDocs}>＋ 导入文档</button><p className="hint">支持 Markdown、TXT · 最大 10 MB</p>
 <label className="search">⌕ <input aria-label="搜索文档" placeholder="搜索文档…" value={search} onChange={e=>setSearch(e.target.value)}/></label><div className="list-label">全部文档</div>
 <div className="documents">{docs.filter(d=>d.title.toLowerCase().includes(search.toLowerCase())).map(doc=><button className="document" key={doc.id} disabled={busy} onClick={()=>showDoc(doc)}><span className="file-icon">{doc.filename.toLowerCase().endsWith('.md')?'MD':'TXT'}</span><span className="document-info"><strong>{doc.title}</strong><span>{(doc.size/1024).toFixed(1)} KB · {new Date(doc.importedAt).toLocaleDateString('zh-CN')}</span></span><span className="indexed" title={doc.status==='indexed'?'已索引':'待索引'}>{doc.status==='indexed'?'●':'○'}</span></button>)}
 {!docs.length&&<div className="empty-library"><span>▧</span><p>让知识有一个归处</p><small>导入第一份文档，开始积累。</small></div>}
 {!!docs.length&&!docs.some(d=>d.title.toLowerCase().includes(search.toLowerCase()))&&<p className="hint">没有匹配的文档</p>}</div>
 <div className="storage"><span>▱ 本地数据目录</span><button onClick={()=>run(async()=>{const message=await window.knowledgeBase.openDataDirectory();if(message)throw new Error(message);})}>打开 ↗</button><p title={directory}>{directory||'正在读取…'}</p><small><i/> 文档与问答记录保存在本机</small></div></aside>
 <section className="chat"><div className="chat-heading"><div><h2>知识问答</h2><p>从你的文档中，找到问题的线索。</p></div><span className="mode">✧ 本地检索</span></div>
 <div className="conversation" aria-live="polite">{!history.length&&<div className="welcome"><div className="spark">✧</div><span className="eyebrow">A SPACE FOR YOUR KNOWLEDGE</span><h1>让知识，彼此连接。</h1><p>导入文档，提出问题。<br/>每一条检索结果，都有来源可循。</p><div className="suggestions">{['项目的设计思路是什么？','会议中有哪些关键决定？','文档如何导入和检索？'].map(q=><button key={q} onClick={()=>setQuestion(q)}>{q}<span>↗</span></button>)}</div><small>本地关键词检索 · 无需 API 密钥</small></div>}
 {history.map((item,i)=><article className="exchange" key={i}><div className="user-question"><span>你</span><p>{item.question}</p></div><div className="answer"><span className="answer-icon">✧</span><div><strong>知屿助手 <small>文档检索</small></strong><p>{item.response.answer}</p><div className="sources">{item.response.citations.map((c,j)=><button key={j} disabled={busy} onClick={()=>{const doc=docs.find(d=>d.id===c.documentId);if(doc)void showDoc(doc);else setError('来源文档已删除，历史摘录仍保留。');}}>[{j+1}] {c.documentTitle} ↗</button>)}</div></div></div></article>)}
 {busy&&<p className="working">正在处理，请稍候…</p>}<div ref={end}/></div>
 <div className="composer-area">{error&&<div className="error" role="alert">{error}<button onClick={()=>setError('')}>关闭</button></div>}<form className="composer" onSubmit={e=>{e.preventDefault();ask();}}><textarea aria-label="输入问题" placeholder="向你的知识库提问…" value={question} maxLength={2000} onChange={e=>setQuestion(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();ask();}}}/><div><span>▤ {docs.length} 份文档 · {question.length}/2000</span><button className="primary send" disabled={busy||!question.trim()} type="submit" aria-label="发送问题">↑</button></div></form><p className="composer-note">回答为文档相关片段，不代表 AI 推理结果。<span>Enter 发送 · Shift + Enter 换行</span></p></div></section></main>
 {preview&&<div className="overlay" onClick={()=>setPreview(null)}><section className="preview" role="dialog" aria-modal="true" aria-label="文档预览" onClick={e=>e.stopPropagation()} onKeyDown={e=>{if(e.key==='Escape')setPreview(null);}}><div className="preview-heading"><h2>{preview.doc.title}</h2><button autoFocus onClick={()=>setPreview(null)}>关闭 ✕</button></div><pre>{preview.text}</pre>{error&&<p role="alert">{error}</p>}<footer><button disabled={busy} onClick={()=>run(async()=>{await window.knowledgeBase.indexing.start(preview.doc.id);await refresh();setPreview(null);})}>重新索引</button><button className="danger" disabled={busy} onClick={()=>{if(window.confirm('确定从知识库删除这份文档？原始文件不会删除。'))void run(async()=>{await window.knowledgeBase.documents.delete(preview.doc.id);await refresh();setPreview(null);});}}>删除文档</button></footer></section></div>}
 </div>;
}
