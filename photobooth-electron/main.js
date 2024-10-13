// main.js
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const dayjs = require('dayjs');
const Gpio = require('onoff').Gpio;
const pin = new Gpio(14, 'in', 'both');

function createWindow() {
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            enableRemoteModule: false,
        },
    });

    win.loadFile('index.html');
}

// Listen for image saving requests
ipcMain.on('save-image', (event, imageData) => {
    const base64Data = imageData.replace(/^data:image\/png;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    const picturesPath = path.join(app.getPath('pictures'), "photobooth-" + dayjs().format('YYYY-MM-DD-HH-mm-ss') + '.png');

    fs.writeFile(picturesPath, buffer, (err) => {
        if (err) {
            console.error('Error saving image:', err);
            event.reply('image-saved', 'Error saving image');
        } else {
            console.log('Image saved to:', picturesPath);
            event.reply('image-saved', 'Image saved successfully');
        }
    });
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

pin.watch((err, value) => {
    if (err) {
      console.error('Error reading pin value:', err);
      return;
    }
  
    if (value === 1) {
      console.log('Button pressed!');
      win.webContents.send('start-countdown');
    }
});
  
  // Cleanup on exit
  process.on('SIGINT', () => {
    pin.unexport();
    console.log('Exiting...');
    process.exit();
  });