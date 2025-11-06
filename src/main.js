const { app, BrowserWindow, ipcMain, BrowserView } = require('electron');
const path = require('path');

let mainWindow;
const tabs = {};
let activeTabId = null;

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false,
    icon: path.join(__dirname, 'assets/images/logo.ico'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'views/index.html'));

  // Window Controls
  ipcMain.on('minimize-window', () => mainWindow.minimize());
  ipcMain.on('maximize-restore-window', () => {
    if (mainWindow.isMaximized()) {
      mainWindow.restore();
    } else {
      mainWindow.maximize();
    }
  });
  ipcMain.on('close-window', () => mainWindow.close());

  mainWindow.on('maximize', () => mainWindow.webContents.send('is-maximized', true));
  mainWindow.on('unmaximize', () => mainWindow.webContents.send('is-maximized', false));

  mainWindow.on('resize', updateViewBounds);
}

function sendTabsToRenderer() {
  const tabsInfo = Object.values(tabs).map(t => ({
    id: t.id,
    title: t.title,
    favicon: t.favicon,
  }));
  mainWindow.webContents.send('tabs-updated', tabsInfo, activeTabId);
}

function updateViewBounds() {
  if (!mainWindow || !activeTabId || !tabs[activeTabId]) return;

  const [contentWidth, contentHeight] = mainWindow.getContentSize();
  const headerHeight = 85; // Correct header height
  tabs[activeTabId].view.setBounds({
    x: 0,
    y: headerHeight,
    width: contentWidth,
    height: contentHeight - headerHeight,
  });
}

function createTab(url) {
  const id = `tab-${Date.now()}`;
  const isHomePage = url.endsWith('home.html');
  const webPreferences = {
    nodeIntegration: false,
    contextIsolation: true,
    partition: `persist:${id}`,
  };

  if (isHomePage) {
    webPreferences.preload = path.join(__dirname, 'js/preload-home.js');
  }

  const view = new BrowserView({ webPreferences });

  tabs[id] = { id, view, title: 'New Tab', favicon: null, originalUrl: url };

  if (isHomePage) {
    tabs[id].favicon = `file://${path.join(__dirname, 'assets/images/logo.ico')}`;
  }

  const updateNavState = () => {
    if (id === activeTabId) {
      const canGoBack = view.webContents.navigationHistory.canGoBack();
      const canGoForward = view.webContents.navigationHistory.canGoForward();
      mainWindow.webContents.send('navigation-state-changed', { canGoBack, canGoForward });
    }
  };

  view.webContents.on('page-title-updated', (evt, title) => {
    tabs[id].title = title;
    sendTabsToRenderer();
  });

  view.webContents.on('page-favicon-updated', (evt, favicons) => {
    tabs[id].favicon = favicons[0];
    sendTabsToRenderer();
  });

  view.webContents.on('did-navigate', (evt, navUrl) => {
    if (id === activeTabId) {
      mainWindow.webContents.send('update-address-bar', navUrl);
    }
    updateNavState();
  });

  view.webContents.on('did-finish-load', updateNavState);

  view.webContents.loadURL(url);
  switchTab(id);
}

function switchTab(id) {
  if (activeTabId && tabs[activeTabId]) {
    mainWindow.removeBrowserView(tabs[activeTabId].view);
  }

  activeTabId = id;
  const newTabView = tabs[id].view;
  mainWindow.addBrowserView(newTabView);
  updateViewBounds();

  const currentURL = newTabView.webContents.getURL();
  mainWindow.webContents.send('update-address-bar', currentURL);

  const canGoBack = newTabView.webContents.navigationHistory.canGoBack();
  const canGoForward = newTabView.webContents.navigationHistory.canGoForward();
  mainWindow.webContents.send('navigation-state-changed', { canGoBack, canGoForward });

  sendTabsToRenderer();
}

function closeTab(id) {
  if (Object.keys(tabs).length === 1) {
    mainWindow.close();
    return;
  }

  const tabToClose = tabs[id];
  if (!tabToClose) return;

  mainWindow.removeBrowserView(tabToClose.view);
  tabToClose.view.webContents.destroy();
  delete tabs[id];

  if (activeTabId === id) {
    const remainingTabIds = Object.keys(tabs);
    if (remainingTabIds.length > 0) {
      switchTab(remainingTabIds[0]);
    }
  }

  sendTabsToRenderer();
}

// App Lifecycle
app.whenReady().then(() => {
  createMainWindow();
  ipcMain.on('renderer-ready', () => {
    createTab(`file://${path.join(__dirname, 'views/home.html')}`);
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
});

// IPC Navigation
ipcMain.on('navigate', (event, url) => {
  let fullUrl = url;

  if (!/^[a-zA-Z]+:\/\/.*/.test(url)) {
    const searchTerm = encodeURIComponent(url);
    fullUrl = `https://www.google.com/search?client=zar-browser&q=${searchTerm}&sourceid=zar-browser&ie=UTF-8&oe=UTF-8`;
  }

  const activeTab = tabs[activeTabId];
  if (activeTab) {
    activeTab.view.webContents.loadURL(fullUrl);
  }
});

ipcMain.on('back', () => {
  const activeTab = tabs[activeTabId];
  if (activeTab && activeTab.view.webContents.navigationHistory.canGoBack()) {
    activeTab.view.webContents.navigationHistory.goBack();
  }
});

ipcMain.on('forward', () => {
  const activeTab = tabs[activeTabId];
  if (activeTab && activeTab.view.webContents.navigationHistory.canGoForward()) {
    activeTab.view.webContents.navigationHistory.goForward();
  }
});

ipcMain.on('reload', () => {
  const activeTab = tabs[activeTabId];
  if (activeTab) {
    activeTab.view.webContents.reload();
  }
});

ipcMain.on('create-tab', () => createTab(`file://${path.join(__dirname, 'views/home.html')}`));
ipcMain.on('switch-tab', (event, id) => switchTab(id));
ipcMain.on('close-tab', (event, id) => closeTab(id));
