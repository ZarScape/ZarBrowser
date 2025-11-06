const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  send: (channel, data) => {
    const validChannels = ['navigate'];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  }
});

window.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('home-search-input');
  const searchButton = document.getElementById('search-button');

  function performSearch() {
      if (searchInput.value) {
          ipcRenderer.send('navigate', searchInput.value);
      }
  }

  searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
          performSearch();
      }
  });

  searchButton.addEventListener('click', () => {
      performSearch();
  });
});
