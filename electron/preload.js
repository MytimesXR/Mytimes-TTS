const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('mytApp', {
  platform: process.platform,
  app: {
    getInfo: () => ipcRenderer.invoke('app:info'),
    onNavigate: (callback) => {
      if (typeof callback !== 'function') return () => {};
      const listener = (_event, page) => callback(page);
      ipcRenderer.on('app:navigate', listener);
      return () => ipcRenderer.removeListener('app:navigate', listener);
    },
  },
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    save: (settings) => ipcRenderer.invoke('settings:save', settings),
    test: () => ipcRenderer.invoke('settings:test'),
  },
  storage: {
    getLocation: () => ipcRenderer.invoke('storage:get-location'),
    useCompanyLocation: () => ipcRenderer.invoke('storage:use-company-location'),
    chooseLocation: () => ipcRenderer.invoke('storage:choose-location'),
    resetLocation: () => ipcRenderer.invoke('storage:reset-location'),
    revealLocation: () => ipcRenderer.invoke('storage:reveal-location'),
  },
  onboarding: {
    getStatus: () => ipcRenderer.invoke('onboarding:get-status'),
    complete: () => ipcRenderer.invoke('onboarding:complete'),
  },
  tts: {
    generate: (payload) => ipcRenderer.invoke('tts:generate', payload),
    cancel: (requestId) => ipcRenderer.invoke('tts:cancel', requestId),
    optimizeStyle: (style) => ipcRenderer.invoke('style:optimize', style),
  },
  audio: {
    save: (payload) => ipcRenderer.invoke('audio:save', payload),
    reveal: (filePath) => ipcRenderer.invoke('audio:reveal', filePath),
  },
  history: {
    list: () => ipcRenderer.invoke('history:list'),
    getAudio: (id) => ipcRenderer.invoke('history:audio', id),
    delete: (id) => ipcRenderer.invoke('history:delete', id),
    clear: () => ipcRenderer.invoke('history:clear'),
  },
  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    toggleMaximize: () => ipcRenderer.send('window:toggle-maximize'),
    close: () => ipcRenderer.send('window:close'),
  },
});
