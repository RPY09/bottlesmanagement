import { useState, useRef, useEffect, useCallback } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import {
  LayoutDashboard,
  Users,
  ShoppingCart,Milk,
  Wallet,
  Receipt,
  BarChart3,
  Settings,
  LogOut,
  Bell,
  Droplets,
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  UserPlus,
  PackagePlus,
  Sparkles,
} from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { OrderModal, WhatsAppModal } from '../pages/Orders';
import { CustomerModal } from '../pages/Customers';
import '../styles/navigation.css';
import logo from '../assets/logo.png';

/* ─── Navigation Route Definitions ─── */
const mainNavItems = [
  { label: 'Dashboard', icon: LayoutDashboard, to: '/' },
  { label: 'Customers', icon: Users, to: '/customers' },
  { label: 'Orders', icon: Milk , to: '/orders' },
  { label: 'Payments', icon: Wallet, to: '/payments' },
  { label: 'Expenses', icon: Receipt, to: '/expenses' },
  { label: 'Reports', icon: BarChart3, to: '/reports' },
  { label: 'Products & Prices', icon: PackagePlus, to: '/products-prices' },
];
const bottomNavPaths = ['/', '/customers', '/orders', '/expenses'];

/* Configurable threshold for double-tap detection (ms) */
const DOUBLE_TAP_THRESHOLD = 300;

