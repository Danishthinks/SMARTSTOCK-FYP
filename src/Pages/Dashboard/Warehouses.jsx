import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../Components/DashboardLayout';
import { collection, onSnapshot, query, orderBy, addDoc, deleteDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { addLog } from '../../lib/firebase-logs';
import { pushNotification, sendCrudNotification } from '../../lib/notifications';
import { Warehouse, Plus, Edit2, Trash2, Send, ArrowRight, Package, X } from 'lucide-react';

export default function Warehouses() {
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showProductsModal, setShowProductsModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState({ text: '', type: '' });

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    manager: '',
    contact: ''
  });

  const [transferData, setTransferData] = useState({
    productId: '',
    fromWarehouse: '',
    toWarehouse: '',
    quantity: ''
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWarehouse, setSelectedWarehouse] = useState(null);

  // Fetch warehouses
  useEffect(() => {
    if (!db) {
      setLoading(false);
      return;
    }

    const warehousesQuery = query(
      collection(db, 'warehouses'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      warehousesQuery,
      (snapshot) => {
        const warehousesData = [];
        snapshot.forEach((doc) => {
          warehousesData.push({ ...doc.data(), id: doc.id });
        });
        setWarehouses(warehousesData);
        setLoading(false);
      },
      (error) => {
        console.error('Error loading warehouses:', error);
        showMessage('Error loading warehouses', 'error');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Fetch products
  useEffect(() => {
    if (!db) return;

    const productsQuery = query(collection(db, 'products'));

    const unsubscribe = onSnapshot(
      productsQuery,
      (snapshot) => {
        const productsData = [];
        snapshot.forEach((doc) => {
          productsData.push({ ...doc.data(), id: doc.id });
        });
        setProducts(productsData);
      },
      (error) => {
        console.error('Error loading products:', error);
      }
    );

    return () => unsubscribe();
  }, []);

  const showMessage = (text, type = 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 4000);
  };

  // Add warehouse
  const handleAddWarehouse = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.location.trim()) {
      showMessage('⚠️ Please fill Name and Location', 'warning');
      return;
    }

    try {
      await addDoc(collection(db, 'warehouses'), {
        name: formData.name.trim(),
        location: formData.location.trim(),
        manager: formData.manager.trim() || 'Not assigned',
        contact: formData.contact.trim() || '',
        createdAt: serverTimestamp(),
        createdBy: auth.currentUser.uid
      });

      addLog('ADD WAREHOUSE', formData.name.trim(), 0);
      pushNotification('Warehouse added', {
        body: `${formData.name.trim()} warehouse created.`
      });
      sendCrudNotification({
        title: 'Warehouse added',
        body: `${formData.name.trim()} warehouse created.`
      });

      showMessage('✅ Warehouse Added Successfully', 'success');
      setFormData({ name: '', location: '', manager: '', contact: '' });
      setShowAddModal(false);
    } catch (err) {
      console.error('Error adding warehouse:', err);
      showMessage('❌ Error: ' + err.message, 'error');
    }
  };

  // Update warehouse
  const handleEditWarehouse = async (id) => {
    const warehouse = warehouses.find(w => w.id === id);
    setFormData({
      name: warehouse.name,
      location: warehouse.location,
      manager: warehouse.manager,
      contact: warehouse.contact
    });
    setEditingId(id);
    setShowAddModal(true);
  };

  // Save edited warehouse
  const handleSaveWarehouse = async (e) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.location.trim()) {
      showMessage('⚠️ Please fill Name and Location', 'warning');
      return;
    }

    try {
      await updateDoc(doc(db, 'warehouses', editingId), {
        name: formData.name.trim(),
        location: formData.location.trim(),
        manager: formData.manager.trim() || 'Not assigned',
        contact: formData.contact.trim() || ''
      });

      addLog('UPDATE WAREHOUSE', formData.name.trim(), 0);
      pushNotification('Warehouse updated', {
        body: `${formData.name.trim()} warehouse updated.`
      });
      sendCrudNotification({
        title: 'Warehouse updated',
        body: `${formData.name.trim()} warehouse updated.`
      });

      showMessage('✅ Warehouse Updated Successfully', 'success');
      setFormData({ name: '', location: '', manager: '', contact: '' });
      setEditingId(null);
      setShowAddModal(false);
    } catch (err) {
      console.error('Error updating warehouse:', err);
      showMessage('❌ Error: ' + err.message, 'error');
    }
  };

  // Delete warehouse
  const handleDeleteWarehouse = async (id, warehouseName) => {
    if (!window.confirm(`Are you sure you want to delete "${warehouseName}" warehouse?`)) return;

    try {
      // Check if warehouse has products
      const productsInWarehouse = products.filter(p => p.warehouse === warehouseName);
      if (productsInWarehouse.length > 0) {
        showMessage('⚠️ Cannot delete warehouse with products. Move or delete products first.', 'warning');
        return;
      }

      await deleteDoc(doc(db, 'warehouses', id));
      addLog('DELETE WAREHOUSE', warehouseName, 0);
      pushNotification('Warehouse deleted', {
        body: `${warehouseName} warehouse removed.`
      });
      sendCrudNotification({
        title: 'Warehouse deleted',
        body: `${warehouseName} warehouse removed.`
      });
      showMessage('✅ Warehouse Deleted', 'success');
    } catch (err) {
      console.error('Error deleting warehouse:', err);
      showMessage('❌ Error: ' + err.message, 'error');
    }
  };

  // Transfer stock between warehouses
  const handleTransferStock = async (e) => {
    e.preventDefault();

    const { productId, fromWarehouse, toWarehouse, quantity } = transferData;

    if (!productId || !fromWarehouse || !toWarehouse || !quantity) {
      showMessage('⚠️ Please fill all fields', 'warning');
      return;
    }

    const qtyNum = Number(quantity);
    if (qtyNum <= 0 || !Number.isInteger(qtyNum)) {
      showMessage('⚠️ Quantity must be a positive whole number', 'warning');
      return;
    }

    if (fromWarehouse === toWarehouse) {
      showMessage('⚠️ Select different warehouses', 'warning');
      return;
    }

    const product = products.find(p => p.id === productId);
    if (!product) {
      showMessage('⚠️ Product not found', 'warning');
      return;
    }

    if (product.warehouse !== fromWarehouse) {
      showMessage('⚠️ Product not in selected source warehouse', 'warning');
      return;
    }

    if (product.quantity < qtyNum) {
      showMessage(`⚠️ Not enough quantity. Available: ${product.quantity}`, 'warning');
      return;
    }

    try {
      await updateDoc(doc(db, 'products', productId), {
        warehouse: toWarehouse,
        quantity: qtyNum,
        lastUpdatedBy: auth?.currentUser?.uid || null
      });

      addLog('TRANSFER STOCK', `${product.name} from ${fromWarehouse} to ${toWarehouse}`, qtyNum);
      pushNotification('Stock transferred', {
        body: `${qtyNum} units of ${product.name} moved.`
      });
      sendCrudNotification({
        title: 'Stock transferred',
        body: `${qtyNum} units of ${product.name} moved from ${fromWarehouse} to ${toWarehouse}.`
      });

      showMessage('✅ Stock Transferred Successfully', 'success');
      setTransferData({ productId: '', fromWarehouse: '', toWarehouse: '', quantity: '' });
      setShowTransferModal(false);
    } catch (err) {
      console.error('Error transferring stock:', err);
      showMessage('❌ Error: ' + err.message, 'error');
    }
  };

  const getWarehouseStats = (warehouseName) => {
    const warehouseProducts = products.filter(p => p.warehouse === warehouseName);
    const totalQty = warehouseProducts.reduce((sum, p) => sum + (p.quantity || 0), 0);
    const totalValue = warehouseProducts.reduce((sum, p) => sum + ((p.purchasePrice || 0) * (p.quantity || 0)), 0);
    return { count: warehouseProducts.length, totalQty, totalValue };
  };

  const filteredWarehouses = warehouses.filter(w =>
    w.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    w.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getMessageColor = () => {
    if (message.type === 'success') return '#0a7b00';
    if (message.type === 'warning') return '#9B870C';
    return '#b00020';
  };

  return (
    <DashboardLayout>
      <div style={{ fontSize: '24px', fontWeight: 600, color: 'var(--text-dark)', marginBottom: '20px' }}>
        Warehouse Management
      </div>

      {message.text && (
        <div
          style={{
            backgroundColor: getMessageColor() + '15',
            color: getMessageColor(),
            padding: '12px 15px',
            borderRadius: '6px',
            marginBottom: '20px',
            fontSize: '14px',
            border: `1px solid ${getMessageColor()}30`
          }}
        >
          {message.text}
        </div>
      )}

      {/* Top Controls */}
      <div style={{ display: 'flex', gap: '15px', marginBottom: '25px', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Search warehouses..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            padding: '10px 15px',
            border: '1px solid #ccc',
            borderRadius: '6px',
            flex: 1,
            fontSize: '14px',
            backgroundColor: 'var(--input-bg)',
            color: 'var(--text-dark)'
          }}
        />
        <button
          onClick={() => {
            setEditingId(null);
            setFormData({ name: '', location: '', manager: '', contact: '' });
            setShowAddModal(true);
          }}
          style={{
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '14px',
            fontWeight: 500
          }}
        >
          <Plus size={18} />
          Add Warehouse
        </button>
        <button
          onClick={() => setShowTransferModal(true)}
          style={{
            backgroundColor: '#10b981',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '14px',
            fontWeight: 500
          }}
        >
          <ArrowRight size={18} />
          Transfer Stock
        </button>
        <button
          onClick={() => setShowAssignModal(true)}
          style={{
            backgroundColor: '#f59e0b',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '14px',
            fontWeight: 500
          }}
        >
          <Package size={18} />
          Assign Products
        </button>
      </div>

      {/* Warehouses Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-light)' }}>
          Loading warehouses...
        </div>
      ) : filteredWarehouses.length === 0 ? (
        <div
          style={{
            backgroundColor: 'var(--card)',
            padding: '40px',
            borderRadius: '12px',
            textAlign: 'center',
            color: 'var(--text-light)'
          }}
        >
          <Warehouse size={48} style={{ opacity: 0.3, margin: '0 auto 15px' }} />
          <div>No warehouses yet. Create one to get started!</div>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '20px'
          }}
        >
          {filteredWarehouses.map((warehouse) => {
            const stats = getWarehouseStats(warehouse.name);
            return (
              <div
                key={warehouse.id}
                style={{
                  backgroundColor: 'var(--card)',
                  borderRadius: '12px',
                  padding: '20px',
                  boxShadow: '0 3px 10px rgba(0,0,0,0.06)',
                  cursor: 'pointer',
                  transition: '0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-3px)';
                  e.currentTarget.style.boxShadow = '0 6px 18px rgba(0,0,0,0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 3px 10px rgba(0,0,0,0.06)';
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '15px' }}>
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-dark)' }}>
                      {warehouse.name}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-light)', marginTop: '4px' }}>
                      📍 {warehouse.location}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => handleEditWarehouse(warehouse.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#3b82f6',
                        padding: '6px'
                      }}
                      title="Edit"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteWarehouse(warehouse.id, warehouse.name)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#ef4444',
                        padding: '6px'
                      }}
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '12px' }}>
                  <div style={{ fontSize: '13px', color: 'var(--text-light)', marginBottom: '8px' }}>
                    <strong>Manager:</strong> {warehouse.manager}
                  </div>
                  {warehouse.contact && (
                    <div style={{ fontSize: '13px', color: 'var(--text-light)', marginBottom: '8px' }}>
                      <strong>Contact:</strong> {warehouse.contact}
                    </div>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '12px', borderTop: '1px solid #e5e7eb', paddingTop: '12px' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-light)', textTransform: 'uppercase', fontWeight: 600 }}>
                      Items
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: 600, color: '#3b82f6' }}>
                      {stats.count}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-light)', textTransform: 'uppercase', fontWeight: 600 }}>
                      Total Qty
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: 600, color: '#10b981' }}>
                      {stats.totalQty}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setSelectedWarehouse(warehouse.name);
                    setShowProductsModal(true);
                  }}
                  style={{
                    width: '100%',
                    marginTop: '12px',
                    padding: '10px',
                    backgroundColor: 'var(--primary)',
                    border: '1px solid var(--text-light)',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    color: 'var(--button-text)',
                    fontWeight: 600,
                    transition: '0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = '0.8';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = '1';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  📦 View Products
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Warehouse Modal */}
      {showAddModal && (
        <div
          style={{
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
          }}
          onClick={() => {
            setShowAddModal(false);
            setEditingId(null);
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--card)',
              borderRadius: '12px',
              padding: '30px',
              maxWidth: '500px',
              width: '90%',
              boxShadow: '0 10px 40px rgba(0,0,0,0.3)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-dark)', marginBottom: '20px' }}>
              {editingId ? 'Edit Warehouse' : 'Add New Warehouse'}
            </div>

            <form onSubmit={editingId ? handleSaveWarehouse : handleAddWarehouse}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-dark)', display: 'block', marginBottom: '5px' }}>
                  Warehouse Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g., Main Warehouse"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ccc',
                    borderRadius: '6px',
                    fontSize: '14px',
                    backgroundColor: 'var(--input-bg)',
                    color: 'var(--text-dark)',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-dark)', display: 'block', marginBottom: '5px' }}>
                  Location *
                </label>
                <input
                  type="text"
                  placeholder="e.g., New York, NY"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ccc',
                    borderRadius: '6px',
                    fontSize: '14px',
                    backgroundColor: 'var(--input-bg)',
                    color: 'var(--text-dark)',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-dark)', display: 'block', marginBottom: '5px' }}>
                  Manager Name
                </label>
                <input
                  type="text"
                  placeholder="e.g., John Doe"
                  value={formData.manager}
                  onChange={(e) => setFormData({ ...formData, manager: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ccc',
                    borderRadius: '6px',
                    fontSize: '14px',
                    backgroundColor: 'var(--input-bg)',
                    color: 'var(--text-dark)',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-dark)', display: 'block', marginBottom: '5px' }}>
                  Contact Number/Email
                </label>
                <input
                  type="text"
                  placeholder="e.g., 123-456-7890 or email@example.com"
                  value={formData.contact}
                  onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ccc',
                    borderRadius: '6px',
                    fontSize: '14px',
                    backgroundColor: 'var(--input-bg)',
                    color: 'var(--text-dark)',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingId(null);
                  }}
                  style={{
                    padding: '10px 20px',
                    border: '1px solid #ccc',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    backgroundColor: 'var(--bg)',
                    color: 'var(--text-dark)',
                    fontSize: '14px'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 500
                  }}
                >
                  {editingId ? 'Update' : 'Add'} Warehouse
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transfer Stock Modal */}
      {showTransferModal && (
        <div
          style={{
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
          }}
          onClick={() => setShowTransferModal(false)}
        >
          <div
            style={{
              backgroundColor: 'var(--card)',
              borderRadius: '12px',
              padding: '30px',
              maxWidth: '500px',
              width: '90%',
              boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
              maxHeight: '80vh',
              overflowY: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-dark)', marginBottom: '20px' }}>
              Transfer Stock Between Warehouses
            </div>

            <form onSubmit={handleTransferStock}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-dark)', display: 'block', marginBottom: '5px' }}>
                  Product *
                </label>
                <select
                  value={transferData.productId}
                  onChange={(e) => {
                    const selectedProduct = products.find(p => p.id === e.target.value);
                    setTransferData({
                      ...transferData,
                      productId: e.target.value,
                      fromWarehouse: selectedProduct?.warehouse || ''
                    });
                  }}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ccc',
                    borderRadius: '6px',
                    fontSize: '14px',
                    backgroundColor: 'var(--input-bg)',
                    color: 'var(--text-dark)',
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="">Select a product</option>
                  {products.map(product => (
                    <option key={product.id} value={product.id}>
                      {product.name} - {product.warehouse || 'No warehouse'} (Qty: {product.quantity})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-dark)', display: 'block', marginBottom: '5px' }}>
                  From Warehouse *
                </label>
                <input
                  type="text"
                  value={transferData.fromWarehouse}
                  disabled
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid var(--text-light)',
                    borderRadius: '6px',
                    fontSize: '14px',
                    backgroundColor: 'var(--input-disabled)',
                    color: 'var(--text-dark)',
                    boxSizing: 'border-box',
                    opacity: 0.8,
                    cursor: 'not-allowed'
                  }}
                />
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-dark)', display: 'block', marginBottom: '5px' }}>
                  To Warehouse *
                </label>
                <select
                  value={transferData.toWarehouse}
                  onChange={(e) => setTransferData({ ...transferData, toWarehouse: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ccc',
                    borderRadius: '6px',
                    fontSize: '14px',
                    backgroundColor: 'var(--input-bg)',
                    color: 'var(--text-dark)',
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="">Select destination warehouse</option>
                  {warehouses.map(warehouse => (
                    <option key={warehouse.id} value={warehouse.name}>
                      {warehouse.name} - {warehouse.location}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-dark)', display: 'block', marginBottom: '5px' }}>
                  Quantity to Transfer *
                </label>
                <input
                  type="number"
                  placeholder="e.g., 50"
                  value={transferData.quantity}
                  onChange={(e) => setTransferData({ ...transferData, quantity: e.target.value })}
                  min="1"
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ccc',
                    borderRadius: '6px',
                    fontSize: '14px',
                    backgroundColor: 'var(--input-bg)',
                    color: 'var(--text-dark)',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  style={{
                    padding: '10px 20px',
                    border: '1px solid #ccc',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    backgroundColor: 'var(--bg)',
                    color: 'var(--text-dark)',
                    fontSize: '14px'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <Send size={16} />
                  Transfer Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Warehouse Products Modal */}
      {showProductsModal && selectedWarehouse && (
        <div
          style={{
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
          }}
          onClick={() => setShowProductsModal(false)}
        >
          <div
            style={{
              backgroundColor: 'var(--card)',
              borderRadius: '12px',
              padding: '30px',
              maxWidth: '800px',
              width: '90%',
              maxHeight: '80vh',
              overflowY: 'auto',
              boxShadow: '0 10px 40px rgba(0,0,0,0.3)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-dark)' }}>
                Products in {selectedWarehouse}
              </div>
              <button
                onClick={() => setShowProductsModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-light)',
                  padding: '5px'
                }}
              >
                <X size={24} />
              </button>
            </div>

            {(() => {
              const warehouseProducts = products.filter(p => p.warehouse === selectedWarehouse);
              return warehouseProducts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-light)' }}>
                  <Package size={48} style={{ opacity: 0.3, margin: '0 auto 15px' }} />
                  <div>No products in this warehouse</div>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: 'var(--input-disabled)', borderRadius: '6px' }}>
                        <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: 'var(--text-dark)' }}>Product ID</th>
                        <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: 'var(--text-dark)' }}>Name</th>
                        <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: 'var(--text-dark)' }}>Category</th>
                        <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: 'var(--text-dark)' }}>Quantity</th>
                        <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: 'var(--text-dark)' }}>Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {warehouseProducts.map((product) => (
                        <tr key={product.id} style={{ borderBottom: '1px solid var(--text-light)' }}>
                          <td style={{ padding: '12px', fontSize: '13px', color: 'var(--text-dark)' }}>{product.productId || 'N/A'}</td>
                          <td style={{ padding: '12px', fontSize: '13px', color: 'var(--text-dark)' }}>{product.name}</td>
                          <td style={{ padding: '12px', fontSize: '13px', color: 'var(--text-light)' }}>{product.category}</td>
                          <td style={{ padding: '12px', fontSize: '13px', color: 'var(--text-dark)' }}>
                            {product.quantity}
                            {product.quantity < 5 && (
                              <span style={{ color: '#ef4444', marginLeft: '5px', fontSize: '11px' }}>⚠️ Low</span>
                            )}
                          </td>
                          <td style={{ padding: '12px', fontSize: '13px', color: 'var(--text-dark)' }}>
                            Rs. {((product.purchasePrice || 0) * (product.quantity || 0)).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={{ marginTop: '20px', padding: '15px', backgroundColor: 'var(--input-disabled)', borderRadius: '8px' }}>
                    <div style={{ fontSize: '13px', color: 'var(--text-light)', marginBottom: '8px' }}>Summary</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
                      <div>
                        <div style={{ fontSize: '11px', color: 'var(--text-light)', textTransform: 'uppercase' }}>Total Items</div>
                        <div style={{ fontSize: '20px', fontWeight: 600, color: '#3b82f6' }}>{warehouseProducts.length}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', color: 'var(--text-light)', textTransform: 'uppercase' }}>Total Quantity</div>
                        <div style={{ fontSize: '20px', fontWeight: 600, color: '#10b981' }}>
                          {warehouseProducts.reduce((sum, p) => sum + (p.quantity || 0), 0)}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', color: 'var(--text-light)', textTransform: 'uppercase' }}>Total Value</div>
                        <div style={{ fontSize: '20px', fontWeight: 600, color: '#f59e0b' }}>
                          Rs. {warehouseProducts.reduce((sum, p) => sum + ((p.purchasePrice || 0) * (p.quantity || 0)), 0).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Assign Unassigned Products Modal */}
      {showAssignModal && (
        <div
          style={{
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
          }}
          onClick={() => setShowAssignModal(false)}
        >
          <div
            style={{
              backgroundColor: 'var(--card)',
              borderRadius: '12px',
              padding: '30px',
              maxWidth: '700px',
              width: '90%',
              maxHeight: '80vh',
              overflowY: 'auto',
              boxShadow: '0 10px 40px rgba(0,0,0,0.3)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-dark)' }}>
                Assign Products to Warehouses
              </div>
              <button
                onClick={() => setShowAssignModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-light)',
                  padding: '5px'
                }}
              >
                <X size={24} />
              </button>
            </div>

            {(() => {
              const unassignedProducts = products.filter(p => !p.warehouse);
              
              if (warehouses.length === 0) {
                return (
                  <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-light)' }}>
                    <Warehouse size={48} style={{ opacity: 0.3, margin: '0 auto 15px' }} />
                    <div>No warehouses available. Create a warehouse first.</div>
                  </div>
                );
              }

              if (unassignedProducts.length === 0) {
                return (
                  <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-light)' }}>
                    <Package size={48} style={{ opacity: 0.3, margin: '0 auto 15px' }} />
                    <div>All products are assigned to warehouses! ✅</div>
                  </div>
                );
              }

              return (
                <div>
                  <div style={{ backgroundColor: '#fef3c7', color: '#92400e', padding: '12px', borderRadius: '6px', marginBottom: '20px', fontSize: '13px' }}>
                    ⚠️ Found {unassignedProducts.length} product(s) without warehouse assignment
                  </div>

                  <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                    {unassignedProducts.map((product) => (
                      <div
                        key={product.id}
                        style={{
                          backgroundColor: 'var(--input-disabled)',
                          padding: '15px',
                          borderRadius: '8px',
                          marginBottom: '12px'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '10px' }}>
                          <div>
                            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-dark)' }}>
                              {product.name}
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text-light)', marginTop: '3px' }}>
                              {product.category} • Qty: {product.quantity}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <select
                            onChange={async (e) => {
                              const warehouseName = e.target.value;
                              if (!warehouseName) return;

                              try {
                                await updateDoc(doc(db, 'products', product.id), {
                                  warehouse: warehouseName,
                                  lastUpdatedBy: auth?.currentUser?.uid || null
                                });

                                addLog('ASSIGN WAREHOUSE', `${product.name} to ${warehouseName}`, product.quantity);
                                pushNotification('Product assigned', {
                                  body: `${product.name} assigned to ${warehouseName}`
                                });
                                sendCrudNotification({
                                  title: 'Product assigned',
                                  body: `${product.name} assigned to ${warehouseName}`
                                });

                                showMessage(`✅ ${product.name} assigned to ${warehouseName}`, 'success');
                              } catch (err) {
                                console.error('Error assigning warehouse:', err);
                                showMessage('❌ Error: ' + err.message, 'error');
                              }
                            }}
                            style={{
                              flex: 1,
                              padding: '8px 12px',
                              border: '1px solid var(--text-light)',
                              borderRadius: '6px',
                              fontSize: '13px',
                              backgroundColor: 'var(--card)',
                              color: 'var(--text-dark)',
                              cursor: 'pointer'
                            }}
                          >
                            <option value="">Select warehouse...</option>
                            {warehouses.map((w) => (
                              <option key={w.id} value={w.name}>
                                {w.name} - {w.location}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => setShowAssignModal(false)}
                    style={{
                      width: '100%',
                      marginTop: '15px',
                      padding: '10px',
                      backgroundColor: 'var(--primary)',
                      color: 'var(--button-text)',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: 500
                    }}
                  >
                    Done
                  </button>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
