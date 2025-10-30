// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAvdQCbDjsHd8U3fgZ0vEuxBj_kQDX8CEo",
  authDomain: "smartstock-ffa43.firebaseapp.com",
  projectId: "smartstock-ffa43",
  storageBucket: "smartstock-ffa43.firebasestorage.app",
  messagingSenderId: "452783586843",
  appId: "1:452783586843:web:165f915802ff3203fc82be",
  measurementId: "G-C1KPTCKGV5"
};

// Initialize Firebase using the compat (namespaced) API that the pages expect.
// This file assumes the compat CDN scripts are included before this script.
if (typeof firebase !== 'undefined' && firebase.initializeApp) {
  try {
    // Avoid re-initializing if app already exists
    if (!firebase.apps || firebase.apps.length === 0) {
      firebase.initializeApp(firebaseConfig);
    }
    // Expose the auth instance used by other scripts
    window.auth = firebase.auth();
    // Optionally expose analytics if available
    if (firebase.analytics) {
      try { window.analytics = firebase.analytics(); } catch(e) { /* ignore */ }
    }
  } catch (e) {
    console.error('Error initializing Firebase:', e);
  }
} else {
  console.error('Firebase compat SDK not found. Make sure you include the compat scripts (firebase-app-compat.js and firebase-auth-compat.js) before firebase.js');
}