function addLog(action, productName, quantity = 0) {
  const user = auth.currentUser;
  if (!user) return;

  db.collection("logs").add({
    user: user.email,
    action,
    productName,
    quantity,
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  }).then(() => {
    console.log("Log added");
  }).catch(err => console.error("Log error:", err));
}