export default function Layout() {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [location.pathname, location.search]);

  // Desktop sidebar collapse state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Quick Action Modal states
  const [quickOrderOpen, setQuickOrderOpen] = useState(false);
  const [quickCustomerOpen, setQuickCustomerOpen] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [whatsappOrder, setWhatsappOrder] = useState(null);

  // Central Plus Button & Action Menu states
  const clickTimerRef = useRef(null);
  const [fabRotation, setFabRotation] = useState(0);
  const [speedDialOpen, setSpeedDialOpen] = useState(false);

  // Global Command Palette & Notifications & Mobile Drawer
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState('');
  const [notifOpen, setNotifOpen] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // Lazy-load customers & products for quick modals
  const fetchQuickData = useCallback(async () => {
    try {
      const [cRes, pRes] = await Promise.all([api.get('/customers'), api.get('/products')]);
      const custs = cRes.data || [];
      const prods = pRes.data || [];
      setCustomers(custs);
      setProducts(prods);
      return { customers: custs, products: prods };
    } catch {
      toast.error('Failed to load required data');
      return { customers: [], products: [] };
    }
  }, []);

  const openOrderModal = useCallback(async () => {
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
  }, [customers, products, fetchQuickData, navigate]);

  const openCustomerModal = useCallback(() => {
    setQuickCustomerOpen(true);
  }, []);

  /* ─── Central Plus Button Double-Click Handler ─── */
  const handleFabClick = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (clickTimerRef.current) {
      // Second click arrived within DOUBLE_TAP_THRESHOLD!
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
      setFabRotation(180);
      setTimeout(() => setFabRotation(0), 400);
      toast('Opening New Customer...', { icon: '👤', id: 'quick-action', duration: 1500 });
      openCustomerModal();
    } else {
      // First click: start timer
      setFabRotation(90);
      clickTimerRef.current = setTimeout(() => {
        clickTimerRef.current = null;
        setFabRotation(0);
        toast('Opening New Order...', { icon: '📦', id: 'quick-action', duration: 1500 });
        openOrderModal();
      }, DOUBLE_TAP_THRESHOLD);
    }
  };

  // Keyboard shortcut listener (Ctrl+K or Cmd+K for Command Palette, Esc to close)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setPaletteOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setPaletteOpen(false);
        setSpeedDialOpen(false);
        setNotifOpen(false);
        setMobileDrawerOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
    };
  }, []);

  // Time of day greeting (pure lazy state initialization)
  const [timeOfDay] = useState(() => {
    const hr = new Date().getHours();
    return hr < 12 ? 'morning' : hr < 17 ? 'afternoon' : 'evening';
  });

  // Contextual Heading Generator
  const getPageMeta = () => {
    const path = location.pathname;
    if (path === '/') {
      const firstName = user?.name ? user.name.split(' ')[0] : 'Admin';
      return {
        title: `${t(`Good ${timeOfDay}`)}, ${firstName}`,
        subtitle: user?.businessName ? `${user.businessName} · ${t('Business Overview')}` : t('Business Overview'),
      };
    }
    if (path.startsWith('/customers')) {
      return {
        title: t('Customer Management'),
        subtitle: 'Directory, addresses & balance accounts',
      };
    }
    if (path.startsWith('/orders')) {
      return {
        title: t('Order Management'),
        subtitle: 'Sales orders, fulfillment & invoices',
      };
    }
    if (path.startsWith('/payments')) {
      return {
        title: t('Payment Transactions'),
        subtitle: 'Payment history, modes & collections',
      };
    }
    if (path.startsWith('/expenses')) {
      return {
        title: t('Expense Management'),
        subtitle: 'Operating costs, logs & expenditures',
      };
    }
    if (path.startsWith('/reports')) {
      return {
        title: t('Business Reports'),
        subtitle: 'Analytics, revenue charts & summaries',
      };
    }
    if (path.startsWith('/products-prices')) {
      return {
        title: 'Products & Prices',
        subtitle: 'Product catalogue, case sizes & selling rates',
      };
    }
    if (path.startsWith('/reminders')) {
      return {
        title: t('Payment Reminders'),
        subtitle: 'Automated & WhatsApp follow-ups',
      };
    }
    if (path.startsWith('/settings')) {
      return {
        title: t('Settings & Profile'),
        subtitle: 'Business configuration & product catalogue',
      };
    }
    return {
      title: 'Hydro Business Manager',
      subtitle: 'Water Plant Operations',
    };
  };
  const pageMeta = getPageMeta();

  const userName = user?.name || '';
  const initials = userName
    ? userName.trim().split(/\s+/).map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'HB';

  const handleOrderSaved = (savedOrder) => {
    setQuickOrderOpen(false);
    window.dispatchEvent(new CustomEvent('app:order-saved', { detail: savedOrder }));
    setWhatsappOrder(savedOrder);
  };

  const handleCustomerSaved = (savedCustomer) => {
    setQuickCustomerOpen(false);
    window.dispatchEvent(new CustomEvent('app:customer-saved', { detail: savedCustomer }));
    setCustomers((prev) => [savedCustomer, ...prev]);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Command palette navigation items
  const paletteItems = [
    { label: 'Create New Order', category: 'Action', icon: PackagePlus, action: () => { setPaletteOpen(false); openOrderModal(); } },
    { label: 'Add New Customer', category: 'Action', icon: UserPlus, action: () => { setPaletteOpen(false); openCustomerModal(); } },
    { label: 'Dashboard', category: 'Navigation', icon: LayoutDashboard, action: () => { setPaletteOpen(false); navigate('/'); } },
    { label: 'Customers', category: 'Navigation', icon: Users, action: () => { setPaletteOpen(false); navigate('/customers'); } },
    { label: 'Orders', category: 'Navigation', icon: ShoppingCart, action: () => { setPaletteOpen(false); navigate('/orders'); } },
    { label: 'Payments', category: 'Navigation', icon: Wallet, action: () => { setPaletteOpen(false); navigate('/payments'); } },
    { label: 'Expenses', category: 'Navigation', icon: Receipt, action: () => { setPaletteOpen(false); navigate('/expenses'); } },
    { label: 'Reports', category: 'Navigation', icon: BarChart3, action: () => { setPaletteOpen(false); navigate('/reports'); } },
    { label: 'Products & Prices', category: 'Navigation', icon: PackagePlus, action: () => { setPaletteOpen(false); navigate('/products-prices'); } },
    { label: 'Settings & Profile', category: 'Navigation', icon: Settings, action: () => { setPaletteOpen(false); navigate('/settings'); } },
  ].filter((item) => item.label.toLowerCase().includes(paletteQuery.toLowerCase()));

  return (
    <div className={`hbm-layout${sidebarCollapsed ? ' sidebar-collapsed' : ''}`}>
      {/* ══════════════════════════════════════════════════════
         1. DESKTOP SIDEBAR
         ══════════════════════════════════════════════════════ */}
      <aside className="hbm-sidebar" aria-label="Main Navigation">
        {/* Brand Header */}
        <div className="hbm-sidebar-brand">
          <NavLink to="/" className="hbm-brand-link" title="Hydro Business Manager">
            <div className="hbm-brand-icon">
              <img src={logo} alt="" className="hbm-brand-logo" />
            </div>
            <div className="hbm-brand-text">
              <span className="hbm-brand-title">
                {user?.businessName || 'Hydro'}
              </span>
              <span className="hbm-brand-sub">Business Manager</span>
            </div>
          </NavLink>

          <button
            type="button"
            className="hbm-sidebar-toggle-btn"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label="Toggle sidebar"
          >
            {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Main Menu Links */}
        <nav className="hbm-sidebar-nav">
          <div className="hbm-nav-section-title">Main Menu</div>
          {mainNavItems.map(({ label, icon: Icon, to }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => `hbm-nav-item${isActive ? ' active' : ''}`}
              title={label}
            >
              <Icon size={19} />
              <span>{t(label)}</span>
            </NavLink>
          ))}
        </nav>

        {/* Bottom Section: Profile & Sign Out */}
        <div className="hbm-sidebar-footer">
          <div
            className="hbm-sidebar-user-card"
            onClick={() => navigate('/settings')}
            title="Settings & Profile"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && navigate('/settings')}
          >
            <div className="hbm-user-avatar">{initials}</div>
            <div className="hbm-sidebar-user-info">
              <div className="hbm-sidebar-username">{user?.name || 'Admin'}</div>
              <div className="hbm-sidebar-usersub">
                <Settings size={12} /> {t('Settings & Profile')}
              </div>
            </div>
          </div>

          <button
            type="button"
            className="hbm-sidebar-signout-btn"
            onClick={handleLogout}
            title="Sign Out"
          >
            <LogOut size={16} />
            <span className="hbm-signout-text">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* ══════════════════════════════════════════════════════
         2. MAIN VIEWPORT & 72PX TOP HEADER
         ══════════════════════════════════════════════════════ */}
      <div className="hbm-main-wrapper">
        <header className="hbm-topbar">
          {/* Left: Contextual Page Heading or Mobile Brand */}
          <div className="hbm-topbar-left">
            {/* Desktop Contextual Heading */}
            <div className="hbm-topbar-heading-wrap">
              <h1 className="hbm-topbar-title">{pageMeta.title}</h1>
              <p className="hbm-topbar-subtitle">{pageMeta.subtitle}</p>
            </div>

            {/* Mobile Brand Logo */}
            <NavLink to="/" className="hbm-topbar-mobile-brand" title="Home">
              <div className="hbm-mobile-logo-icon">
                <img src={logo} alt="" className="hbm-mobile-logo" />
              </div>
              <span className="hbm-mobile-logo-text">
                {user?.businessName || 'Hydro'}
              </span>
            </NavLink>
          </div>

          {/* Right: Global Search, Notifications, Avatar, Shortcuts */}
          <div className="hbm-topbar-right">
            {/* Global Search Button */}
            <button
              type="button"
              className="hbm-topbar-search-btn"
              onClick={() => setPaletteOpen(true)}
              title="Search anything (Ctrl+K)"
              aria-label="Global search"
            >
              <Search size={16} />
              <span className="hbm-search-label">{t('Search anything...')}</span>
              <kbd className="hbm-search-kbd">⌘K</kbd>
            </button>

            {/* Notifications Button */}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                className="hbm-topbar-icon-btn"
                onClick={() => setNotifOpen(!notifOpen)}
                title="Notifications"
                aria-label="Notifications"
              >
                <Bell size={18} />
                <span className="hbm-notif-dot" />
              </button>

              {/* Notifications Dropdown */}
              {notifOpen && (
                <>
                  <div
                    style={{ position: 'fixed', inset: 0, zIndex: 90 }}
                    onClick={() => setNotifOpen(false)}
                  />
                  <div className="hbm-notif-menu">
                    <div className="hbm-notif-header">
                      <span>Notifications</span>
                      <Sparkles size={14} color="var(--palette-ocean-blue)" />
                    </div>
                    <div className="hbm-notif-list">
                      <div
                        className="hbm-notif-item"
                        onClick={() => {
                          setNotifOpen(false);
                          navigate('/orders?status=unpaid');
                        }}
                      >
                        <div style={{ fontWeight: 700, color: 'var(--palette-deep-navy)' }}>Pending Collections</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          Check unpaid orders to record incoming payments.
                        </div>
                      </div>
                      <div
                        className="hbm-notif-item"
                        onClick={() => {
                          setNotifOpen(false);
                          navigate('/reminders');
                        }}
                      >
                        <div style={{ fontWeight: 700, color: 'var(--palette-deep-navy)' }}>WhatsApp Reminders</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          Send 1-click reminders to customers with dues.
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Settings Shortcut (Desktop) */}
            <button
              type="button"
              className="hbm-topbar-icon-btn hbm-topbar-settings-shortcut"
              onClick={() => navigate('/settings')}
              title="Settings"
              aria-label="Settings"
            >
              <Settings size={18} />
            </button>

            {/* User Profile Pill */}
            <div
              className="hbm-topbar-user"
              onClick={() => navigate('/settings')}
              title="View Profile & Settings"
            >
              <div className="hbm-user-avatar" style={{ width: 36, height: 36, fontSize: '0.8rem' }}>
                {initials}
              </div>
              <span className="hbm-topbar-username">
                {user?.name?.split(' ')[0] || 'Admin'}
              </span>
            </div>

            {/* Mobile Secondary Menu Button (Opens Drawer for Expenses, Reports, etc.) */}
            <button
              type="button"
              className="hbm-mobile-menu-btn"
              onClick={() => setMobileDrawerOpen(true)}
              title="More Menu"
              aria-label="Open navigation menu"
            >
              <Menu size={20} />
            </button>
          </div>
        </header>

        {/* Content Outlet */}
        <main className="hbm-content">
          <Outlet />
        </main>
      </div>

      {/* ══════════════════════════════════════════════════════
         3. MOBILE FLOATING BOTTOM NAVIGATION (Reference 3)
         ══════════════════════════════════════════════════════ */}
      <div className="hbm-bottom-nav-container">
        <nav className="hbm-bottom-nav" aria-label="Mobile Bottom Navigation">
          {/* 1. Dashboard */}
          <NavLink
            to="/"
            end
            className={({ isActive }) => `hbm-bottom-item${isActive ? ' active' : ''}`}
            title="Dashboard"
          >
            <span className="hbm-bottom-active-indicator" />
            <div className="hbm-bottom-icon">
              <LayoutDashboard />
            </div>
            <span className="hbm-bottom-label">{t('Dashboard')}</span>
          </NavLink>

          {/* 2. Customers */}
          <NavLink
            to="/customers"
            className={({ isActive }) => `hbm-bottom-item${isActive ? ' active' : ''}`}
            title="Customers"
          >
            <span className="hbm-bottom-active-indicator" />
            <div className="hbm-bottom-icon">
              <Users />
            </div>
            <span className="hbm-bottom-label">{t('Customers')}</span>
          </NavLink>

          {/* 3. Central Floating Plus Button */}
          <div className="hbm-fab-slot">
            <button
              type="button"
              className={`hbm-fab-btn ${fabRotation === 90 ? 'rot-90' : fabRotation === 180 ? 'rot-180' : ''}`}
              onClick={handleFabClick}
              onContextMenu={(e) => {
                e.preventDefault();
                setSpeedDialOpen(true);
              }}
              title="Single tap: New Order · Double tap: New Customer · Long press: Options"
              aria-label="Create Order or Customer"
            >
              <div className="hbm-fab-icon">
                <Plus size={28} strokeWidth={2.8} />
              </div>
            </button>
            <span
              className="hbm-fab-label"
              onClick={() => setSpeedDialOpen(true)}
              style={{ cursor: 'pointer', pointerEvents: 'auto' }}
            >
              + Create
            </span>
          </div>

          {/* 4. Orders */}
          <NavLink
            to="/orders"
            className={({ isActive }) => `hbm-bottom-item${isActive ? ' active' : ''}`}
            title="Orders"
          >
            <span className="hbm-bottom-active-indicator" />
            <div className="hbm-bottom-icon">
              <Milk />
            </div>
            <span className="hbm-bottom-label">{t('Orders')}</span>
          </NavLink>

          {/* 5. Expenses */}
          <NavLink
            to="/expenses"
            className={({ isActive }) => `hbm-bottom-item${isActive ? ' active' : ''}`}
            title="Expenses"
          >
            <span className="hbm-bottom-active-indicator" />
            <div className="hbm-bottom-icon">
              <Receipt />
            </div>
            <span className="hbm-bottom-label">{t('Expenses')}</span>
          </NavLink>
        </nav>
      </div>

      {/* ══════════════════════════════════════════════════════
         4. ACCESSIBLE SPEED DIAL / QUICK ACTION SHEET
         ══════════════════════════════════════════════════════ */}
      {speedDialOpen && (
        <div
          className="hbm-speeddial-overlay"
          onClick={() => setSpeedDialOpen(false)}
        >
          <div
            className="hbm-speeddial-menu"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="hbm-speeddial-header">
              <span>Quick Create Actions</span>
              <button
                type="button"
                onClick={() => setSpeedDialOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>

            <button
              type="button"
              className="hbm-speeddial-item"
              onClick={() => {
                setSpeedDialOpen(false);
                openOrderModal();
              }}
            >
              <div className="hbm-speeddial-icon blue">
                <PackagePlus size={20} />
              </div>
              <div className="hbm-speeddial-text">
                <span className="hbm-speeddial-title">Create New Order</span>
                <span className="hbm-speeddial-sub">Single tap primary shortcut</span>
              </div>
            </button>

            <button
              type="button"
              className="hbm-speeddial-item"
              onClick={() => {
                setSpeedDialOpen(false);
                openCustomerModal();
              }}
            >
              <div className="hbm-speeddial-icon green">
                <UserPlus size={20} />
              </div>
              <div className="hbm-speeddial-text">
                <span className="hbm-speeddial-title">Add New Customer</span>
                <span className="hbm-speeddial-sub">Double tap shortcut</span>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
         5. MOBILE SECONDARY DRAWER (Expenses, Reports, More)
         ══════════════════════════════════════════════════════ */}
      {mobileDrawerOpen && (
        <div
          className="hbm-drawer-overlay"
          onClick={() => setMobileDrawerOpen(false)}
        >
          <div
            className="hbm-drawer"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="hbm-drawer-header">
              <span className="hbm-drawer-title">{t('Navigation Menu')}</span>
              <button
                type="button"
                className="hbm-drawer-close-btn"
                onClick={() => setMobileDrawerOpen(false)}
                aria-label="Close menu"
              >
                <X size={18} />
              </button>
            </div>

            <div className="hbm-drawer-content">
              {/* User Box */}
              <div className="hbm-drawer-user-box">
                <div className="hbm-user-avatar">{initials}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }} className="truncate">
                    {user?.name || 'Admin'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--palette-ocean-blue)' }}>
                    {user?.businessName || 'Hydro Business'}
                  </div>
                </div>
              </div>

              {/* Navigation Links */}
              {mainNavItems.filter(({ to }) => !bottomNavPaths.includes(to)).map(({ label, icon: Icon, to }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  className={({ isActive }) => `hbm-drawer-item${isActive ? ' active' : ''}`}
                  onClick={() => setMobileDrawerOpen(false)}
                >
                  <Icon size={18} />
                  <span>{t(label)}</span>
                </NavLink>
              ))}

              <NavLink
                to="/settings"
                className={({ isActive }) => `hbm-drawer-item${isActive ? ' active' : ''}`}
                onClick={() => setMobileDrawerOpen(false)}
              >
                <Settings size={18} />
                <span>{t('Settings & Profile')}</span>
              </NavLink>
            </div>

            <div className="hbm-drawer-footer">
              <button
                type="button"
                className="hbm-sidebar-signout-btn"
                onClick={() => {
                  setMobileDrawerOpen(false);
                  handleLogout();
                }}
              >
                <LogOut size={16} />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
         6. GLOBAL COMMAND PALETTE (Ctrl+K / Cmd+K)
         ══════════════════════════════════════════════════════ */}
      {paletteOpen && (
        <div
          className="hbm-palette-overlay"
          onClick={() => setPaletteOpen(false)}
        >
          <div
            className="hbm-palette"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="hbm-palette-search-bar">
              <Search size={18} color="var(--palette-ocean-blue)" />
              <input
                className="hbm-palette-input"
                placeholder="Search actions or navigate anywhere..."
                value={paletteQuery}
                onChange={(e) => setPaletteQuery(e.target.value)}
                autoFocus
              />
              <button
                type="button"
                onClick={() => setPaletteOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="hbm-palette-results">
              {paletteItems.map((item, idx) => {
                const ItemIcon = item.icon;
                return (
                  <button
                    key={idx}
                    type="button"
                    className="hbm-palette-item"
                    onClick={item.action}
                  >
                    <div className="hbm-palette-item-left">
                      <ItemIcon size={17} />
                      <span>{item.label}</span>
                    </div>
                    <span className="hbm-palette-category">{item.category}</span>
                  </button>
                );
              })}

              {!paletteItems.length && (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  No results found for &quot;{paletteQuery}&quot;
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
         7. GLOBAL MODALS (Order, Customer, WhatsApp)
         ══════════════════════════════════════════════════════ */}
      {quickOrderOpen && (
        <OrderModal
          order={null}
          customers={customers}
          products={products}
          onClose={() => setQuickOrderOpen(false)}
          onSave={handleOrderSaved}
        />
      )}

      {quickCustomerOpen && (
        <CustomerModal
          customer={null}
          onClose={() => setQuickCustomerOpen(false)}
          onSave={handleCustomerSaved}
        />
      )}

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
