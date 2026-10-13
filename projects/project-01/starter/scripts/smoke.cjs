const { app, BrowserWindow, dialog } = require('electron');
const fs = require('fs');
const path = require('path');
const assert = require('assert/strict');
const root = path.resolve(__dirname, '..');
const testDir = process.env.KB_SMOKE_DIR || path.join(root, 'data', 'smoke-' + Date.now());
app.setPath('userData', testDir);
dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [path.join(root, 'data/sample-documents/design-notes.md')] });
const errors = [];
app.on('web-contents-created', (_, contents) => {
  contents.on('preload-error', (_, file, error) => errors.push(String(error)));
  contents.on('render-process-gone', (_, details) => errors.push(JSON.stringify(details)));
});
require('../dist/main/main.js');
const deadline = setTimeout(() => { console.error('Smoke timeout'); app.exit(1); }, 25000);
app.whenReady().then(async () => {
 try {
  const win = BrowserWindow.getAllWindows()[0];
  if (win.webContents.isLoading()) await new Promise(resolve => win.webContents.once('did-finish-load', resolve));
  const run = code => win.webContents.executeJavaScript(code);
  for (let i=0;i<50;i++) { if(await run("!!document.querySelector('form')")) break; await new Promise(r=>setTimeout(r,100)); }
  assert.equal(win.isVisible(), true);
  assert.equal(await run('typeof window.knowledgeBase.documents.list'), 'function');
  assert.equal(await run('typeof require'), 'undefined');
  assert.equal(win.webContents.getLastWebPreferences().contextIsolation, true);
  const layout=await run(`(() => {const form=document.querySelector('form').getBoundingClientRect();const button=[...document.querySelectorAll('button')].find(b=>b.textContent.includes('导入')).getBoundingClientRect();return {left:button.x,right:form.x,width:form.width};})()`);
  assert(layout.right > layout.left && layout.width > 300);
  if (!process.env.KB_SMOKE_DIR) {
   await run("[...document.querySelectorAll('button')].find(b=>b.textContent.includes('导入')).click()");
   for(let i=0;i<50;i++){if((await run('window.knowledgeBase.documents.list()')).length)break;await new Promise(r=>setTimeout(r,100));}
   assert.equal((await run('window.knowledgeBase.documents.list()')).length,1);
   await run(`(() => { const input=document.querySelector('form input');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'architecture');input.dispatchEvent(new Event('input',{bubbles:true})); })()`);
   await new Promise(r=>setTimeout(r,100));
   await run("document.querySelector('form').requestSubmit()");
   for(let i=0;i<50;i++){if((await run('window.knowledgeBase.qa.history()')).length)break;await new Promise(r=>setTimeout(r,100));}
  }
  const docs=await run('window.knowledgeBase.documents.list()');
  const history=await run('window.knowledgeBase.qa.history()');
  assert.equal(docs.length,1); assert.equal(docs[0].status,'indexed');
  assert.equal(history.length,1);assert(history[0].response.citations.length>0);
  const directory=await run('window.knowledgeBase.dataDirectory()');
  assert(fs.existsSync(path.join(directory,'documents-meta.json')));
  assert(fs.existsSync(path.join(directory,'qa-history.json')));
  await new Promise(r=>setTimeout(r,200));
  assert((await run('document.body.innerText')).includes(docs[0].title));
  assert.deepEqual(errors,[]);
  fs.writeFileSync(path.join(testDir,'window.png'),(await win.webContents.capturePage()).toPNG());
  console.log(JSON.stringify({passed:true,restart:!!process.env.KB_SMOKE_DIR,testDir,directory,layout,documents:docs.length,history:history.length}));
  clearTimeout(deadline);app.exit(0);
 }catch(error){console.error(error);clearTimeout(deadline);app.exit(1);}
});
