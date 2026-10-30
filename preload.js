'use strict'
const { contextBridge } = require('electron')

// Hanya mengekspos informasi minimal & read-only ke halaman.
contextBridge.exposeInMainWorld('sakuApp', Object.freeze({
  platform: process.platform,
}))
