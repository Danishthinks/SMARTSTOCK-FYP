import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../Components/DashboardLayout';
import { collection, onSnapshot, query, orderBy, deleteDoc, doc, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { addLog } from '../../lib/firebase-logs';
import { addProductIdsToExistingProducts } from '../../lib/update-product-ids';
import { pushNotification, sendCrudNotification } from '../../lib/notifications';

export default function InventoryList() {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [adjustingId, setAdjustingId] = useState(null);
  const [adjustQty, setAdjustQty] = useState(0);
  const [undoItem, setUndoItem] = useState(null);
  const [undoTimer, setUndoTimer] = useState(null);
  const [message, setMessage] = useState({ text: '', type: '' });

  const showMessage = (text, type = 'warning') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 5000);
  };

  useEffect(() => {
    if (!db) {
      setLoading(false);
      return;
    }

    const productsQuery = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(
      productsQuery,
      (snapshot) => {
        const productsData = [];
        const catsSet = new Set();

        snapshot.forEach((doc) => {
          const data = doc.data();
          productsData.push({ ...data, id: doc.id });
          if (data.category) catsSet.add(data.category);
        });

        setProducts(productsData);
        setCategories(Array.from(catsSet).sort());
        setLoading(false);
      },
      (error) => {
        console.error('Error loading products:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    return () => {
      if (undoTimer) {
        clearTimeout(undoTimer);
      }
    };
  }, [undoTimer]);

  const updateProductIds = async () => {
    if (!window.confirm('This will add generic Product IDs (PROD-001, PROD-002, etc.) to all products that don\'t have one. Continue?')) {
      return;
    }
    
    setLoading(true);
    const result = await addProductIdsToExistingProducts();
    setLoading(false);
    
    if (result.success) {
      alert(`Successfully updated ${result.count} products with Product IDs!`);
    } else {
      alert(`Error: ${result.error}`);
    }
  };

  useEffect(() => {
    let filtered = products;

    if (searchTerm) {
      filtered = filtered.filter((p) =>
        p.name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (categoryFilter) {
      filtered = filtered.filter((p) => p.category === categoryFilter);
    }

    setFilteredProducts(filtered);
  }, [products, searchTerm, categoryFilter]);

  const handleDelete = async (id, productName) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;

    try {
      const product = products.find((p) => p.id === id);
      await deleteDoc(doc(db, 'products', id));
      addLog('DELETE PRODUCT', productName, product?.quantity || 0);
      pushNotification('Product deleted', {
        body: `${productName} was removed.`
      });
      sendCrudNotification({
        title: 'Product deleted',
        body: `${productName} was removed.`
      });

      if (product) {
        if (undoTimer) clearTimeout(undoTimer);
        setUndoItem(product);
        const timer = setTimeout(() => setUndoItem(null), 6000);
        setUndoTimer(timer);
      }
    } catch (err) {
      console.error('Delete error:', err);
      alert('Error deleting product: ' + err.message);
    }
  };

  const handleEditClick = (product) => {
    setEditingId(product.id);
    setEditFormData({
      name: product.name,
      category: product.category,
      purchasePrice: product.purchasePrice,
      sellingPrice: product.sellingPrice
    });
  };

  const handleEditSubmit = async (id) => {
    try {
      const product = products.find((p) => p.id === id);
      await updateDoc(doc(db, 'products', id), {
        ...editFormData,
        lastUpdatedBy: auth?.currentUser?.uid || null
      });
      addLog('UPDATE PRODUCT', editFormData.name, product?.quantity || 0);
      pushNotification('Product updated', {
        body: `${editFormData.name || product?.name || 'Product'} updated.`
      });
      sendCrudNotification({
        title: 'Product updated',
        body: `${editFormData.name || product?.name || 'Product'} updated.`
      });
      setEditingId(null);
      alert('Product updated successfully');
    } catch (err) {
      console.error('Update error:', err);
      alert('Error updating product: ' + err.message);
    }
  };

  const handleAdjustClick = (product) => {
    setAdjustingId(product.id);
    setAdjustQty(0);
  };

  const handleAdjustSubmit = async (id) => {
    if (adjustQty === 0) {
      alert('Please enter a quantity change');
      return;
    }

    try {
      const product = products.find((p) => p.id === id);
      const newQuantity = Math.max(0, (product.quantity || 0) + Number(adjustQty));
      await updateDoc(doc(db, 'products', id), {
        quantity: newQuantity,
        lastUpdatedBy: auth?.currentUser?.uid || null
      });
      addLog('STOCK ADJUST', product.name, newQuantity);
      pushNotification('Stock adjusted', {
        body: `${product.name}: ${product.quantity || 0} → ${newQuantity}`
      });
      sendCrudNotification({
        title: 'Stock adjusted',
        body: `${product.name}: ${product.quantity || 0} → ${newQuantity}`
      });
      if (newQuantity < 5) {
        showMessage(`Low stock: ${product.name} is now at ${newQuantity}`, 'warning');
      }
      setAdjustingId(null);
      setAdjustQty(0);
      alert('Stock adjusted successfully');
    } catch (err) {
      console.error('Adjust stock error:', err);
      alert('Error adjusting stock: ' + err.message);
    }
  };

  const handleRestore = async () => {
    if (!undoItem) return;

    try {
      const { id, ...data } = undoItem;
      await setDoc(doc(db, 'products', id), {
        ...data,
        restoredAt: serverTimestamp(),
        lastUpdatedBy: auth?.currentUser?.uid || null
      }, { merge: true });

      addLog('RESTORE PRODUCT', data.name || 'Product', data.quantity || 0);
      pushNotification('Product restored', {
        body: `${data.name || 'Product'} was restored.`
      });
      sendCrudNotification({
        title: 'Product restored',
        body: `${data.name || 'Product'} was restored.`
      });
    } catch (err) {
      console.error('Restore error:', err);
      alert('Error restoring product: ' + err.message);
    } finally {
      setUndoItem(null);
      if (undoTimer) clearTimeout(undoTimer);
      setUndoTimer(null);
    }
  };

  const exportToCSV = () => {
    if (filteredProducts.length === 0) {
      alert('No products to export');
      return;
    }

    const headers = ['Product ID', 'Name', 'Category', 'Warehouse', 'Quantity', 'Purchase Price', 'Selling Price'];
    let csv = headers.join(',') + '\n';

    filteredProducts.forEach((p) => {
      const line = [
        `"${(p.productId || '').replace(/"/g, '""')}"`,
        `"${(p.name || '').replace(/"/g, '""')}"`,
        `"${(p.category || '').replace(/"/g, '""')}"`,
        `"${(p.warehouse || 'Not assigned').replace(/"/g, '""')}"`,
        p.quantity ?? '',
        p.purchasePrice ?? '',
        p.sellingPrice ?? ''
      ].join(',');
      csv += line + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    const date = new Date().toISOString().slice(0, 10);
    link.download = `Inventory_Report_${date}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const exportToPDF = () => {
    if (filteredProducts.length === 0) {
      alert('No products to export');
      return;
    }

    if (typeof window.jspdf === 'undefined' || typeof window.jspdf.jsPDF !== 'function') {
      alert('PDF library not available');
      return;
    }

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 10;
    let y = 20;

    pdf.setFontSize(16);
    pdf.text('SMARTSTOCK - Inventory Report', pageWidth / 2, y, { align: 'center' });
    y += 15;

    pdf.setFontSize(10);
    const headers = ['ID', 'Name', 'Category', 'Warehouse', 'Qty', 'Buy Price', 'Sell Price'];
    const colWidth = (pageWidth - 2 * margin) / headers.length;

    headers.forEach((h, i) => {
      pdf.text(String(h), margin + i * colWidth + 2, y);
    });
    y += 10;

    pdf.setFontSize(9);
    filteredProducts.forEach((p, index) => {
      if (y > pageHeight - 20) {
        pdf.addPage();
        y = 20;
      }

      const cells = [
        p.productId || '',
        p.name || '',
        p.category || '',
        p.warehouse || 'Not assigned',
        String(p.quantity ?? ''),
        String(p.purchasePrice ?? ''),
        String(p.sellingPrice ?? '')
      ];

      const cellLines = cells.map((c) => pdf.splitTextToSize(String(c), colWidth - 4));
      const maxLines = Math.max(...cellLines.map(l => l.length));

      for (let li = 0; li < maxLines; li++) {
        if (y > pageHeight - 20) {
          pdf.addPage();
          y = 20;
        }
        cells.forEach((c, ci) => {
          const lines = pdf.splitTextToSize(String(c), colWidth - 4);
          const text = lines[li] || '';
          pdf.text(text, margin + ci * colWidth + 2, y);
        });
        y += 5;
      }
      y += 2;
    });

    const date = new Date().toISOString().slice(0, 10);
    pdf.save(`Inventory_Report_${date}.pdf`);
  };

  return (
    <DashboardLayout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ fontSize: '22px', fontWeight: 'bold', color: 'var(--text-dark)' }}>
          Inventory List
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input
            type="text"
            placeholder="Search product..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              padding: '8px',
              border: '1px solid #ccc',
              borderRadius: '6px',
              width: '200px',
              backgroundColor: 'var(--card)',
              color: 'var(--text-dark)'
            }}
          />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            style={{
              padding: '8px',
              border: '1px solid #ccc',
              borderRadius: '6px',
              backgroundColor: 'var(--card)',
              color: 'var(--text-dark)'
            }}
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          <button
            onClick={exportToCSV}
            style={{
              padding: '8px 12px',
              background: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Export Excel
          </button>
          <button
            onClick={exportToPDF}
            style={{
              padding: '8px 12px',
              background: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Export PDF
          </button>
          <button
            onClick={updateProductIds}
            style={{
              padding: '8px 12px',
              background: '#059669',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Add Product IDs
          </button>
        </div>
      </div>

      {message.text && (
        <div
          style={{
            backgroundColor: message.type === 'success' ? '#0a7b0015' : '#9B870C15',
            color: message.type === 'success' ? '#0a7b00' : '#9B870C',
            padding: '10px 12px',
            borderRadius: '6px',
            marginBottom: '16px',
            fontSize: '13px',
            border: `1px solid ${message.type === 'success' ? '#0a7b0030' : '#9B870C30'}`
          }}
        >
          {message.text}
        </div>
      )}

      <div
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          backgroundColor: 'var(--card)',
          boxShadow: '0 4px 10px rgba(0,0,0,0.08)',
          borderRadius: '8px',
          overflow: 'hidden',
          marginBottom: '20px'
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#eef2ff' }}>
              <th style={{ padding: '12px', borderBottom: '1px solid #e5e7eb', textAlign: 'left', fontSize: '14px', fontWeight: 'bold', color: '#111' }}>
                Product ID
              </th>
              <th style={{ padding: '12px', borderBottom: '1px solid #e5e7eb', textAlign: 'left', fontSize: '14px', fontWeight: 'bold', color: '#111' }}>
                Name
              </th>
              <th style={{ padding: '12px', borderBottom: '1px solid #e5e7eb', textAlign: 'left', fontSize: '14px', fontWeight: 'bold', color: '#111' }}>
                Category
              </th>
              <th style={{ padding: '12px', borderBottom: '1px solid #e5e7eb', textAlign: 'left', fontSize: '14px', fontWeight: 'bold', color: '#111' }}>
                Warehouse
              </th>
              <th style={{ padding: '12px', borderBottom: '1px solid #e5e7eb', textAlign: 'left', fontSize: '14px', fontWeight: 'bold', color: '#111' }}>
                Qty
              </th>
              <th style={{ padding: '12px', borderBottom: '1px solid #e5e7eb', textAlign: 'left', fontSize: '14px', fontWeight: 'bold', color: '#111' }}>
                Buy Price
              </th>
              <th style={{ padding: '12px', borderBottom: '1px solid #e5e7eb', textAlign: 'left', fontSize: '14px', fontWeight: 'bold', color: '#111' }}>
                Sell Price
              </th>
              <th style={{ padding: '12px', borderBottom: '1px solid #e5e7eb', textAlign: 'left', fontSize: '14px', fontWeight: 'bold', color: '#111' }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8" style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
                  Loading products...
                </td>
              </tr>
            ) : filteredProducts.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
                  No products found
                </td>
              </tr>
            ) : (
              filteredProducts.map((product) => {
                const quantity = product.quantity != null ? product.quantity : 0;
                const isLowStock = quantity < 5;
                return (
                  <tr
                    key={product.id}
                    style={{
                      color: isLowStock ? '#b00020' : 'inherit'
                    }}
                  >
                    <td style={{ padding: '12px', borderBottom: '1px solid #e5e7eb', fontSize: '14px' }}>
                      {product.productId || 'N/A'}
                    </td>
                    <td style={{ padding: '12px', borderBottom: '1px solid #e5e7eb', fontSize: '14px' }}>
                      {product.name || ''}
                    </td>
                    <td style={{ padding: '12px', borderBottom: '1px solid #e5e7eb', fontSize: '14px' }}>
                      {product.category || ''}
                    </td>
                    <td style={{ padding: '12px', borderBottom: '1px solid #e5e7eb', fontSize: '14px' }}>
                      <span
                        style={{
                          backgroundColor: '#e0e7ff',
                          color: '#3730a3',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '13px',
                          fontWeight: 500
                        }}
                      >
                        📍 {product.warehouse || 'Not assigned'}
                      </span>
                    </td>
                    <td style={{ padding: '12px', borderBottom: '1px solid #e5e7eb', fontSize: '14px' }}>
                      {quantity}
                      {isLowStock && (
                        <span
                          style={{
                            background: '#dc2626',
                            color: '#fff',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            marginLeft: '5px'
                          }}
                        >
                          Low
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px', borderBottom: '1px solid #e5e7eb', fontSize: '14px' }}>
                      Rs. {product.purchasePrice?.toLocaleString() || 0}
                    </td>
                    <td style={{ padding: '12px', borderBottom: '1px solid #e5e7eb', fontSize: '14px' }}>
                      Rs. {product.sellingPrice?.toLocaleString() || 0}
                    </td>
                    <td style={{ padding: '12px', borderBottom: '1px solid #e5e7eb', fontSize: '14px', display: 'flex', gap: '6px' }}>
                      <button
                        onClick={() => handleEditClick(product)}
                        style={{
                          cursor: 'pointer',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          fontSize: '13px',
                          border: 'none',
                          background: '#2563eb',
                          color: '#fff'
                        }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleAdjustClick(product)}
                        style={{
                          cursor: 'pointer',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          fontSize: '13px',
                          border: 'none',
                          background: '#059669',
                          color: '#fff'
                        }}
                      >
                        Adjust Stock
                      </button>
                      <button
                        onClick={() => handleDelete(product.id, product.name)}
                        style={{
                          cursor: 'pointer',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          fontSize: '13px',
                          border: 'none',
                          background: '#ef4444',
                          color: '#fff'
                        }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {editingId && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'var(--card)',
            padding: '25px',
            borderRadius: '12px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            maxWidth: '400px',
            width: '90%'
          }}>
            <h3 style={{ marginBottom: '20px', fontSize: '18px', fontWeight: 'bold', color: 'var(--text-dark)' }}>
              Edit Product
            </h3>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-dark)', display: 'block', marginBottom: '5px' }}>
                Product Name
              </label>
              <input
                type="text"
                value={editFormData.name || ''}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ccc',
                  borderRadius: '6px',
                  fontSize: '14px',
                  backgroundColor: 'var(--card)',
                  color: 'var(--text-dark)',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-dark)', display: 'block', marginBottom: '5px' }}>
                Category
              </label>
              <input
                type="text"
                value={editFormData.category || ''}
                onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ccc',
                  borderRadius: '6px',
                  fontSize: '14px',
                  backgroundColor: 'var(--card)',
                  color: 'var(--text-dark)',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-dark)', display: 'block', marginBottom: '5px' }}>
                Purchase Price
              </label>
              <input
                type="number"
                value={editFormData.purchasePrice || ''}
                onChange={(e) => setEditFormData({ ...editFormData, purchasePrice: Number(e.target.value) })}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ccc',
                  borderRadius: '6px',
                  fontSize: '14px',
                  backgroundColor: 'var(--card)',
                  color: 'var(--text-dark)',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-dark)', display: 'block', marginBottom: '5px' }}>
                Selling Price
              </label>
              <input
                type="number"
                value={editFormData.sellingPrice || ''}
                onChange={(e) => setEditFormData({ ...editFormData, sellingPrice: Number(e.target.value) })}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ccc',
                  borderRadius: '6px',
                  fontSize: '14px',
                  backgroundColor: 'var(--card)',
                  color: 'var(--text-dark)',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => handleEditSubmit(editingId)}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                Save
              </button>
              <button
                onClick={() => setEditingId(null)}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Adjust Stock Modal */}
      {adjustingId && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'var(--card)',
            padding: '25px',
            borderRadius: '12px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            maxWidth: '400px',
            width: '90%'
          }}>
            <h3 style={{ marginBottom: '20px', fontSize: '18px', fontWeight: 'bold', color: 'var(--text-dark)' }}>
              Adjust Stock
            </h3>
            <p style={{ marginBottom: '15px', fontSize: '14px', color: 'var(--text-dark)' }}>
              Current Quantity: <strong>{products.find((p) => p.id === adjustingId)?.quantity || 0}</strong>
            </p>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-dark)', display: 'block', marginBottom: '5px' }}>
                Change (e.g., +5 or -3)
              </label>
              <input
                type="number"
                value={adjustQty}
                onChange={(e) => setAdjustQty(Number(e.target.value))}
                placeholder="Enter change amount"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ccc',
                  borderRadius: '6px',
                  fontSize: '14px',
                  backgroundColor: 'var(--card)',
                  color: 'var(--text-dark)',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <p style={{ marginBottom: '20px', fontSize: '14px', color: '#6b7280' }}>
              New Quantity: <strong>{(products.find((p) => p.id === adjustingId)?.quantity || 0) + Number(adjustQty)}</strong>
            </p>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => handleAdjustSubmit(adjustingId)}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: '#059669',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                Confirm
              </button>
              <button
                onClick={() => setAdjustingId(null)}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {undoItem && (
        <div
          style={{
            position: 'fixed',
            bottom: '96px',
            right: '24px',
            background: '#111827',
            color: '#fff',
            padding: '12px 16px',
            borderRadius: '8px',
            boxShadow: '0 8px 20px rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            zIndex: 1100
          }}
        >
          <span style={{ fontSize: '14px' }}>
            Product deleted. Restore?
          </span>
          <button
            onClick={handleRestore}
            style={{
              background: '#2563eb',
              border: 'none',
              color: '#fff',
              padding: '6px 10px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px'
            }}
          >
            Undo
          </button>
        </div>
      )}
    </DashboardLayout>
  );
}
