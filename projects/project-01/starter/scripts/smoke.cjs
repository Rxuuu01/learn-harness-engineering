// Exercise the real Electron preload, renderer and local data directory.
const { app } = require('electron');
const fs = require('fs');
const path = require('path');
app.setName('knowledge-base');
app.setPath('userData', path.join(app.getPath('appData'), 'knowledge-base'));
const timeout = setTimeout(() => { console.error('Electron smoke test timed out'); app.exit(1); }, 20000);
app.on('browser-window-created', (_event, window) => {
  window.webContents.once('did-finish-load', async () => {
    try {
      const result = await window.webContents.executeJavaScript(`(async () => {
        const directory = await window.knowledgeBase.dataDirectory();
        const documents = await window.knowledgeBase.documents.list();
        return { directory, count: documents.length, title: document.title, text: document.body.innerText };
      })()`);
      if (!fs.existsSync(result.directory)) throw new Error('Data directory was not created');
      if (!result.text.includes('知识问答') || !result.text.includes('我的文档')) throw new Error('Renderer did not mount');
      fs.writeFileSync(path.join(__dirname, '../dist/smoke.png'), (await window.webContents.capturePage()).toPNG());
      console.log(JSON.stringify({ directory: result.directory, count: result.count, title: result.title }));
      clearTimeout(timeout);
      app.exit(0);
    } catch (error) { console.error(error); app.exit(1); }
  });
});
require('../dist/main/main.js');
