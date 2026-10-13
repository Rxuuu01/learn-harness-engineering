import { contextBridge, ipcRenderer } from 'electron';
// Sandboxed preload must not require local CommonJS modules.
const IPC_CHANNELS = {
  LIST_DOCUMENTS: 'documents:list', IMPORT_DOCUMENT: 'documents:import',
  GET_DOCUMENT: 'documents:get', DELETE_DOCUMENT: 'documents:delete',
  START_INDEXING: 'indexing:start', GET_INDEXING_STATUS: 'indexing:status',
  GET_CHUNKS: 'indexing:chunks', ASK_QUESTION: 'qa:ask', GET_HISTORY: 'qa:history',
};

const api = {
  dataDirectory: () => ipcRenderer.invoke('app:data-directory'),
  chooseDocument: () => ipcRenderer.invoke('documents:choose'),
  documents: {
    list: () => ipcRenderer.invoke(IPC_CHANNELS.LIST_DOCUMENTS),
    import: (filePath: string) => ipcRenderer.invoke(IPC_CHANNELS.IMPORT_DOCUMENT, filePath),
    get: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.GET_DOCUMENT, id),
    delete: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.DELETE_DOCUMENT, id),
  },
  indexing: {
    start: (documentId?: string) => ipcRenderer.invoke(IPC_CHANNELS.START_INDEXING, documentId),
    status: () => ipcRenderer.invoke(IPC_CHANNELS.GET_INDEXING_STATUS),
    chunks: (documentId: string) => ipcRenderer.invoke(IPC_CHANNELS.GET_CHUNKS, documentId),
  },
  qa: {
    ask: (question: string) => ipcRenderer.invoke(IPC_CHANNELS.ASK_QUESTION, question),
    history: () => ipcRenderer.invoke(IPC_CHANNELS.GET_HISTORY),
  },
};

contextBridge.exposeInMainWorld('knowledgeBase', api);
