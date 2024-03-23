const { BrowserWindow, app, ipcMain, Menu, Tray } = require("electron");
const path = require('node:path')

let win; // scoped to make varaible public
function createWindow() {
  win=new BrowserWindow({
    width: 1020,
    height: 600,
    frame: false,
    icon: path.join(__dirname, '/icon.ico'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });
  win.loadFile("index.html") // name of main .html file
  win.setMenuBarVisibility(false);
  win.on("closed", () => {
    win=null;
  });

  const tray = new Tray(path.join(__dirname, '/icon.ico'))

  const contextMenu = Menu.buildFromTemplate([
    {
        label: 'Exit', 
        type: 'normal',
        click: () => {
            win.close();
        }
    },
  ])

  tray.setToolTip('Hausaufgabenheft')
  tray.setContextMenu(contextMenu)

  tray.addListener('click', () => {
    if (!win.isVisible()) {
        win.show();
    } else {
        win.hide();
    }
  });

}


let maximizeToggle=false; // toggle back to original window size if maximize is clicked again

ipcMain.on("manualMinimize", () => {
  win.minimize();
});

ipcMain.on("manualMaximize", () => {
  if (maximizeToggle) {
    win.unmaximize();
  } else {
    win.maximize();
  }
  maximizeToggle=!maximizeToggle; // flip the value of maximizeToggle
});

ipcMain.on("manualClose", () => {
  app.quit();
});

ipcMain.on('voidApp', () => {
  win.hide();
});

app.on("ready", createWindow);