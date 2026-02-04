import React, { useState } from 'react';
import DashboardLayout from '../../Components/DashboardLayout';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { addLog } from '../../lib/firebase-logs';

export default function AddProduct() {
  const [formData, setFormData] = useState({
    productId: '',
    name: '',
    category: '',
    quantity: '',
    purchasePrice: '',
    sellingPrice: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

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

    const { productId, name, category, quantity, purchasePrice, sellingPrice } = formData;

    // Validate inputs
    if (!productId.trim() || !name.trim() || !category.trim() || !quantity || !purchasePrice || !sellingPrice) {
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
        createdAt: serverTimestamp(),
        createdBy: auth.currentUser.uid
      });

      // Log the action
      addLog('ADD PRODUCT', name.trim(), qtyNum);

      showMessage('✅ Product Added Successfully', 'success');
      // Reset form
      setFormData({
        productId: '',
        name: '',
        category: '',
        quantity: '',
        purchasePrice: '',
        sellingPrice: ''
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
