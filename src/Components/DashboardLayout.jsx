import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../Contexts/AuthContext';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import ThemeToggle from './ui/ThemeToggle';
import { LayoutDashboard, PlusCircle, Package, FileText, Warehouse } from 'lucide-react';

export default function DashboardLayout({ children }) {
  const { currentUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const isActive = (path) => location.pathname === path;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg)' }}>
      {/* Sidebar */}
      <div
        style={{
          width: '230px',
          backgroundColor: 'var(--sidebar)',
          color: '#fff',
          height: '100vh',
          position: 'fixed',
          padding: '25px 15px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}
      >
        <div
          style={{
            fontSize: '22px',
            fontWeight: 600,
            marginBottom: '25px',
            textAlign: 'center'
          }}
        >
          SMARTSTOCK
        </div>

        <Link
          to="/dashboard"
          className="nav-link"
          style={{
            padding: '12px',
            borderRadius: '8px',
            color: isActive('/dashboard') ? '#fff' : '#d1d5db',
            textDecoration: 'none',
            fontSize: '15px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            transition: '0.2s',
            backgroundColor: isActive('/dashboard') ? 'rgba(255,255,255,0.12)' : 'transparent'
          }}
          onMouseEnter={(e) => {
            if (!isActive('/dashboard')) {
              e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.12)';
              e.currentTarget.style.color = '#fff';
              e.currentTarget.style.transform = 'translateX(3px)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isActive('/dashboard')) {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#d1d5db';
              e.currentTarget.style.transform = 'translateX(0)';
            }
          }}
        >
          <LayoutDashboard size={18} />
          Dashboard
        </Link>

        <Link
          to="/dashboard/add-product"
          className="nav-link"
          style={{
            padding: '12px',
            borderRadius: '8px',
            color: isActive('/dashboard/add-product') ? '#fff' : '#d1d5db',
            textDecoration: 'none',
            fontSize: '15px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            transition: '0.2s',
            backgroundColor: isActive('/dashboard/add-product') ? 'rgba(255,255,255,0.12)' : 'transparent'
          }}
          onMouseEnter={(e) => {
            if (!isActive('/dashboard/add-product')) {
              e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.12)';
              e.currentTarget.style.color = '#fff';
              e.currentTarget.style.transform = 'translateX(3px)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isActive('/dashboard/add-product')) {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#d1d5db';
              e.currentTarget.style.transform = 'translateX(0)';
            }
          }}
        >
          <PlusCircle size={18} />
          Add Product
        </Link>

        <Link
          to="/dashboard/inventory"
          className="nav-link"
          style={{
            padding: '12px',
            borderRadius: '8px',
            color: isActive('/dashboard/inventory') ? '#fff' : '#d1d5db',
            textDecoration: 'none',
            fontSize: '15px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            transition: '0.2s',
            backgroundColor: isActive('/dashboard/inventory') ? 'rgba(255,255,255,0.12)' : 'transparent'
          }}
          onMouseEnter={(e) => {
            if (!isActive('/dashboard/inventory')) {
              e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.12)';
              e.currentTarget.style.color = '#fff';
              e.currentTarget.style.transform = 'translateX(3px)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isActive('/dashboard/inventory')) {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#d1d5db';
              e.currentTarget.style.transform = 'translateX(0)';
            }
          }}
        >
          <Package size={18} />
          Inventory List
        </Link>

        <Link
          to="/dashboard/warehouses"
          className="nav-link"
          style={{
            padding: '12px',
            borderRadius: '8px',
            color: isActive('/dashboard/warehouses') ? '#fff' : '#d1d5db',
            textDecoration: 'none',
            fontSize: '15px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            transition: '0.2s',
            backgroundColor: isActive('/dashboard/warehouses') ? 'rgba(255,255,255,0.12)' : 'transparent'
          }}
          onMouseEnter={(e) => {
            if (!isActive('/dashboard/warehouses')) {
              e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.12)';
              e.currentTarget.style.color = '#fff';
              e.currentTarget.style.transform = 'translateX(3px)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isActive('/dashboard/warehouses')) {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#d1d5db';
              e.currentTarget.style.transform = 'translateX(0)';
            }
          }}
        >
          <Warehouse size={18} />
          Warehouses
        </Link>

        <Link
          to="/dashboard/logs"
          className="nav-link"
          style={{
            padding: '12px',
            borderRadius: '8px',
            color: isActive('/dashboard/logs') ? '#fff' : '#d1d5db',
            textDecoration: 'none',
            fontSize: '15px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            transition: '0.2s',
            backgroundColor: isActive('/dashboard/logs') ? 'rgba(255,255,255,0.12)' : 'transparent'
          }}
          onMouseEnter={(e) => {
            if (!isActive('/dashboard/logs')) {
              e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.12)';
              e.currentTarget.style.color = '#fff';
              e.currentTarget.style.transform = 'translateX(3px)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isActive('/dashboard/logs')) {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#d1d5db';
              e.currentTarget.style.transform = 'translateX(0)';
            }
          }}
        >
          <FileText size={18} />
          Activity Logs
        </Link>

        {/* User info and logout */}
        <div
          style={{
            marginTop: 'auto',
            padding: '15px',
            borderTop: '1px solid rgba(255,255,255,0.1)',
            fontSize: '14px',
            color: '#d1d5db'
          }}
        >
          <div>{currentUser?.email || 'Loading...'}</div>
          <div
            style={{
              display: 'flex',
              gap: '8px',
              flexDirection: 'column',
              marginTop: '8px'
            }}
          >
            <div style={{ width: '100%' }}>
              <ThemeToggle
                id="themeToggleBtn"
                style={{
                  color: '#d1d5db',
                  padding: '5px 0',
                  fontSize: '14px',
                  textAlign: 'left',
                  width: '100%',
                  justifyContent: 'flex-start'
                }}
              />
            </div>
            <button
              onClick={handleLogout}
              style={{
                background: 'none',
                border: 'none',
                color: '#d1d5db',
                padding: '5px 0',
                cursor: 'pointer',
                fontSize: '14px',
                textAlign: 'left',
                width: '100%'
              }}
              onMouseEnter={(e) => {
                e.target.style.color = '#fff';
              }}
              onMouseLeave={(e) => {
                e.target.style.color = '#d1d5db';
              }}
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div
        style={{
          marginLeft: '230px',
          padding: '30px',
          width: '100%'
        }}
      >
        {children}
      </div>
    </div>
  );
}
