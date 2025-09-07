const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const log = require('electron-log');

console.log = log.log;
log.transports.file.resolvePath = () => path.join(app.getPath('userData'), 'logs/main.log');
log.catchErrors(); 


let mainWindow;
let addon;
let isConnected = false;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 900,
        minWidth: 1200,
        minHeight: 830,
        frame: false,
        transparent: true, 
        titleBarStyle: 'hidden',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        },
        show: false, 
    });

    mainWindow.loadFile('index.html');

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        if (process.env.NODE_ENV === 'development') {
            mainWindow.webContents.openDevTools();
        }
    });
}


app.whenReady().then(() => {
    console.log('App starting...');
    try {
        const addonPath = app.isPackaged ?
            path.join(process.resourcesPath, 'voicemeeter_addon.node') :
            path.join(__dirname, 'build/Release/voicemeeter_addon.node');
        
        console.log(`Attempting to load addon from: ${addonPath}`);
        addon = require(addonPath);
        console.log('Native VoiceMeeter addon loaded successfully.');
    } catch (e) {
        console.error('Failed to load native addon:', e);
        const { dialog } = require('electron');
        dialog.showErrorBox('Fatal Error', 'Could not load the core VoiceMeeter component. The application will now close. Please check the logs.');
        app.quit();
        return;
    }
    createWindow();
});

app.on('window-all-closed', () => {
    if (isConnected && addon && addon.logout) {
        addon.logout();
        console.log('Logged out from VoiceMeeter API.');
    }
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});


ipcMain.on('minimize-app', () => {
    mainWindow.minimize();
});

ipcMain.on('close-app', () => {
    mainWindow.close();
});

ipcMain.handle('voicemeeter-login', (event) => {
    try {
        const result = addon.login();
        console.log(`Raw result from addon.login(): ${result}`);
        
        if (result >= 0) { 
            isConnected = true;
            console.log(`Login successful with code: ${result}.`);
            
            addon.startMonitoring((eventType) => {
                if (mainWindow && !mainWindow.isDestroyed()) {
                    let signalChannel = '';
                    if (eventType === 'paramChange') {
                        signalChannel = 'state-changed';
                    } else if (eventType === 'deviceChange') {
                        signalChannel = 'device-changed';
                        if (addon && addon.setParam) {
                           addon.setParam('command.restart', 1);
                        }
                    }
                    if (signalChannel) {
                        mainWindow.webContents.send(signalChannel);
                    }
                }
            });

            return { success: true };
        } else {
             console.log(`Login failed with code: ${result}.`);
            return { success: false, error: `Login failed with code: ${result}` };
        }
    } catch (e) {
        console.error('Error during login IPC:', e);
        return { success: false, error: e.message };
    }
});

ipcMain.handle('voicemeeter-getParamFloat', (event, param) => addon.getParamFloat(param));
ipcMain.handle('voicemeeter-getParamString', (event, param) => addon.getParamString(param));
ipcMain.handle('voicemeeter-setParam', (event, param, value) => addon.setParam(param, value));
ipcMain.handle('voicemeeter-restart', () => addon.setParam('command.restart', 1));

