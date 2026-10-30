import { firebaseConfig } from './firebase-config.js'
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js'
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js'
import {
  getDatabase,
  ref,
  onValue,
  push,
  set,
  update,
  remove,
  serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js'

export const isConfigured =
  !!firebaseConfig.apiKey && !/ISI_/.test(`${firebaseConfig.apiKey}${firebaseConfig.databaseURL}${firebaseConfig.projectId}`)

let app = null
let auth = null
let db = null
if (isConfigured) {
  app = initializeApp(firebaseConfig)
  auth = getAuth(app)
  db = getDatabase(app)
}

export {
  app, auth, db,
  onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, signOut,
  ref, onValue, push, set, update, remove, serverTimestamp,
}
