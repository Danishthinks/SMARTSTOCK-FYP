/* eslint-disable no-undef */
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyAvdQCbDjsHd8U3fgZ0vEuxBj_kQDX8CEo",
  authDomain: "smartstock-ffa43.firebaseapp.com",
  projectId: "smartstock-ffa43",
  storageBucket: "smartstock-ffa43.firebasestorage.app",
  messagingSenderId: "452783586843",
  appId: "1:452783586843:web:165f915802ff3203fc82be",
  measurementId: "G-C1KPTCKGV5"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload?.notification?.title || "SmartStock";
  const options = {
    body: payload?.notification?.body || "You have an update.",
    icon: "/logo192.png"
  };

  self.registration.showNotification(title, options);
});
