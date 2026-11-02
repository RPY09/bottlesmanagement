import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Users, ShoppingCart, Wallet, Receipt,
  BarChart3, Settings, LogOut, Bell, Droplets, Plus
} from 'lucide-react';
import { useState, useRef } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { OrderModal, WhatsAppModal } from '../pages/Orders';
import { CustomerModal } from '../pages/Customers';

const desktopNavItems = [
  { label: 'Dashboard', icon: LayoutDashboard, to: '/' },
  { label: 'Customers', icon: Users, to: '/customers' },
  { label: 'Orders', icon: ShoppingCart, to: '/orders' },
  { label: 'Payments', icon: Wallet, to: '/payments' },
  { label: 'Expenses', icon: Receipt, to: '/expenses' },
  { label: 'Reports', icon: BarChart3, to: '/reports' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Quick Action Modal states
  const [quickOrderOpen, setQuickOrderOpen] = useState(false);
  const [quickCustomerOpen, setQuickCustomerOpen] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [whatsappOrder, setWhatsappOrder] = useState(null);
  const [loadingData, setLoadingData] = useState(false);

  // Double-click timer for the Center Add Button
  const clickTimerRef = useRef(null);
  const [clickHint, setClickHint] = useState(false);

  const fetchQuickData = async () => {
    setLoadingData(true);
    try {
      const [cRes, pRes] = await Promise.all([api.get('/customers'), api.get('/products')]);
      setCustomers(cRes.data || []);
      setProducts(pRes.data || []);
      return { customers: cRes.data || [], products: pRes.data || [] };
    } catch {
      toast.error('Failed to load required data');
      return { customers: [], products: [] };
    } finally {
      setLoadingData(false);
    }
  };

  const openOrderModal = async () => {
    let prods = products;
    let custs = customers;
    if (!prods.length || !custs.length) {
      const res = await fetchQuickData();
      prods = res.products;
      custs = res.customers;
    }
    if (!prods.length) {
      toast.error('Please add products in Settings first');
      navigate('/settings');
      return;
    }
    setQuickOrderOpen(true);
  };

  const openCustomerModal = () => {
    setQuickCustomerOpen(true);
  };

  // Single click -> Add Order, Double click -> Add Customer
  const handleAddButtonClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (clickTimerRef.current) {
      // Second click arrived within timer! Cancel single click & run double-click action (Add Customer)
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
      toast('Opening New Customer...', { icon: '👤', id: 'quick-action-toast', duration: 1500 });
      openCustomerModal();
    } else {
      // First click: wait 280ms
      clickTimerRef.current = setTimeout(() => {
        clickTimerRef.current = null;
        toast('Opening New Order...', { icon: '📦', id: 'quick-action-toast', duration: 1500 });
        openOrderModal();
      }, 280);
    }
  };

  const handleOrderSaved = (savedOrder) => {
    setQuickOrderOpen(false);
    window.dispatchEvent(new CustomEvent('app:order-saved', { detail: savedOrder }));
    setWhatsappOrder(savedOrder);
  };

  const handleCustomerSaved = (savedCustomer) => {
    setQuickCustomerOpen(false);
    window.dispatchEvent(new CustomEvent('app:customer-saved', { detail: savedCustomer }));
    setCustomers(prev => [savedCustomer, ...prev]);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initials = user?.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'WP';

  return (
    <div className="app-layout">
      {/* ─── Desktop Sidebar (Visible only on desktop screens) ─── */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <Droplets size={20} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="sidebar-logo-text truncate">{user?.businessName || 'Water Plant'}</div>
            <div className="sidebar-logo-sub">Business Manager</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-label">Main Menu</div>
          {desktopNavItems.map(({ label, icon: Icon, to }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          {/* Click profile to open Settings */}
          <div
            className="flex items-center gap-3"
            style={{
              marginBottom: '0.75rem',
              cursor: 'pointer',
              padding: '0.45rem 0.5rem',
              borderRadius: 'var(--radius-sm)',
              transition: 'background 0.15s',
            }}
            onClick={() => navigate('/settings')}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            title="Click to view Settings & Profile"
          >
            <div className="avatar">{initials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600 }} className="truncate">{user?.name}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: 3 }}>
                <Settings size={11} /> Settings &amp; Profile
              </div>
            </div>
          </div>
          <button className="btn btn-ghost w-full" onClick={handleLogout} style={{ justifyContent: 'flex-start' }}>
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </aside>

      {/* ─── Main Viewport ─── */}
      <div className="main-wrapper">
        <header className="topbar">
          {/* Left: Mobile branding logo / Desktop greeting */}
          <div className="flex items-center gap-2">
            <div className="mobile-brand-badge" onClick={() => navigate('/')}>
              <div className="sidebar-logo-icon" style={{ width: 30, height: 30, borderRadius: 6 }}>
                <Droplets size={16} />
              </div>
              <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
                {user?.businessName || 'Water Plant'}
              </span>
            </div>
            <div className="topbar-greeting desktop-only">
              Welcome back, <strong>{user?.name?.split(' ')[0] || 'Admin'}</strong> 👋
            </div>
          </div>

          {/* Right: Expenses quick link, Notifications, Profile avatar */}
          <div className="flex items-center gap-2">
            {/* Quick access to Expenses on mobile */}
            <NavLink
              to="/expenses"
              className="topbar-quick-link"
              title="Expenses"
            >
              <Receipt size={16} />
              <span>Expenses</span>
            </NavLink>

            <button className="btn btn-ghost btn-icon" title="Notifications">
              <Bell size={18} />
            </button>

            {/* Click topbar user to open Settings */}
            <div
              className="topbar-user"
              onClick={() => navigate('/settings')}
              title="Click to view Settings & Profile"
            >
              <div className="avatar" style={{ width: 32, height: 32, fontSize: '0.75rem' }}>{initials}</div>
              <span style={{ fontSize: '0.85rem', fontWeight: 500 }} className="topbar-username">{user?.name}</span>
              <Settings size={14} style={{ color: 'var(--text-muted)' }} />
            </div>
          </div>
        </header>

        <main className="main-content">
          <Outlet />
        </main>
      </div>

      {/* ─── YouTube / Instagram Style Bottom Navigation Bar (At Bottom of Mobile) ─── */}
      <nav className="curved-bottom-nav">
        {/* Left Wing (Dashboard & Customers) */}
        <div className="nav-wing nav-wing-left">
          <NavLink to="/" end className={({ isActive }) => `curved-nav-item${isActive ? ' active' : ''}`}>
            <LayoutDashboard size={21} />
            <span>Dashboard</span>
          </NavLink>
          <NavLink to="/customers" className={({ isActive }) => `curved-nav-item${isActive ? ' active' : ''}`}>
            <Users size={21} />
            <span>Customers</span>
          </NavLink>
        </div>

        {/* Center Notch Scoop with Elevated + Action Button */}
        <div className="nav-center-notch">
          {/* Smooth SVG curved scoop cutout matching reference image */}
          <svg className="notch-svg" viewBox="0 0 92 64" width="92" height="64" preserveAspectRatio="none">
            <path
              d="M 0,0 C 18,0 22,34 46,34 C 70,34 74,0 92,0 L 92,64 L 0,64 Z"
              fill="var(--bg-card)"
            />
            <path
              d="M 0,0 C 18,0 22,34 46,34 C 70,34 74,0 92,0"
              fill="none"
              stroke="var(--border)"
              strokeWidth="1.2"
            />
            <line x1="0" y1="63.4" x2="92" y2="63.4" stroke="var(--border)" strokeWidth="1.2" />
          </svg>

          {/* Elevated Circle Add Button (Single click: Order • Double click: Customer) */}
          <div className="notch-fab-wrapper">

            <button
              type="button"
              className="notch-fab-btn"
              onClick={handleAddButtonClick}
              title="Create Order"
              aria-label="Create Order"
            >
              <Plus size={24} strokeWidth={2.8} />
            </button>
            <span style={{ fontSize: '0.62rem', fontWeight: 700, color: 'var(--palette-ocean-blue)', marginTop: '2px', whiteSpace: 'nowrap' }}>
              + Order
            </span>
          </div>
        </div>

        {/* Right Wing (Orders & Payments) */}
        <div className="nav-wing nav-wing-right">
          <NavLink to="/orders" className={({ isActive }) => `curved-nav-item${isActive ? ' active' : ''}`}>
            <ShoppingCart size={21} />
            <span>Orders</span>
          </NavLink>
          <NavLink to="/payments" className={({ isActive }) => `curved-nav-item${isActive ? ' active' : ''}`}>
            <Wallet size={21} />
            <span>Payments</span>
          </NavLink>
        </div>
      </nav>

      {/* ─── Global Quick Order Modal ─── */}
      {quickOrderOpen && (
        <OrderModal
          order={null}
          customers={customers}
          products={products}
          onClose={() => setQuickOrderOpen(false)}
          onSave={handleOrderSaved}
        />
      )}

      {/* ─── Global Quick Customer Modal ─── */}
      {quickCustomerOpen && (
        <CustomerModal
          customer={null}
          onClose={() => setQuickCustomerOpen(false)}
          onSave={handleCustomerSaved}
        />
      )}

      {/* ─── WhatsApp Confirmation Modal ─── */}
      {whatsappOrder && (
        <WhatsAppModal
          order={whatsappOrder}
          upiId={user?.upiId}
          businessName={user?.businessName}
          onClose={() => setWhatsappOrder(null)}
        />
      )}
    </div>
  );
}
