import React, { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '../../Components/DashboardLayout';
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../../lib/firebase';

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Number(value || 0));

const asDate = (timestampValue) => (timestampValue?.toDate ? timestampValue.toDate() : null);

const extractItems = (sale) => {
  if (Array.isArray(sale.items) && sale.items.length > 0) {
    return sale.items;
  }

  // Backward compatibility for older single-item sale documents.
  return [
    {
      productName: sale.productName || 'Product',
      productId: sale.productId || sale.productDocId || '-',
      quantitySold: Number(sale.quantitySold || 0),
      unitPrice: Number(sale.unitPrice || 0),
      salePrice: Number(sale.salePrice || 0)
    }
  ];
};

export default function SalesHistory() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [productFilter, setProductFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    if (!db) {
      setLoading(false);
      return;
    }

    const salesQuery = query(collection(db, 'sales'), orderBy('timestamp', 'desc'), limit(300));
    const unsubscribe = onSnapshot(
      salesQuery,
      (snapshot) => {
        const records = [];
        snapshot.forEach((saleDoc) => {
          records.push({ id: saleDoc.id, ...saleDoc.data() });
        });
        setSales(records);
        setLoading(false);
      },
      (error) => {
        console.error('Error loading sales history:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const filteredSales = useMemo(() => {
    const productKeyword = productFilter.trim().toLowerCase();

    const startBoundary = startDate ? new Date(`${startDate}T00:00:00`) : null;
    const endBoundary = endDate ? new Date(`${endDate}T23:59:59.999`) : null;

    return sales.filter((sale) => {
      const saleDate = asDate(sale.timestamp);
      if (!saleDate) return false;

      if (startBoundary && saleDate < startBoundary) {
        return false;
      }

      if (endBoundary && saleDate > endBoundary) {
        return false;
      }

      if (!productKeyword) {
        return true;
      }

      const items = extractItems(sale);
      return items.some((item) => {
        const text = `${item.productName || ''} ${item.productId || ''}`.toLowerCase();
        return text.includes(productKeyword);
      });
    });
  }, [sales, productFilter, startDate, endDate]);

  const summary = useMemo(() => {
    return filteredSales.reduce(
      (acc, sale) => {
        const items = extractItems(sale);
        const saleTotal = Number(sale.salePrice || items.reduce((sum, item) => sum + Number(item.salePrice || 0), 0));
        const quantityTotal = items.reduce((sum, item) => sum + Number(item.quantitySold || 0), 0);

        return {
          totalSalesAmount: acc.totalSalesAmount + saleTotal,
          totalTransactions: acc.totalTransactions + 1,
          totalUnitsSold: acc.totalUnitsSold + quantityTotal
        };
      },
      {
        totalSalesAmount: 0,
        totalTransactions: 0,
        totalUnitsSold: 0
      }
    );
  }, [filteredSales]);

  return (
    <DashboardLayout>
      <div style={{ fontSize: '22px', fontWeight: 600, color: 'var(--text-dark)', marginBottom: '20px' }}>
        Sales History
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px',
          marginBottom: '16px'
        }}
      >
        <div style={{ background: 'var(--card)', padding: '14px', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Total Sales</div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-dark)' }}>
            {formatCurrency(summary.totalSalesAmount)}
          </div>
        </div>
        <div style={{ background: 'var(--card)', padding: '14px', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Transactions</div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-dark)' }}>{summary.totalTransactions}</div>
        </div>
        <div style={{ background: 'var(--card)', padding: '14px', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Units Sold</div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-dark)' }}>{summary.totalUnitsSold}</div>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr 1fr',
          gap: '10px',
          marginBottom: '16px'
        }}
      >
        <input
          type="text"
          value={productFilter}
          onChange={(event) => setProductFilter(event.target.value)}
          placeholder="Filter by product name or product ID"
          style={{
            padding: '10px',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            background: 'var(--card)',
            color: 'var(--text-dark)'
          }}
        />
        <input
          type="date"
          value={startDate}
          onChange={(event) => setStartDate(event.target.value)}
          style={{
            padding: '10px',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            background: 'var(--card)',
            color: 'var(--text-dark)'
          }}
        />
        <input
          type="date"
          value={endDate}
          onChange={(event) => setEndDate(event.target.value)}
          style={{
            padding: '10px',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            background: 'var(--card)',
            color: 'var(--text-dark)'
          }}
        />
      </div>

      <div
        style={{
          backgroundColor: 'var(--card)',
          boxShadow: '0 4px 10px rgba(0,0,0,0.08)',
          borderRadius: '10px',
          overflow: 'hidden'
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#eef2ff' }}>
              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e2e8f0', fontSize: '13px' }}>Date</th>
              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e2e8f0', fontSize: '13px' }}>Products</th>
              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e2e8f0', fontSize: '13px' }}>Quantity</th>
              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e2e8f0', fontSize: '13px' }}>Total</th>
              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e2e8f0', fontSize: '13px' }}>Cashier</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="5" style={{ padding: '18px', textAlign: 'center', color: '#64748b' }}>
                  Loading sales history...
                </td>
              </tr>
            ) : filteredSales.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ padding: '18px', textAlign: 'center', color: '#64748b' }}>
                  No sales found for the selected filters.
                </td>
              </tr>
            ) : (
              filteredSales.map((sale) => {
                const items = extractItems(sale);
                const saleDate = asDate(sale.timestamp);
                const totalQuantity = items.reduce((sum, item) => sum + Number(item.quantitySold || 0), 0);
                const saleTotal = Number(sale.salePrice || items.reduce((sum, item) => sum + Number(item.salePrice || 0), 0));

                return (
                  <tr key={sale.id}>
                    <td style={{ padding: '12px', borderBottom: '1px solid #e2e8f0', fontSize: '13px' }}>
                      {saleDate ? saleDate.toLocaleString() : '--'}
                    </td>
                    <td style={{ padding: '12px', borderBottom: '1px solid #e2e8f0', fontSize: '13px' }}>
                      {items.slice(0, 3).map((item, index) => (
                        <div key={`${sale.id}-item-${index}`} style={{ marginBottom: '2px' }}>
                          {item.productName || '-'} ({item.productId || '-'}) x{Number(item.quantitySold || 0)}
                        </div>
                      ))}
                      {items.length > 3 && (
                        <div style={{ color: '#64748b' }}>+{items.length - 3} more item(s)</div>
                      )}
                    </td>
                    <td style={{ padding: '12px', borderBottom: '1px solid #e2e8f0', fontSize: '13px' }}>{totalQuantity}</td>
                    <td style={{ padding: '12px', borderBottom: '1px solid #e2e8f0', fontSize: '13px', fontWeight: 600 }}>
                      {formatCurrency(saleTotal)}
                    </td>
                    <td style={{ padding: '12px', borderBottom: '1px solid #e2e8f0', fontSize: '13px' }}>
                      {sale.soldByEmail || '--'}
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
