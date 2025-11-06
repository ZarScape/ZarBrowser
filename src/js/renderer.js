const { ipcRenderer } = require('electron');

document.addEventListener('DOMContentLoaded', () => {
    ipcRenderer.send('renderer-ready');

    const tabBar = document.getElementById('tab-bar');
    const newTabBtn = document.getElementById('new-tab-btn');
    const backBtn = document.getElementById('back-btn');
    const forwardBtn = document.getElementById('forward-btn');
    const reloadBtn = document.getElementById('reload-btn');
    const urlInput = document.getElementById('url-input');
    const minimizeBtn = document.getElementById('minimize-btn');
    const maximizeRestoreBtn = document.getElementById('maximize-restore-btn');
    const closeBtn = document.getElementById('close-btn');

    // Tab Management
    ipcRenderer.on('tabs-updated', (event, tabs, activeTabId) => {
        tabBar.innerHTML = '';
        tabs.forEach(tab => {
            const tabElement = document.createElement('div');
            tabElement.className = 'tab';
            if (tab.id === activeTabId) {
                tabElement.classList.add('active');
            }
            tabElement.dataset.tabId = tab.id;

            const favicon = tab.favicon ? `<img src="${tab.favicon}" class="tab-icon" />` : '<img src="../assets/images/logo.ico" class="tab-icon" />';
            tabElement.innerHTML = `
                ${favicon}
                <span class="tab-title">${tab.title}</span>
                <button class="tab-close-btn"><img src="../assets/icons/close.svg" alt="Close Tab"></button>
            `;

            tabElement.addEventListener('click', (e) => {
                // Check if the click is not on the close button or its children
                if (!e.target.closest('.tab-close-btn')) {
                    ipcRenderer.send('switch-tab', tab.id);
                }
            });

            tabElement.querySelector('.tab-close-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                ipcRenderer.send('close-tab', tab.id);
            });

            tabBar.appendChild(tabElement);
        });
        tabBar.appendChild(newTabBtn);
    });

    newTabBtn.addEventListener('click', () => ipcRenderer.send('create-tab'));

    // Navigation Controls
    backBtn.addEventListener('click', () => ipcRenderer.send('back'));
    forwardBtn.addEventListener('click', () => ipcRenderer.send('forward'));
    reloadBtn.addEventListener('click', () => ipcRenderer.send('reload'));

    urlInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && urlInput.value) {
            ipcRenderer.send('navigate', urlInput.value);
        }
    });

    ipcRenderer.on('update-address-bar', (event, url) => {
        if (!url.startsWith('file://')) {
            urlInput.value = url;
        } else {
            urlInput.value = '';
        }
    });

    ipcRenderer.on('navigation-state-changed', (event, { canGoBack, canGoForward }) => {
        backBtn.disabled = !canGoBack;
        forwardBtn.disabled = !canGoForward;
    });

    // Window Controls
    minimizeBtn.addEventListener('click', () => ipcRenderer.send('minimize-window'));
    maximizeRestoreBtn.addEventListener('click', () => ipcRenderer.send('maximize-restore-window'));
    closeBtn.addEventListener('click', () => ipcRenderer.send('close-window'));

    ipcRenderer.on('is-maximized', (event, isMaximized) => {
        const img = maximizeRestoreBtn.querySelector('img');
        if (isMaximized) {
            img.src = '../assets/icons/restore.svg';
            img.alt = 'Restore';
        } else {
            img.src = '../assets/icons/maximize.svg';
            img.alt = 'Maximize';
        }
    });

    ipcRenderer.on('show-home-view', () => {
        urlInput.value = '';
    });
});
