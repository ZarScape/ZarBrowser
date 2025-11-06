const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  send: (channel, data) => {
    // whitelist channels
    let validChannels = ['renderer-ready', 'minimize-window', 'maximize-restore-window', 'close-window', 'navigate', 'back', 'forward', 'reload', 'create-tab', 'switch-tab', 'close-tab'];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },
  receive: (channel, func) => {
    let validChannels = ['tabs-updated', 'is-maximized', 'update-address-bar', 'navigation-state-changed', 'show-home-view'];
    if (validChannels.includes(channel)) {
      // Deliberately strip event as it includes `sender`
      ipcRenderer.on(channel, (event, ...args) => func(...args));
    }
  }
});