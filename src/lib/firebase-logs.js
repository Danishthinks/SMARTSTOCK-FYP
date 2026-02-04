import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';

export function addLog(action, productName, quantity = 0) {
  const user = auth.currentUser;
  if (!user) return;

  addDoc(collection(db, 'logs'), {
    user: user.email,
    action,
    productName,
    quantity,
    timestamp: serverTimestamp()
  }).then(() => {
    console.log('Log added');
  }).catch(err => console.error('Log error:', err));
}
