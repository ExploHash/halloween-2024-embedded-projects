// main.js
const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");
const dayjs = require("dayjs");
const playSound = require("play-sound")();

// Run gpioget 0 21 every 10ms
const exec = require("child_process").exec;

function gpioTick() {
  exec("gpioget 2 13", (error, stdout, stderr) => {
    if (error) {
      console.error(`exec error: ${error}`);
      setTimeout(gpioTick, 20);
      return;
    }

    if (stdout.trim() === "1") {
      console.log("Detected button press");
      BrowserWindow.getAllWindows().forEach((window) => {
        window.webContents.send("button-pressed");
      });

      // Cooldown
      setTimeout(gpioTick, 1000);
    } else {
      setTimeout(gpioTick, 10);
    }
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 640,
    height: 480,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      enableRemoteModule: false,
    },
    // fullscreen: true
  });

  win.loadFile("index.html");
}

// Listen for image saving requests
ipcMain.on("save-image", (event, imageData) => {
  const base64Data = imageData.replace(/^data:image\/png;base64,/, "");
  const buffer = Buffer.from(base64Data, "base64");

  const picturesPath = path.join(
    app.getPath("pictures"),
    "photobooth-" + dayjs().format("YYYY-MM-DD-HH-mm-ss") + ".png",
  );

  fs.writeFile(picturesPath, buffer, (err) => {
    if (err) {
      console.error("Error saving image:", err);
      event.reply("image-saved", "Error saving image");
    } else {
      console.log("Image saved to:", picturesPath);
      event.reply("image-saved", "Image saved successfully");
    }
  });
});

ipcMain.on("play-scary-sound", (event) => {
  playSound.play(path.join(__dirname, "scream.wav"), (err) => {
    if (err) {
      console.error("Error playing sound:", err);
    }
  });
});

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

gpioTick();
