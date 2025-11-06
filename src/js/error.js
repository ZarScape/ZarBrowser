const { ipcRenderer } = require('electron');

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const url = urlParams.get('url');
    const errorCode = urlParams.get('errorCode');
    const errorMessage = document.getElementById('error-message');
    errorMessage.textContent = `The page at ${decodeURIComponent(url)} could not be loaded (Error code: ${errorCode}).`;

    const reloadButton = document.getElementById('reload');
    reloadButton.addEventListener('click', () => {
        ipcRenderer.send('navigate', decodeURIComponent(url));
    });

    const backButton = document.getElementById('back');
    backButton.addEventListener('click', () => {
        ipcRenderer.send('back');
    });
});
