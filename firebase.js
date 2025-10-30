// Initialize Firebase using the global (namespaced/UMD) SDK loaded from CDN
// This file provides a compatibility wrapper so existing v8-style auth code
// (e.g. `auth.signInWithEmailAndPassword`) can continue to work.

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAvdQCbDjsHd8U3fgZ0vEuxBj_kQDX8CEo",
  authDomain: "smartstock-ffa43.firebaseapp.com",
  projectId: "smartstock-ffa43",
  storageBucket: "smartstock-ffa43.firebasestorage.app",
  messagingSenderId: "452783586843",
  appId: "1:452783586843:web:165f915802ff3203fc82be",
  measurementId: "G-C1KPTCKGV5"
};

// The pages load the Firebase CDN scripts (firebase-app.js and firebase-auth.js)
// which expose a global `firebase` namespace (UMD). Initialize using that
// global and expose `auth` so existing auth.js code works unchanged.
if (typeof firebase !== 'undefined' && firebase.initializeApp) {
  firebase.initializeApp(firebaseConfig);
  // Create auth instance and expose globally
  window.auth = firebase.auth();
  // If analytics is available, initialize it (optional)
  if (firebase.analytics) {
    try { window.analytics = firebase.analytics(); } catch(e) { /* ignore */ }
  }
} else {
  console.error('Firebase SDK not found. Make sure you included the firebase-app.js and firebase-auth.js scripts before firebase.js');
}