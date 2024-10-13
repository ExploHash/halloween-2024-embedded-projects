// All of the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.
window.addEventListener('DOMContentLoaded', () => {
  const replaceText = (selector, text) => {
    const element = document.getElementById(selector)
    if (element) element.innerText = text
  } 
  
  for (const type of ['chrome', 'node', 'electron']) {
    replaceText(`${type}-version`, process.versions[type])
  }
})

// preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    saveImage: (imageData) => ipcRenderer.send('save-image', imageData),
    onImageSaved: (callback) => ipcRenderer.on('image-saved', callback),
    onCountdownStart: (callback) => ipcRenderer.on('start-countdown', callback) // Added this line
});
