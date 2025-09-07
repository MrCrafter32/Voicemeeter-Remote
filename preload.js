const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    minimize: () => ipcRenderer.send('minimize-app'),
    close: () => ipcRenderer.send('close-app'),
    login: () => ipcRenderer.invoke('voicemeeter-login'),
    setParam: (param, value) => ipcRenderer.invoke('voicemeeter-setParam', param, value),
    getParamFloat: (param) => ipcRenderer.invoke('voicemeeter-getParamFloat', param),
    getParamString: (param) => ipcRenderer.invoke('voicemeeter-getParamString', param),
    restart: () => ipcRenderer.invoke('voicemeeter-restart'),
    
    onStateChange: (callback) => ipcRenderer.on('state-changed', (event, ...args) => callback(...args)),
    onRestarting: (callback) => ipcRenderer.on('device-changed', (event, ...args) => callback(...args)),
});

