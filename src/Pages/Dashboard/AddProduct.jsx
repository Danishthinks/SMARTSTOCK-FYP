import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../Components/DashboardLayout';
import { collection, addDoc, serverTimestamp, onSnapshot, query } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { addLog } from '../../lib/firebase-logs';
import { pushNotification, sendCrudNotification } from '../../lib/notifications';

export default function AddProduct() {
  const [formData, setFormData] = useState({
    productId: '',
    name: '',
    category: '',
    quantity: '',
    purchasePrice: '',
    sellingPrice: '',
    warehouse: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [warehouses, setWarehouses] = useState([]);

  // Fetch warehouses
  useEffect(() => {
    if (!db) return;

    const warehousesQuery = query(collection(db, 'warehouses'));
    const unsubscribe = onSnapshot(
      warehousesQuery,
      (snapshot) => {
        const warehousesData = [];
        snapshot.forEach((doc) => {
          warehousesData.push({ name: doc.data().name, id: doc.id });
        });
        setWarehouses(warehousesData);
      },
      (error) => {
        console.error('Error loading warehouses:', error);
      }
    );

    return () => unsubscribe();
  }, []);

  const showMessage = (text, type = 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 5000);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ text: '', type: '' });

    const { productId, name, category, quantity, purchasePrice, sellingPrice, warehouse } = formData;

    // Validate inputs
    if (!productId.trim() || !name.trim() || !category.trim() || !quantity || !purchasePrice || !sellingPrice || !warehouse) {
      showMessage('⚠️ Please fill all fields', 'warning');
      return;
    }

    const qtyNum = Number(quantity);
    const priceNum = Number(purchasePrice);
    const sellNum = Number(sellingPrice);

    if (qtyNum < 0 || !Number.isInteger(qtyNum)) {
      showMessage('⚠️ Quantity must be a positive whole number', 'warning');
      return;
    }
    if (priceNum <= 0) {
      showMessage('⚠️ Purchase price must be greater than 0', 'warning');
      return;
    }
    if (sellNum <= 0) {
      showMessage('⚠️ Selling price must be greater than 0', 'warning');
      return;
    }
    if (sellNum <= priceNum) {
      showMessage('⚠️ Selling price should be higher than purchase price', 'warning');
      return;
    }

    if (!db) {
      showMessage('❌ Database not initialized. Please refresh the page.', 'error');
      return;
    }

    setIsLoading(true);
    showMessage('Adding product...', 'warning');

    try {
      await addDoc(collection(db, 'products'), {
        productId: productId.trim(),
        name: name.trim(),
        category: category.trim(),
        quantity: qtyNum,
        purchasePrice: priceNum,
        sellingPrice: sellNum,
        warehouse: warehouse.trim(),
        createdAt: serverTimestamp(),
        createdBy: auth.currentUser.uid,
        lastUpdatedBy: auth.currentUser.uid
      });

      // Log the action
      addLog('ADD PRODUCT', name.trim(), qtyNum);
      pushNotification('Product added', {
        body: `${name.trim()} (Qty: ${qtyNum}) was added to ${warehouse.trim()}.`
      });
      sendCrudNotification({
        title: 'Product added',
        body: `${name.trim()} (Qty: ${qtyNum}) was added to ${warehouse.trim()}.`
      });

      showMessage('✅ Product Added Successfully', 'success');
      // Reset form
      setFormData({
        productId: '',
        name: '',
        category: '',
        quantity: '',
        purchasePrice: '',
        sellingPrice: '',
        warehouse: ''
      });
    } catch (err) {
      console.error('Error adding product:', err);
      showMessage('❌ Error: ' + (err.message || 'Failed to add product'), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const getMessageColor = () => {
    if (message.type === 'success') return '#0a7b00';
    if (message.type === 'warning') return '#9B870C';
    return '#b00020';
  };

  return (
    <DashboardLayout>
      <div style={{ fontSize: '22px', fontWeight: 600, color: 'var(--text-dark)', marginBottom: '20px' }}>
        Add New Product
      </div>

      <div
        style={{
          backgroundColor: 'var(--card)',
          padding: '25px',
          borderRadius: '12px',
          boxShadow: '0 4px 10px rgba(0,0,0,0.08)',
          maxWidth: '450px'
        }}
      >
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-dark)', display: 'block', marginBottom: '5px' }}>
              Product ID
            </label>
            <input
              type="text"
              name="productId"
              placeholder="e.g. PROD-001"
              maxLength="50"
              value={formData.productId}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ccc',
                borderRadius: '6px',
                marginTop: '5px',
                fontSize: '14px',
                backgroundColor: 'var(--card)',
                color: 'var(--text-dark)'
              }}
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-dark)', display: 'block', marginBottom: '5px' }}>
              Product Name
            </label>
            <input
              type="text"
              name="name"
              placeholder="e.g. iPhone 14"
              maxLength="100"
              value={formData.name}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ccc',
                borderRadius: '6px',
                marginTop: '5px',
                fontSize: '14px',
                backgroundColor: 'var(--card)',
                color: 'var(--text-dark)'
              }}
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-dark)', display: 'block', marginBottom: '5px' }}>
              Category
            </label>
            <input
              type="text"
              name="category"
              placeholder="e.g. Mobile Phones"
              maxLength="50"
              value={formData.category}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ccc',
                borderRadius: '6px',
                marginTop: '5px',
                fontSize: '14px',
                backgroundColor: 'var(--card)',
                color: 'var(--text-dark)'
              }}
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-dark)', display: 'block', marginBottom: '5px' }}>
              Stock Quantity
            </label>
            <input
              type="number"
              name="quantity"
              placeholder="e.g. 10"
              min="0"
              step="1"
              value={formData.quantity}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ccc',
                borderRadius: '6px',
                marginTop: '5px',
                fontSize: '14px',
                backgroundColor: 'var(--card)',
                color: 'var(--text-dark)'
              }}
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-dark)', display: 'block', marginBottom: '5px' }}>
              Purchase Price
            </label>
            <input
              type="number"
              name="purchasePrice"
              placeholder="e.g. 20000"
              min="0"
              step="0.01"
              value={formData.purchasePrice}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ccc',
                borderRadius: '6px',
                marginTop: '5px',
                fontSize: '14px',
                backgroundColor: 'var(--card)',
                color: 'var(--text-dark)'
              }}
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-dark)', display: 'block', marginBottom: '5px' }}>
              Selling Price
            </label>
            <input
              type="number"
              name="sellingPrice"
              placeholder="e.g. 24000"
              min="0"
              step="0.01"
              value={formData.sellingPrice}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ccc',
                borderRadius: '6px',
                marginTop: '5px',
                fontSize: '14px',
                backgroundColor: 'var(--card)',
                color: 'var(--text-dark)'
              }}
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-dark)', display: 'block', marginBottom: '5px' }}>
              Warehouse *
            </label>
            <select
              name="warehouse"
              value={formData.warehouse}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ccc',
                borderRadius: '6px',
                marginTop: '5px',
                fontSize: '14px',
                backgroundColor: 'var(--card)',
                color: 'var(--text-dark)'
              }}
            >
              <option value="">Select a warehouse</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.name}>{w.name}</option>
              ))}
            </select>
            {warehouses.length === 0 && (
              <small style={{ color: '#ef4444', display: 'block', marginTop: '5px' }}>
                📍 No warehouses found. Create one in Warehouses section first.
              </small>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: '100%',
              background: 'var(--primary)',
              color: 'var(--button-text)',
              padding: '12px',
              borderRadius: '6px',
              border: 'none',
              fontSize: '16px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.7 : 1
            }}
          >
            {isLoading ? 'Adding Product...' : 'Add Product'}
          </button>

          {message.text && (
            <p style={{ marginTop: '10px', fontSize: '14px', color: getMessageColor() }}>
              {message.text}
            </p>
          )}
        </form>
      </div>
    </DashboardLayout>
  );
}
