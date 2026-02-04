import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../Components/DashboardLayout';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../../lib/firebase';

export default function ActivityLogs() {
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [userFilter, setUserFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db) {
      setLoading(false);
      return;
    }

    const logsQuery = query(collection(db, 'logs'), orderBy('timestamp', 'desc'), limit(100));
    const unsubscribe = onSnapshot(
      logsQuery,
      (snapshot) => {
        const logsData = [];
        const usersSet = new Set();

        snapshot.forEach((doc) => {
          const data = doc.data();
          logsData.push(data);
          if (data.user) usersSet.add(data.user);
        });

        setLogs(logsData);
        setUsers(Array.from(usersSet).sort());
        setLoading(false);
      },
      (error) => {
        console.error('Error loading logs:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    let filtered = logs;

    if (userFilter) {
      filtered = filtered.filter((l) => l.user === userFilter);
    }

    if (actionFilter) {
      filtered = filtered.filter((l) => l.action === actionFilter);
    }

    setFilteredLogs(filtered);
  }, [logs, userFilter, actionFilter]);

  const getFilteredLogs = () => {
    return filteredLogs;
  };

  const exportToCSV = () => {
    const rows = getFilteredLogs();
    if (rows.length === 0) {
      alert('No logs to export');
      return;
    }

    const headers = ['Time', 'User', 'Action', 'Product', 'Quantity'];
    let csv = headers.join(',') + '\n';

    rows.forEach((l) => {
      const time = l.timestamp?.toDate().toLocaleString() || '';
      const line = [
        `"${time.replace(/"/g, '""')}"`,
        `"${(l.user || '').replace(/"/g, '""')}"`,
        `"${(l.action || '').replace(/"/g, '""')}"`,
        `"${(l.productName || '').replace(/"/g, '""')}"`,
        l.quantity ?? ''
      ].join(',');
      csv += line + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    const date = new Date().toISOString().slice(0, 10);
    link.download = `Logs_Report_${date}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const exportToPDF = () => {
    const rows = getFilteredLogs();
    if (!rows || rows.length === 0) {
      alert('No logs to export');
      return;
    }
    if (typeof window.jspdf === 'undefined' || typeof window.jspdf.jsPDF !== 'function') {
      alert('PDF library not available');
      return;
    }

    try {
      const pdf = new window.jspdf.jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const cols = ['Time', 'User', 'Action', 'Product', 'Quantity'];
      const colCount = cols.length;
      const colWidth = (pageWidth - margin * 2) / colCount;
      let y = 20;
      pdf.setFontSize(12);
      pdf.text('SMARTSTOCK - Activity Logs', pageWidth / 2, 12, { align: 'center' });
      pdf.setFontSize(10);
      cols.forEach((h, i) => pdf.text(String(h), margin + i * colWidth + 2, y));
      y += 6;
      pdf.setFontSize(9);

      rows.forEach((r) => {
        const time = r.timestamp ? r.timestamp.toDate().toLocaleString() : '';
        const cells = [time, r.user || '', r.action || '', r.productName || '', String(r.quantity ?? '')];
        const cellLines = cells.map((c) => pdf.splitTextToSize(String(c), colWidth - 4));
        const maxLines = Math.max(...cellLines.map((arr) => arr.length));
        if (y + maxLines * 5 > pageHeight - margin) {
          pdf.addPage();
          y = 20;
        }

        for (let li = 0; li < maxLines; li++) {
          // eslint-disable-next-line no-loop-func
          cellLines.forEach((lines, ci) => {
            const text = lines[li] || '';
            pdf.text(text, margin + ci * colWidth + 2, y + li * 5);
          });
        }
        y += maxLines * 5;
      });

      const date = new Date().toISOString().slice(0, 10);
      pdf.save(`Activity_Logs_${date}.pdf`);
    } catch (err) {
      console.error('Logs PDF export failed:', err);
      alert('PDF export failed.');
    }
  };

  return (
    <DashboardLayout>
      <div style={{ fontSize: '22px', fontWeight: 'bold', color: 'var(--text-dark)', marginBottom: '20px' }}>
        Activity Logs
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <select
          value={userFilter}
          onChange={(e) => setUserFilter(e.target.value)}
          style={{
            padding: '8px',
            border: '1px solid #ccc',
            borderRadius: '6px',
            backgroundColor: 'var(--card)',
            color: 'var(--text-dark)'
          }}
        >
          <option value="">All Users</option>
          {users.map((user) => (
            <option key={user} value={user}>
              {user}
            </option>
          ))}
        </select>
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          style={{
            padding: '8px',
            border: '1px solid #ccc',
            borderRadius: '6px',
            backgroundColor: 'var(--card)',
            color: 'var(--text-dark)'
          }}
        >
          <option value="">All Actions</option>
          <option value="ADD PRODUCT">ADD PRODUCT</option>
          <option value="DELETE PRODUCT">DELETE PRODUCT</option>
          <option value="STOCK ADJUST">STOCK ADJUST</option>
          <option value="UPDATE PRODUCT">UPDATE PRODUCT</option>
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
          Export Logs Excel
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
                Time
              </th>
              <th style={{ padding: '12px', borderBottom: '1px solid #e5e7eb', textAlign: 'left', fontSize: '14px', fontWeight: 'bold', color: '#111' }}>
                User
              </th>
              <th style={{ padding: '12px', borderBottom: '1px solid #e5e7eb', textAlign: 'left', fontSize: '14px', fontWeight: 'bold', color: '#111' }}>
                Action
              </th>
              <th style={{ padding: '12px', borderBottom: '1px solid #e5e7eb', textAlign: 'left', fontSize: '14px', fontWeight: 'bold', color: '#111' }}>
                Product
              </th>
              <th style={{ padding: '12px', borderBottom: '1px solid #e5e7eb', textAlign: 'left', fontSize: '14px', fontWeight: 'bold', color: '#111' }}>
                Quantity
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="5" style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
                  Loading logs...
                </td>
              </tr>
            ) : filteredLogs.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
                  No logs found
                </td>
              </tr>
            ) : (
              filteredLogs.map((log, index) => {
                const time = log.timestamp?.toDate().toLocaleString() || '--';
                return (
                  <tr key={index}>
                    <td style={{ padding: '12px', borderBottom: '1px solid #e5e7eb', fontSize: '14px' }}>
                      {time}
                    </td>
                    <td style={{ padding: '12px', borderBottom: '1px solid #e5e7eb', fontSize: '14px' }}>
                      {log.user || ''}
                    </td>
                    <td style={{ padding: '12px', borderBottom: '1px solid #e5e7eb', fontSize: '14px' }}>
                      {log.action || ''}
                    </td>
                    <td style={{ padding: '12px', borderBottom: '1px solid #e5e7eb', fontSize: '14px' }}>
                      {log.productName || ''}
                    </td>
                    <td style={{ padding: '12px', borderBottom: '1px solid #e5e7eb', fontSize: '14px' }}>
                      {log.quantity ?? 0}
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
