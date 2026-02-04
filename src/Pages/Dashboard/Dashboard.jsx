import React, { useState, useEffect } from 'react';
import { useAuth } from '../../Contexts/AuthContext';
import { db } from '../../lib/firebase';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import DashboardLayout from '../../Components/DashboardLayout';

export default function Dashboard() {
  const { currentUser } = useAuth();
  const [totalProducts, setTotalProducts] = useState(0);
  const [lowStock, setLowStock] = useState(0);
  const [warehouses, setWarehouses] = useState(0);
  const [predictedRestocks, setPredictedRestocks] = useState(0);
  const [recentLogs, setRecentLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!currentUser) return;

    // Fetch products stats
    try {
      const productsQuery = collection(db, 'products');
      const unsubscribe = onSnapshot(
        productsQuery,
        (snapshot) => {
          setLoading(false);
          setError(false);
          setTotalProducts(snapshot.size);

          let lowCount = 0;
          let warehousesSet = new Set();
          let restockCount = 0;

          snapshot.forEach((doc) => {
            const data = doc.data();
            if (data && data.quantity != null && data.quantity < 5) {
              lowCount++;
              restockCount++;
            }
            // Collect unique warehouses
            if (data && data.warehouse) {
              warehousesSet.add(data.warehouse);
            }
          });
          
          setLowStock(lowCount);
          setWarehouses(warehousesSet.size);
          setPredictedRestocks(restockCount);
        },
        (err) => {
          console.error('Snapshot error:', err);
          setError(true);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (e) {
      console.error('Stats error:', e);
      setError(true);
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;

    // Fetch recent logs
    try {
      const logsQuery = query(
        collection(db, 'logs'),
        orderBy('timestamp', 'desc'),
        limit(5)
      );

      const unsubscribe = onSnapshot(logsQuery, (snapshot) => {
        const logs = [];
        snapshot.forEach((doc) => {
          const log = doc.data();
          logs.push({
            id: doc.id,
            ...log,
            timestamp: log.timestamp?.toDate() || new Date()
          });
        });
        setRecentLogs(logs);
      });

      return () => unsubscribe();
    } catch (e) {
      console.error('Logs error:', e);
    }
  }, [currentUser]);

  return (
    <DashboardLayout>
        <div
          style={{
            fontSize: '24px',
            fontWeight: 600,
            color: 'var(--text-dark)',
            marginBottom: '20px'
          }}
        >
          Dashboard Overview
        </div>

        {/* Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '20px',
            marginBottom: '30px'
          }}
        >
          {/* Total Products */}
          <div
            className="card"
            style={{
              backgroundColor: 'var(--card)',
              borderRadius: '12px',
              padding: '20px',
              boxShadow: '0 3px 10px rgba(0,0,0,0.06)',
              transition: '0.2s',
              border: error ? '1px solid #fee2e2' : 'none',
              cursor: 'default'
            }}
            onMouseEnter={(e) => {
              if (!error) {
                e.currentTarget.style.transform = 'translateY(-3px)';
                e.currentTarget.style.boxShadow = '0 6px 18px rgba(0,0,0,0.1)';
              }
            }}
            onMouseLeave={(e) => {
              if (!error) {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 3px 10px rgba(0,0,0,0.06)';
              }
            }}
          >
            <div
              style={{
                fontSize: '14px',
                color: 'var(--text-light)',
                marginBottom: '6px'
              }}
            >
              Total Products
            </div>
            <div
              style={{
                fontSize: '32px',
                fontWeight: 700,
                color: error ? '#b00020' : 'var(--primary)'
              }}
            >
              {loading ? 'Loading...' : error ? 'Error' : totalProducts}
            </div>
          </div>

          {/* Low Stock */}
          <div
            className="card"
            style={{
              backgroundColor: 'var(--card)',
              borderRadius: '12px',
              padding: '20px',
              boxShadow: '0 3px 10px rgba(0,0,0,0.06)',
              transition: '0.2s',
              border: error ? '1px solid #fee2e2' : 'none',
              cursor: 'default'
            }}
            onMouseEnter={(e) => {
              if (!error) {
                e.currentTarget.style.transform = 'translateY(-3px)';
                e.currentTarget.style.boxShadow = '0 6px 18px rgba(0,0,0,0.1)';
              }
            }}
            onMouseLeave={(e) => {
              if (!error) {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 3px 10px rgba(0,0,0,0.06)';
              }
            }}
          >
            <div
              style={{
                fontSize: '14px',
                color: 'var(--text-light)',
                marginBottom: '6px'
              }}
            >
              Low Stock Items
            </div>
            <div
              style={{
                fontSize: '32px',
                fontWeight: 700,
                color: error ? '#b00020' : 'var(--primary)'
              }}
            >
              {loading ? 'Loading...' : error ? 'Error' : lowStock}
            </div>
          </div>

          {/* Warehouses */}
          <div
            className="card"
            style={{
              backgroundColor: 'var(--card)',
              borderRadius: '12px',
              padding: '20px',
              boxShadow: '0 3px 10px rgba(0,0,0,0.06)',
              transition: '0.2s',
              cursor: 'default'
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
            <div
              style={{
                fontSize: '14px',
                color: 'var(--text-light)',
                marginBottom: '6px'
              }}
            >
              Warehouses
            </div>
            <div
              style={{
                fontSize: '32px',
                fontWeight: 700,
                color: 'var(--primary)'
              }}
            >
              {loading ? 'Loading...' : error ? 'Error' : warehouses}
            </div>
          </div>

          {/* Predicted Restocks */}
          <div
            className="card"
            style={{
              backgroundColor: 'var(--card)',
              borderRadius: '12px',
              padding: '20px',
              boxShadow: '0 3px 10px rgba(0,0,0,0.06)',
              transition: '0.2s',
              cursor: 'default'
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
            <div
              style={{
                fontSize: '14px',
                color: 'var(--text-light)',
                marginBottom: '6px'
              }}
            >
              Predicted Restocks
            </div>
            <div
              style={{
                fontSize: '32px',
                fontWeight: 700,
                color: 'var(--primary)'
              }}
            >
              {loading ? 'Loading...' : error ? 'Error' : predictedRestocks}
            </div>
          </div>
        </div>

        {/* Chart Placeholder */}
        <div
          style={{
            marginTop: '30px',
            backgroundColor: 'var(--card)',
            height: '320px',
            borderRadius: '12px',
            boxShadow: '0 3px 10px rgba(0,0,0,0.06)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            color: 'var(--text-light)',
            fontSize: '16px',
            fontWeight: 500
          }}
        >
          Analytics dashboard coming soon
        </div>

        {/* Recent Activity Logs */}
        <div
          style={{
            backgroundColor: 'var(--card)',
            marginTop: '25px',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}
        >
          <h3
            style={{
              marginBottom: '15px',
              fontSize: '18px',
              color: 'var(--text-dark)'
            }}
          >
            Recent Activity
          </h3>
          <ul
            style={{
              listStyle: 'none',
              padding: 0,
              fontSize: '14px',
              color: 'var(--text-dark)'
            }}
          >
            {recentLogs.length === 0 ? (
              <li style={{ marginBottom: '8px', color: 'var(--text-light)' }}>
                No recent activity
              </li>
            ) : (
              recentLogs.map((log) => (
                <li key={log.id} style={{ marginBottom: '8px' }}>
                  <strong>{log.action}</strong> - {log.productName} ({log.quantity})
                  <br />
                  <small style={{ color: 'var(--text-light)' }}>
                    {log.user} • {log.timestamp.toLocaleTimeString()}
                  </small>
                </li>
              ))
            )}
          </ul>
        </div>
    </DashboardLayout>
  );
}
