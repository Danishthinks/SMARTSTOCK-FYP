import React, { useState, useEffect, useMemo } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { useAuth } from '../../Contexts/AuthContext';
import { useTheme } from '../../Components/ThemeContext';
import { db } from '../../lib/firebase';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import DashboardLayout from '../../Components/DashboardLayout';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, PointElement, LineElement, Title, Tooltip, Legend);

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value || 0);

export default function Dashboard() {
  const { currentUser } = useAuth();
  const { theme } = useTheme();
  const [totalProducts, setTotalProducts] = useState(0);
  const [lowStock, setLowStock] = useState(0);
  const [warehouses, setWarehouses] = useState(0);
  const [predictedRestocks, setPredictedRestocks] = useState(0);
  const [totalValueCost, setTotalValueCost] = useState(0);
  const [totalValueRetail, setTotalValueRetail] = useState(0);
  const [grossMarginPct, setGrossMarginPct] = useState(0);
  const [recentLogs, setRecentLogs] = useState([]);
  const [categoryChart, setCategoryChart] = useState(null);
  const [warehouseChart, setWarehouseChart] = useState(null);
  const [activityChart, setActivityChart] = useState(null);
  const [categoryValueChart, setCategoryValueChart] = useState(null);
  const [warehouseValueChart, setWarehouseValueChart] = useState(null);
  const [actionStackChart, setActionStackChart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const palette = ['#4f46e5', '#22c55e', '#f97316', '#0ea5e9', '#e11d48', '#a855f7', '#14b8a6', '#f59e0b'];
  const actionColors = {
    'ADD PRODUCT': '#22c55e',
    'UPDATE PRODUCT': '#0ea5e9',
    'DELETE PRODUCT': '#e11d48',
    'STOCK ADJUST': '#f59e0b',
    'TRANSFER STOCK': '#8b5cf6',
    OTHER: '#6b7280'
  };

  const chartTheme = useMemo(() => {
    if (theme === 'dark') {
      return {
        text: '#e6eef8',
        card: '#181a1f',
        grid: 'rgba(230,238,248,0.25)',
        border: 'rgba(230,238,248,0.35)'
      };
    }
    return {
      text: '#111827',
      card: '#ffffff',
      grid: 'rgba(17,24,39,0.12)',
      border: 'rgba(17,24,39,0.16)'
    };
  }, [theme]);

  useEffect(() => {
    // Ensure Chart.js globals follow the active theme so tick labels stay readable
    ChartJS.defaults.color = chartTheme.text;
    ChartJS.defaults.borderColor = chartTheme.grid;
    ChartJS.defaults.font.family = "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    ChartJS.defaults.font.weight = 600;
    ChartJS.defaults.font.size = 12;
  }, [chartTheme]);

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
          const categoryTotals = new Map();
          const warehouseTotals = new Map();
          const categoryValueTotals = new Map();
          const warehouseValueTotals = new Map();
          let valueCost = 0;
          let valueRetail = 0;

          snapshot.forEach((doc) => {
            const data = doc.data();
            if (data && data.quantity != null && data.quantity < 5) {
              lowCount++;
              restockCount++;
            }
            // Collect unique warehouses
            if (data && data.warehouse) {
              warehousesSet.add(data.warehouse);
              warehouseTotals.set(
                data.warehouse,
                (warehouseTotals.get(data.warehouse) || 0) + (data.quantity || 0)
              );
              const costValue = (data.quantity || 0) * (data.purchasePrice || 0);
              warehouseValueTotals.set(
                data.warehouse,
                (warehouseValueTotals.get(data.warehouse) || 0) + costValue
              );
            }

            if (data && data.category) {
              categoryTotals.set(
                data.category,
                (categoryTotals.get(data.category) || 0) + (data.quantity || 0)
              );
              const costValue = (data.quantity || 0) * (data.purchasePrice || 0);
              categoryValueTotals.set(
                data.category,
                (categoryValueTotals.get(data.category) || 0) + costValue
              );
            }

            const qty = data?.quantity || 0;
            const cost = data?.purchasePrice || 0;
            const retail = data?.sellingPrice || 0;
            valueCost += qty * cost;
            valueRetail += qty * retail;
          });
          
          setLowStock(lowCount);
          setWarehouses(warehousesSet.size);
          setPredictedRestocks(restockCount);
          setTotalValueCost(valueCost);
          setTotalValueRetail(valueRetail);
          setGrossMarginPct(valueRetail > 0 ? Math.max(0, ((valueRetail - valueCost) / valueRetail) * 100) : 0);

          const categoryLabels = Array.from(categoryTotals.keys());
          const categoryValues = Array.from(categoryTotals.values());
          setCategoryChart({
            labels: categoryLabels,
            datasets: [
              {
                label: 'Units by Category',
                data: categoryValues,
                backgroundColor: categoryLabels.map((_, i) => palette[i % palette.length]),
                borderRadius: 6
              }
            ]
          });

          const warehouseLabels = Array.from(warehouseTotals.keys());
          const warehouseValues = Array.from(warehouseTotals.values());
          setWarehouseChart({
            labels: warehouseLabels,
            datasets: [
              {
                label: 'Units by Warehouse',
                data: warehouseValues,
                backgroundColor: warehouseLabels.map((_, i) => palette[(i + 2) % palette.length]),
                borderWidth: 0
              }
            ]
          });

          const categoryValueLabels = Array.from(categoryValueTotals.keys());
          const categoryValueValues = Array.from(categoryValueTotals.values());
          setCategoryValueChart({
            labels: categoryValueLabels,
            datasets: [
              {
                label: 'Inventory Value (Cost)',
                data: categoryValueValues,
                backgroundColor: categoryValueLabels.map((_, i) => palette[(i + 1) % palette.length]),
                borderWidth: 0
              }
            ]
          });

          const warehouseValueLabels = Array.from(warehouseValueTotals.keys());
          const warehouseValueValues = Array.from(warehouseValueTotals.values());
          setWarehouseValueChart({
            labels: warehouseValueLabels,
            datasets: [
              {
                label: 'Inventory Value (Cost)',
                data: warehouseValueValues,
                backgroundColor: warehouseValueLabels.map((_, i) => palette[(i + 3) % palette.length]),
                borderRadius: 6
              }
            ]
          });
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
        limit(30)
      );

      const unsubscribe = onSnapshot(logsQuery, (snapshot) => {
        const logs = [];
        const activityMap = new Map();
        const actionDailyMap = new Map();
        snapshot.forEach((doc) => {
          const log = doc.data();
          const ts = log.timestamp?.toDate ? log.timestamp.toDate() : null;
          if (!ts) return; // skip records without a timestamp

          const dateKey = ts.toISOString().slice(0, 10);
          activityMap.set(dateKey, (activityMap.get(dateKey) || 0) + 1);

          const actionKey = (log.action || 'OTHER').toUpperCase();
          const normalizedAction = actionColors[actionKey] ? actionKey : 'OTHER';
          const mapKey = `${dateKey}:${normalizedAction}`;
          actionDailyMap.set(mapKey, (actionDailyMap.get(mapKey) || 0) + 1);

          logs.push({
            id: doc.id,
            ...log,
            timestamp: ts
          });
        });
        setRecentLogs(logs);

        // Build 14-day activity trend
        const days = Array.from({ length: 14 }).map((_, idx) => {
          const d = new Date();
          d.setDate(d.getDate() - (13 - idx));
          return d.toISOString().slice(0, 10);
        });

        setActivityChart({
          labels: days,
          datasets: [
            {
              label: 'Actions per Day',
              data: days.map((day) => activityMap.get(day) || 0),
              borderColor: '#4f46e5',
              backgroundColor: 'rgba(79,70,229,0.12)',
              tension: 0.35,
              fill: true,
              pointRadius: 4,
              pointBackgroundColor: '#4f46e5'
            }
          ]
        });

        const actionKeys = ['ADD PRODUCT', 'UPDATE PRODUCT', 'DELETE PRODUCT', 'STOCK ADJUST', 'TRANSFER STOCK', 'OTHER'];
        const actionDatasets = actionKeys.map((action) => ({
          label: action,
          data: days.map((day) => actionDailyMap.get(`${day}:${action}`) || 0),
          backgroundColor: actionColors[action],
          borderColor: actionColors[action],
          borderWidth: 1
        }));

        setActionStackChart({
          labels: days,
          datasets: actionDatasets
        });
      });

      return () => unsubscribe();
    } catch (e) {
      console.error('Logs error:', e);
    }
  }, [currentUser]);

  const baseChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: { color: chartTheme.text, boxWidth: 12 }
      },
      tooltip: {
        backgroundColor: chartTheme.card,
        titleColor: chartTheme.text,
        bodyColor: chartTheme.text,
        borderColor: chartTheme.border,
        borderWidth: 1
      }
    },
    scales: {
      x: {
        ticks: { color: chartTheme.text, font: { weight: 700, size: 13 } },
        grid: { color: chartTheme.grid },
        title: { display: false, color: chartTheme.text }
      },
      y: {
        ticks: { color: chartTheme.text, precision: 0, font: { weight: 700, size: 13 } },
        grid: { color: chartTheme.grid },
        title: { display: false, color: chartTheme.text }
      }
    }
  };

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

        {/* Charts: Inventory & Warehouse distribution */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '20px',
            marginTop: '10px'
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--card)',
              borderRadius: '12px',
              boxShadow: '0 3px 10px rgba(0,0,0,0.06)',
              padding: '16px',
              minHeight: '320px'
            }}
          >
            <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-dark)', marginBottom: '8px' }}>
              Inventory by Category
            </div>
            {categoryChart && categoryChart.labels.length > 0 ? (
              <div style={{ height: '260px' }}>
                <Bar
                  key={`cat-${theme}`}
                  data={categoryChart}
                  options={{
                    ...baseChartOptions,
                    scales: {
                      ...baseChartOptions.scales,
                      y: { ...baseChartOptions.scales.y, beginAtZero: true }
                    },
                    plugins: {
                      ...baseChartOptions.plugins,
                      legend: { ...baseChartOptions.plugins.legend, labels: { color: chartTheme.text, boxWidth: 12, font: { weight: 700, size: 13 } } }
                    }
                  }}
                />
              </div>
            ) : (
              <div style={{ color: 'var(--text-light)', padding: '20px' }}>No category data yet</div>
            )}
          </div>

          <div
            style={{
              backgroundColor: 'var(--card)',
              borderRadius: '12px',
              boxShadow: '0 3px 10px rgba(0,0,0,0.06)',
              padding: '16px',
              minHeight: '320px'
            }}
          >
            <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-dark)', marginBottom: '8px' }}>
              Stock Distribution by Warehouse
            </div>
            {warehouseChart && warehouseChart.labels.length > 0 ? (
              <div style={{ height: '260px' }}>
                <Doughnut
                  key={`wh-${theme}`}
                  data={warehouseChart}
                  options={{
                    ...baseChartOptions,
                    plugins: {
                      ...baseChartOptions.plugins,
                      legend: {
                        position: 'bottom',
                        labels: { color: chartTheme.text, boxWidth: 14, font: { weight: 700, size: 13 } }
                      }
                    }
                  }}
                />
              </div>
            ) : (
              <div style={{ color: 'var(--text-light)', padding: '20px' }}>No warehouse data yet</div>
            )}
          </div>

          <div
            style={{
              backgroundColor: 'var(--card)',
              borderRadius: '12px',
              boxShadow: '0 3px 10px rgba(0,0,0,0.06)',
              padding: '16px',
              minHeight: '320px'
            }}
          >
            <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-dark)', marginBottom: '8px' }}>
              Activity (Last 7 Days)
            </div>
            {activityChart && activityChart.labels.length > 0 ? (
              <div style={{ height: '260px' }}>
                <Line
                  key={`act-${theme}`}
                  data={activityChart}
                  options={{
                    ...baseChartOptions,
                    plugins: { ...baseChartOptions.plugins, legend: { display: false } },
                    scales: {
                      x: { ...baseChartOptions.scales.x, grid: { display: false } },
                      y: { ...baseChartOptions.scales.y, beginAtZero: true, suggestedMax: Math.max(...activityChart.datasets[0].data, 3) }
                    }
                  }}
                />
              </div>
            ) : (
              <div style={{ color: 'var(--text-light)', padding: '20px' }}>No activity data yet</div>
            )}
          </div>
        </div>

        {/* Value & Operations Analytics */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '20px',
            marginTop: '20px'
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--card)',
              borderRadius: '12px',
              boxShadow: '0 3px 10px rgba(0,0,0,0.06)',
              padding: '16px',
              minHeight: '320px'
            }}
          >
            <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-dark)', marginBottom: '8px' }}>
              Value by Category (Cost)
            </div>
            {categoryValueChart && categoryValueChart.labels.length > 0 ? (
              <div style={{ height: '260px' }}>
                <Doughnut
                  key={`catval-${theme}`}
                  data={categoryValueChart}
                  options={{
                    ...baseChartOptions,
                    plugins: {
                      ...baseChartOptions.plugins,
                      legend: {
                        position: 'bottom',
                        labels: { color: chartTheme.text, boxWidth: 14, font: { weight: 700, size: 13 } }
                      },
                      tooltip: {
                        ...baseChartOptions.plugins.tooltip,
                        callbacks: {
                          label: (ctx) => `${ctx.label}: ${formatCurrency(ctx.parsed)}`
                        }
                      }
                    }
                  }}
                />
              </div>
            ) : (
              <div style={{ color: 'var(--text-light)', padding: '20px' }}>No value data yet</div>
            )}
          </div>

          <div
            style={{
              backgroundColor: 'var(--card)',
              borderRadius: '12px',
              boxShadow: '0 3px 10px rgba(0,0,0,0.06)',
              padding: '16px',
              minHeight: '320px'
            }}
          >
            <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-dark)', marginBottom: '8px' }}>
              Warehouse Value (Cost)
            </div>
            {warehouseValueChart && warehouseValueChart.labels.length > 0 ? (
              <div style={{ height: '260px' }}>
                <Bar
                  key={`whval-${theme}`}
                  data={warehouseValueChart}
                  options={{
                    ...baseChartOptions,
                    indexAxis: 'y',
                    scales: {
                      ...baseChartOptions.scales,
                      x: { ...baseChartOptions.scales.x, ticks: { ...baseChartOptions.scales.x.ticks, callback: (v) => formatCurrency(v) } },
                      y: { ...baseChartOptions.scales.y }
                    },
                    plugins: {
                      ...baseChartOptions.plugins,
                      tooltip: {
                        ...baseChartOptions.plugins.tooltip,
                        callbacks: {
                          label: (ctx) => `${ctx.dataset.label}: ${formatCurrency(ctx.parsed.x)}`
                        }
                      }
                    }
                  }}
                />
              </div>
            ) : (
              <div style={{ color: 'var(--text-light)', padding: '20px' }}>No warehouse value data yet</div>
            )}
          </div>

          <div
            style={{
              backgroundColor: 'var(--card)',
              borderRadius: '12px',
              boxShadow: '0 3px 10px rgba(0,0,0,0.06)',
              padding: '16px',
              minHeight: '320px'
            }}
          >
            <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-dark)', marginBottom: '8px' }}>
              Activity Mix by Action (7d)
            </div>
            {actionStackChart && actionStackChart.datasets && actionStackChart.datasets.length > 0 ? (
              <div style={{ height: '260px' }}>
                <Bar
                  key={`actstack-${theme}`}
                  data={actionStackChart}
                  options={{
                    ...baseChartOptions,
                    plugins: {
                      ...baseChartOptions.plugins,
                      legend: { position: 'bottom', labels: { color: chartTheme.text, boxWidth: 12, font: { weight: 700, size: 12 } } }
                    },
                    scales: {
                      x: { ...baseChartOptions.scales.x, stacked: true, grid: { display: false } },
                      y: { ...baseChartOptions.scales.y, stacked: true, beginAtZero: true, suggestedMax: Math.max(...actionStackChart.datasets.flatMap((d) => d.data), 3) }
                    }
                  }}
                />
              </div>
            ) : (
              <div style={{ color: 'var(--text-light)', padding: '20px' }}>No activity mix data yet</div>
            )}
          </div>
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
