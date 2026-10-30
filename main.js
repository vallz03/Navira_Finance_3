'use strict'
const { app, BrowserWindow, shell, session } = require('electron')
const path = require('path')

// Hanya satu jendela Saku yang boleh berjalan.
if (!app.requestSingleInstanceLock()) app.quit()

let mainWindow = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1320,
    height: 840,
    minWidth: 900,
    minHeight: 620,
    title: 'Navira_Finance',
    backgroundColor: '#f3f4ef',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, // renderer terisolasi dari API Electron
      nodeIntegration: false, // tidak ada akses Node.js di halaman
      sandbox: true,
      webSecurity: true,
      spellcheck: false,
    },
  })

  mainWindow.loadFile(path.join(__dirname, 'index.html'))
  mainWindow.once('ready-to-show', () => mainWindow.show())

  // Cegah navigasi keluar dari aplikasi; tautan https dibuka di browser bawaan.
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('file://')) {
      event.preventDefault()
      if (url.startsWith('https://')) shell.openExternal(url)
    }
  })
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) shell.openExternal(url)
    return { action: 'deny' }
  })
  mainWindow.on('closed', () => { mainWindow = null })
}

app.whenReady().then(() => {
  // Tolak semua permintaan izin (kamera, mikrofon, lokasi, dll.) - Saku tidak membutuhkannya.
  session.defaultSession.setPermissionRequestHandler((_wc, _permission, callback) => callback(false))
  createWindow()
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
})

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  }
})

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
