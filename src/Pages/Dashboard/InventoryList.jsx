import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../Components/DashboardLayout';
import { collection, onSnapshot, query, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { addLog } from '../../lib/firebase-logs';
import { addProductIdsToExistingProducts } from '../../lib/update-product-ids';

export default function InventoryList() {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

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
    } catch (err) {
      console.error('Delete error:', err);
      alert('Error deleting product: ' + err.message);
    }
  };

  const exportToCSV = () => {
    if (filteredProducts.length === 0) {
      alert('No products to export');
      return;
    }

    const headers = ['Product ID', 'Name', 'Category', 'Quantity', 'Purchase Price', 'Selling Price'];
    let csv = headers.join(',') + '\n';

    filteredProducts.forEach((p) => {
      const line = [
        `"${(p.productId || '').replace(/"/g, '""')}"`,
        `"${(p.category || '').replace(/"/g, '""')}"`,
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
    const headers = ['ID', 'Name', 'Category', 'Qty', 'Buy Price', 'Sell Price'];
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

      <div
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          backgroundColor: 'var(--card)',
          boxShadow: '0 4px 10px rgba(0,0,0,0.08)',
          borderRadius: '8px',
          overflow: 'hidden'
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
                <td colSpan="7" style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
                  Loading products...
                </td>
              </tr>
            ) : filteredProducts.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
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
                    <td style={{ padding: '12px', borderBottom: '1px solid #e5e7eb', fontSize: '14px' }}>
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
    </DashboardLayout>
  );
}
