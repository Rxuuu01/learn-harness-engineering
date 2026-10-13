import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import * as path from 'path';
import { registerIpcHandlers } from './ipc-handlers';
import { DocumentService } from '../services/document-service';
import { QaService } from '../services/qa-service';
import { IndexingService } from '../services/indexing-service';
import { PersistenceService } from '../services/persistence-service';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    title: 'Knowledge Base',
    backgroundColor: '#f6f7fb',
    autoHideMenuBar: true,
  });

  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.webContents.on('will-navigate', event => event.preventDefault());
  mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function initializeServices() {
  const dataDir = path.join(app.getPath('userData'), 'knowledge-base-data');
  const persistence = new PersistenceService(dataDir);
  const documentService = new DocumentService(persistence);
  const indexingService = new IndexingService(persistence);
  const qaService = new QaService(persistence);

  ipcMain.handle('app:data-directory', () => dataDir);
  ipcMain.handle('app:open-data-directory', () => shell.openPath(dataDir));
  ipcMain.handle('documents:pick', async () => {
    const result = await dialog.showOpenDialog({
      title: '导入知识库文档', properties: ['openFile', 'multiSelections'],
      filters: [{ name: '文本与 Markdown', extensions: ['txt', 'md'] }],
    });
    if (result.canceled) return [];
    const imported = [];
    for (const file of result.filePaths) {
      const doc = documentService.importDocument(file);
      await indexingService.startIndexing(doc.id);
      imported.push(doc);
    }
    return imported;
  });

  registerIpcHandlers(ipcMain, {
    documentService,
    indexingService,
    qaService,
  });
}

const primaryInstance = app.requestSingleInstanceLock();
if (!primaryInstance) app.quit();
app.on('second-instance', () => {
  if (mainWindow?.isMinimized()) mainWindow.restore();
  mainWindow?.focus();
});

if (primaryInstance) app.whenReady().then(() => {
  initializeServices();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
}).catch(error => {
  dialog.showErrorBox('知识库启动失败', String(error));
  app.quit();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
