import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from './firebase';

export async function addProductIdsToExistingProducts() {
  try {
    const productsRef = collection(db, 'products');
    const snapshot = await getDocs(productsRef);
    
    let counter = 1;
    const updates = [];
    
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (!data.productId) {
        updates.push({
          id: docSnap.id,
          productId: `PROD-${String(counter).padStart(3, '0')}`
        });
        counter++;
      }
    });
    
    console.log(`Updating ${updates.length} products with Product IDs...`);
    
    for (const update of updates) {
      await updateDoc(doc(db, 'products', update.id), {
        productId: update.productId
      });
      console.log(`Updated product ${update.id} with ID: ${update.productId}`);
    }
    
    console.log('All products updated successfully!');
    return { success: true, count: updates.length };
  } catch (error) {
    console.error('Error updating products:', error);
    return { success: false, error: error.message };
  }
}
