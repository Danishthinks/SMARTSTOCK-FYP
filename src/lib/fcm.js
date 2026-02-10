import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { getToken } from "firebase/messaging";
import { auth, db, getFirebaseMessaging } from "./firebase";

export async function registerFcmToken() {
  const messaging = await getFirebaseMessaging();
  if (!messaging) return null;

  if (!("Notification" in window)) return null;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return null;

  const vapidKey = process.env.REACT_APP_FIREBASE_VAPID_KEY;
  if (!vapidKey) {
    console.warn("Missing REACT_APP_FIREBASE_VAPID_KEY");
    return null;
  }

  const swReg = await navigator.serviceWorker.register("/firebase-messaging-sw.js");

  const token = await getToken(messaging, {
    vapidKey,
    serviceWorkerRegistration: swReg
  });

  if (!token) return null;

  const user = auth.currentUser;
  const tokenRef = doc(db, "fcmTokens", token);
  await setDoc(
    tokenRef,
    {
      token,
      uid: user ? user.uid : null,
      email: user ? user.email : null,
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp()
    },
    { merge: true }
  );

  return token;
}
