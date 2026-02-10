export async function requestNotificationPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }

  if (Notification.permission === "default") {
    try {
      return await Notification.requestPermission();
    } catch (err) {
      return "denied";
    }
  }

  return Notification.permission;
}

export async function pushNotification(title, options = {}) {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return;
  }

  const permission = await requestNotificationPermission();
  if (permission !== "granted") {
    return;
  }

  try {
    new Notification(title, options);
  } catch (err) {
    // Ignore notification errors in unsupported contexts
  }
}

export async function sendCrudNotification({ title, body }) {
  try {
    const user = await import("../lib/firebase").then((m) => m.auth?.currentUser);
    if (!user) return;

    const { functions } = await import("../lib/firebase");
    const { httpsCallable } = await import("firebase/functions");
    const notifyCrud = httpsCallable(functions, "notifyCrud");
    await notifyCrud({ title, body });
  } catch (err) {
    // Ignore notification errors
  }
}
