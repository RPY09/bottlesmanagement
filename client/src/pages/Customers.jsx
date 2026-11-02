import { useEffect, useState, useRef, useCallback } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import { useAuth } from '../context/AuthContext';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Plus, Search, Edit2, Trash2, Phone, MapPin, User,
  Image, X, MessageCircle, IndianRupee, Package, Clock,
  Navigation, Crosshair, Check, Copy, ExternalLink,
  ChevronDown, ChevronUp, TrendingUp, CheckCircle2, AlertCircle,
  Calendar, CreditCard, Sparkles, ChevronRight
} from 'lucide-react';

/* ─── Interactive Map Location Picker (Leaflet + OpenStreetMap) ─── */
function MapLocationPicker({ initialAddress, onSelect, onClose }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const [selectedAddress, setSelectedAddress] = useState(initialAddress || '');
  const [loadingAddress, setLoadingAddress] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Default: Center of India (20.5937, 78.9629) or initial position
    const defaultCenter = [20.5937, 78.9629];
    const defaultZoom = 5;

    const map = L.map(mapContainerRef.current, {
      zoomControl: true,
    }).setView(defaultCenter, defaultZoom);
    mapInstanceRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    const customPinIcon = L.divIcon({
      className: 'custom-map-pin',
      html: `<div style="transform: translate(-50%, -100%); cursor: grab;">
        <svg width="34" height="42" viewBox="0 0 24 24" fill="#0277B6" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0 3px 6px rgba(0,0,0,0.35));">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
          <circle cx="12" cy="10" r="3" fill="#FFFFFF"></circle>
        </svg>
      </div>`,
      iconSize: [0, 0],
    });

    const marker = L.marker(defaultCenter, {
      icon: customPinIcon,
      draggable: true,
    }).addTo(map);
    markerRef.current = marker;

    const reverseGeocode = async (lat, lng) => {
      setLoadingAddress(true);
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`, {
          headers: { 'Accept-Language': 'en' },
        });
        const data = await res.json();
        if (data && data.display_name) {
          setSelectedAddress(data.display_name);
        } else {
          setSelectedAddress(`Location: ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        }
      } catch {
        setSelectedAddress(`Location: ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
      } finally {
        setLoadingAddress(false);
      }
    };

    map.on('click', (e) => {
      const { lat, lng } = e.latlng;
      marker.setLatLng([lat, lng]);
      reverseGeocode(lat, lng);
    });

    marker.on('dragend', () => {
      const pos = marker.getLatLng();
      reverseGeocode(pos.lat, pos.lng);
    });

    // Check if initialAddress exists to zoom in
    if (initialAddress && initialAddress.trim().length > 3) {
      fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(initialAddress)}&format=json&limit=1&countrycodes=in`, {
        headers: { 'Accept-Language': 'en' },
      })
        .then(r => r.json())
        .then(data => {
          if (data && data.length > 0) {
            const lat = parseFloat(data[0].lat);
            const lon = parseFloat(data[0].lon);
            map.setView([lat, lon], 16);
            marker.setLatLng([lat, lon]);
            setSelectedAddress(data[0].display_name);
          }
        })
        .catch(() => {});
    } else if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          map.setView([lat, lng], 15);
          marker.setLatLng([lat, lng]);
          reverseGeocode(lat, lng);
        },
        () => {},
        { timeout: 6000 }
      );
    }

    setTimeout(() => {
      map.invalidateSize();
    }, 250);

    return () => {
      map.remove();
    };
  }, []);

  const handleSearchPlace = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=1&countrycodes=in`, {
        headers: { 'Accept-Language': 'en' },
      });
      const data = await res.json();
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        if (mapInstanceRef.current && markerRef.current) {
          mapInstanceRef.current.setView([lat, lon], 16);
          markerRef.current.setLatLng([lat, lon]);
          setSelectedAddress(data[0].display_name);
        }
      } else {
        toast.error('Location not found. Click anywhere on the map to pin manually.');
      }
    } catch {
      toast.error('Search failed');
    } finally {
      setSearching(false);
    }
  };

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        if (mapInstanceRef.current && markerRef.current) {
          mapInstanceRef.current.setView([lat, lng], 16);
          markerRef.current.setLatLng([lat, lng]);
          setLoadingAddress(true);
          fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`, {
            headers: { 'Accept-Language': 'en' },
          })
            .then(r => r.json())
            .then(data => {
              if (data?.display_name) setSelectedAddress(data.display_name);
            })
            .catch(() => {})
            .finally(() => setLoadingAddress(false));
        }
      },
      () => toast.error('Could not detect current location. Please grant permission or click on the map.'),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleConfirm = () => {
    if (!selectedAddress) {
      toast.error('Please click on the map to select a location first');
      return;
    }
    onSelect(selectedAddress);
    onClose();
    toast.success('Address selected from map!');
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1100 }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg" style={{ maxWidth: 760, padding: '1.25rem' }}>
        <div className="modal-header" style={{ marginBottom: '1rem' }}>
          <div>
            <span className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <MapPin size={20} style={{ color: 'var(--accent-blue)' }} /> Select Location on Map
            </span>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              Click anywhere on the map or drag the pin to pinpoint the exact customer address
            </div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>

        {/* Search inside Map + Locate Me Button */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <form onSubmit={handleSearchPlace} style={{ display: 'flex', flex: 1, gap: '0.5rem' }}>
            <div className="search-input-wrapper" style={{ flex: 1 }}>
              <Search size={15} />
              <input
                className="form-input search-input"
                placeholder="Search area, road, or city..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-outline btn-sm" disabled={searching}>
              {searching ? 'Searching...' : 'Search'}
            </button>
          </form>
          <button type="button" className="btn btn-outline btn-sm" onClick={handleLocateMe} title="Zoom to my current location">
            <Crosshair size={15} /> My Location
          </button>
        </div>

        {/* Map Container */}
        <div
          ref={mapContainerRef}
          style={{
            height: '380px',
            width: '100%',
            borderRadius: 'var(--radius)',
            border: '1px solid var(--border)',
            overflow: 'hidden',
          }}
        />

        {/* Real-time Address Display Box */}
        <div style={{
          marginTop: '0.75rem',
          padding: '0.75rem 1rem',
          background: 'var(--bg-secondary)',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
        }}>
          <MapPin size={18} style={{ color: 'var(--accent-blue)', flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Selected Location
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }} className="truncate">
              {loadingAddress ? 'Fetching address details...' : (selectedAddress || 'Click anywhere on the map to set location')}
            </div>
          </div>
        </div>

        <div className="modal-footer" style={{ marginTop: '1rem', paddingTop: '0.75rem' }}>
          <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleConfirm}
            disabled={!selectedAddress || loadingAddress}
          >
            <Check size={16} /> Confirm Address
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Address Autocomplete (with Open Map Button & Fallback) ─── */
function AddressAutocomplete({ value, onChange, onOpenMap }) {
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [searched, setSearched] = useState(false);
  const timer = useRef(null);
  const wrapRef = useRef();

  const fetchSuggestions = useCallback(async (q) => {
    if (q.length < 3) { setSuggestions([]); setSearched(false); return; }
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&addressdetails=1&limit=5&countrycodes=in`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data = await res.json();
      setSuggestions(data || []);
      setSearched(true);
      setOpen(true);
    } catch {
      setSearched(true);
    }
  }, []);

  const handleChange = (e) => {
    const val = e.target.value;
    onChange(val);
    clearTimeout(timer.current);
    if (!val || val.length < 3) {
      setOpen(false);
      setSuggestions([]);
      setSearched(false);
      return;
    }
    timer.current = setTimeout(() => fetchSuggestions(val), 400);
  };

  const pick = (place) => {
    onChange(place.display_name);
    setSuggestions([]);
    setOpen(false);
  };

  useEffect(() => {
    const handler = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="address-autocomplete-wrapper">
      <div ref={wrapRef} style={{ position: 'relative', flex: 1 }}>
        <input
          className="form-input"
          placeholder="Start typing address or landmark..."
          value={value}
          onChange={handleChange}
          onFocus={() => (suggestions.length > 0 || (searched && value.length >= 3)) && setOpen(true)}
          autoComplete="off"
        />

        {open && (
          <div style={{
            position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 999,
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 8, boxShadow: 'var(--shadow-md)', overflow: 'hidden',
            marginTop: 4,
          }}>
            {suggestions.map((s) => (
              <div
                key={s.place_id}
                onMouseDown={() => pick(s)}
                style={{
                  padding: '0.6rem 0.9rem', cursor: 'pointer', fontSize: '0.82rem',
                  borderBottom: '1px solid var(--border)', lineHeight: 1.4,
                  display: 'flex', alignItems: 'flex-start', gap: '0.4rem',
                  color: 'var(--text-primary)',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <MapPin size={13} style={{ color: 'var(--accent-blue)', marginTop: 2, flexShrink: 0 }} />
                <span>{s.display_name}</span>
              </div>
            ))}

            {/* If not found or fallback option */}
            {searched && suggestions.length === 0 && (
              <div style={{ padding: '0.75rem 0.9rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                No address found for "{value}".
              </div>
            )}

            <div
              onMouseDown={(e) => {
                e.preventDefault();
                setOpen(false);
                onOpenMap();
              }}
              style={{
                padding: '0.65rem 0.9rem', cursor: 'pointer', fontSize: '0.82rem',
                background: 'var(--bg-secondary)', color: 'var(--accent-blue)',
                fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem',
                borderTop: suggestions.length ? '1px solid var(--border)' : 'none',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--palette-ocean-soft)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
            >
              <Navigation size={13} /> Can't find location? Open Map & Select Visually 🗺️
            </div>
          </div>
        )}
      </div>

      <button
        type="button"
        className="btn btn-outline"
        onClick={onOpenMap}
        title="Open map to select address"
        style={{ whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.625rem 0.9rem' }}
      >
        <MapPin size={15} /> Pick on Map
      </button>
    </div>
  );
}

/* ─── Customer Add/Edit Modal ─── */
export function CustomerModal({ customer, onClose, onSave }) {
  const defaultForm = { name: '', phone: '', address: '', stickerImage: '', notes: '' };
  const [form, setForm] = useState(customer ? {
    name: customer.name || '',
    phone: customer.phone || '',
    address: customer.address || '',
    stickerImage: customer.stickerImage || '',
    notes: customer.notes || '',
  } : defaultForm);
  const [loading, setLoading] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const fileRef = useRef();

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setForm(prev => ({ ...prev, stickerImage: ev.target.result }));
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (customer?._id) {
        const { data } = await api.put(`/customers/${customer._id}`, form);
        onSave(data, 'edit');
        toast.success('Customer updated!');
      } else {
        const { data } = await api.post('/customers', form);
        onSave(data, 'add');
        toast.success('Customer added!');
      }
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
        <div className="modal">
          <div className="modal-header">
            <span className="modal-title">{customer?._id ? 'Edit Customer' : 'Add New Customer'}</span>
            <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
          </div>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <input className="form-input" placeholder="Hotel Grand" value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="form-group">
              <label className="form-label">Phone Number *</label>
              <input className="form-input" placeholder="+91 9876543210" value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })} required />
            </div>

            {/* Address with autocomplete & Open Map button */}
            <div className="form-group">
              <label className="form-label">Address</label>
              <AddressAutocomplete
                value={form.address}
                onChange={(val) => setForm(prev => ({ ...prev, address: val }))}
                onOpenMap={() => setShowMapPicker(true)}
              />
            </div>

            {/* Sticker Image */}
            <div className="form-group">
              <label className="form-label">Sticker Image</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <button type="button" className="btn btn-outline btn-sm"
                  onClick={() => fileRef.current.click()}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Image size={14} /> {form.stickerImage ? 'Change Image' : 'Upload Image'}
                </button>
                {form.stickerImage && (
                  <button type="button" className="btn btn-ghost btn-sm"
                    style={{ color: 'var(--accent-red)', fontSize: '0.78rem' }}
                    onClick={() => setForm(prev => ({ ...prev, stickerImage: '' }))}>Remove</button>
                )}
                <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageChange} />
              </div>
              {form.stickerImage && (
                <div style={{ marginTop: '0.75rem', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', maxWidth: 200 }}>
                  <img src={form.stickerImage} alt="Sticker preview"
                    style={{ width: '100%', display: 'block', maxHeight: 120, objectFit: 'contain', background: 'var(--bg-primary)' }} />
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea className="form-textarea" placeholder="Any special notes..."
                value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Saving...' : 'Save Customer'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Map Picker Modal */}
      {showMapPicker && (
        <MapLocationPicker
          initialAddress={form.address}
          onSelect={(address) => setForm(prev => ({ ...prev, address }))}
          onClose={() => setShowMapPicker(false)}
        />
      )}
    </>
  );
}

/* ─── Customer Detail & Orders Preview Modal ─── */
function CustomerDetail({ customer, onClose, onEdit }) {
  const { user } = useAuth();
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('metrics'); // 'metrics' | 'history'
  const [orderFilter, setOrderFilter] = useState('all'); // 'all' | 'paid' | 'unpaid'
  const [expandedOrder, setExpandedOrder] = useState(null);

  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  useEffect(() => {
    api.get(`/customers/${customer._id}`)
      .then(r => setDetail(r.data))
      .catch(() => toast.error('Failed to load customer details'))
      .finally(() => setLoading(false));
  }, [customer._id]);

  const rawPhone = (customer.phone || '').replace(/\D/g, '');
  const cleanPhone = rawPhone.startsWith('91') ? rawPhone : (rawPhone ? `91${rawPhone}` : '');
  const initials = (customer.name || 'C')
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const copyPhone = (e) => {
    if (e) e.stopPropagation();
    if (!customer.phone) return;
    navigator.clipboard.writeText(customer.phone);
    toast.success('Phone number copied!');
  };

  const copyAddress = (e) => {
    if (e) e.stopPropagation();
    if (!customer.address) return;
    navigator.clipboard.writeText(customer.address);
    toast.success('Address copied!');
  };

  /* Touch swipe left/right handlers */
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e) => {
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;
    // Swipe threshold of 45px and predominantly horizontal
    if (Math.abs(deltaX) > 45 && Math.abs(deltaX) > Math.abs(deltaY) * 1.3) {
      if (deltaX < 0) {
        // Swipe left -> switch to history
        setActiveTab('history');
      } else {
        // Swipe right -> switch to metrics
        setActiveTab('metrics');
      }
    }
  };

  const sendWhatsApp = () => {
    if (!detail) {
      // Detail still loading — open plain WhatsApp chat
      if (cleanPhone) window.open(`https://wa.me/${cleanPhone}`, '_blank');
      return;
    }
    const { summary, orders } = detail;

    // Only unpaid / partial orders
    const pendingOrders = orders.filter(o => o.paymentStatus !== 'paid' && o.totalAmount > o.paidAmount);

    if (!pendingOrders.length) {
      toast('No pending dues for this customer 🎉', { icon: '✅' });
      return;
    }

    const orderLines = pendingOrders
      .map(o => {
        const due = o.totalAmount - o.paidAmount;
        const date = dayjs(o.createdAt).format('D MMM YYYY');
        return `• 🧾 Order ${o.orderNumber} (${date}): ₹${due.toLocaleString('en-IN')} due`;
      })
      .join('\n');

    const upiId = user?.upiId;
    const businessName = user?.businessName || 'Water Plant';
    const upiPayLink = upiId ? `upi://pay?pa=${upiId}&pn=${encodeURIComponent(businessName)}&am=${summary.pending}&cu=INR` : '';

    const msg =
      `👋 Hello *${customer.name}*,\n\n` +
      `💧 This is a friendly payment reminder from *${businessName}* regarding your pending dues.\n\n` +
      `📋 *Pending Orders:*\n${orderLines}\n\n` +
      `💰 *Total Amount to be Paid: ₹${summary.pending.toLocaleString('en-IN')}*\n\n` +
      (upiId ? `💳 *To Pay via UPI:*\n📲 UPI ID: *${upiId}*\n` + (upiPayLink ? `🔗 Pay Link: ${upiPayLink}\n\n` : '\n') : '') +
      `📸 _Please share the screenshot / receipt if payment is done._\n\n` +
      `Please clear the dues at your earliest convenience.\n` +
      `🙏 Thank you for your business! 💧`;

    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  const sendOrderWhatsApp = (o) => {
    if (!cleanPhone) {
      toast.error('Customer phone number not available');
      return;
    }
    const due = o.totalAmount - (o.paidAmount || 0);
    const upiId = user?.upiId;
    const businessName = user?.businessName || 'Water Plant';
    const upiPayLink = upiId ? `upi://pay?pa=${upiId}&pn=${encodeURIComponent(businessName)}&am=${due > 0 ? due : o.totalAmount}&cu=INR` : '';

    const linesSummary = (o.lines || []).map(l => {
      const bpc = l.bottlesPerCase || 12;
      return `💧 *${l.productName}* (${l.size || 'Standard'})\n   ↳ ${l.cases} case${l.cases !== 1 ? 's' : ''} × ${bpc} bottles = ${l.cases * bpc} bottles @ ₹${l.pricePerBottle}/bottle`;
    }).join('\n\n');

    const msg =
      `👋 Hello *${customer.name}*,\n\n` +
      `💧 Order payment reminder from *${businessName}*:\n` +
      `🧾 *Order #${o.orderNumber}* (${dayjs(o.createdAt).format('DD-MM-YYYY')})\n\n` +
      (linesSummary ? `📦 *Items:*\n${linesSummary}\n\n` : '') +
      `💰 *Total Amount:* ₹${o.totalAmount?.toLocaleString('en-IN')}\n` +
      (due > 0 ? `⚠️ *Pending Due: ₹${due.toLocaleString('en-IN')}*\n\n` : `✅ *Status:* Fully Paid\n\n`) +
      (due > 0 && upiId ? `💳 *To Pay via UPI:*\n📲 UPI ID: *${upiId}*\n` + (upiPayLink ? `🔗 Pay Link: ${upiPayLink}\n\n` : '\n') : '') +
      `📸 _Please share screenshot / receipt once paid._\n\n` +
      `🙏 Thank you! 💧`;

    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  const allOrders = detail?.orders || [];
  const paidOrders = allOrders.filter(o => o.paymentStatus === 'paid');
  const unpaidOrders = allOrders.filter(o => o.paymentStatus !== 'paid');

  const visibleOrders = orderFilter === 'paid'
    ? paidOrders
    : orderFilter === 'unpaid'
    ? unpaidOrders
    : allOrders;

  const pendingAmount = detail?.summary?.pending || 0;
  const mapsUrl = customer.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(customer.address)}`
    : '';

  return (
    <div className="modal-overlay preview-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal preview-modal-dialog">
        {/* Mobile drag handle */}
        <div className="preview-sheet-handle" />

            {/* Hero Header: Profile Row + Icon Toolbar Row */}
            <div className="preview-hero">
              {/* Row 1: Avatar + Name + Phone */}
              <div className="preview-hero-profile">
                <div className="preview-avatar-wrap">
                  {customer.stickerImage ? (
                    <img src={customer.stickerImage} alt={customer.name} className="preview-avatar-img" />
                  ) : (
                    <div className="preview-avatar-fallback">
                      {initials}
                    </div>
                  )}
                </div>
                <div className="preview-hero-info">
                  <div className="preview-customer-name">
                    <span>{customer.name}</span>
                    {detail && (
                      <span className={`preview-status-pill ${pendingAmount > 0 ? 'badge-yellow' : 'badge-green'}`}>
                        {pendingAmount > 0 ? `₹${pendingAmount.toLocaleString('en-IN')} Due` : 'All Clear'}
                      </span>
                    )}
                  </div>
                  <div className="preview-phone-row">
                    <a href={`tel:${customer.phone}`} className="preview-phone-link">
                      <Phone size={13} /> {customer.phone}
                    </a>
                  </div>
                </div>
              </div>

              {/* Row 2: Icon-Only Action Toolbar */}
              <div className="preview-quick-icons">
                <a
                  href={`tel:${customer.phone}`}
                  className="preview-icon-btn call"
                  title="Call Customer"
                  aria-label="Call Customer"
                >
                  <Phone size={16} />
                </a>
                {cleanPhone && (
                  <button
                    type="button"
                    className="preview-icon-btn whatsapp"
                    title="Send WhatsApp Reminder"
                    aria-label="Send WhatsApp Reminder"
                    onClick={sendWhatsApp}
                  >
                    {/* WhatsApp SVG icon */}
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                    </svg>
                  </button>
                )}
                {mapsUrl && (
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="preview-icon-btn map"
                    title="Open in Google Maps"
                    aria-label="Open in Google Maps"
                  >
                    {/* Google Maps pin SVG */}
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                      <circle cx="12" cy="10" r="3"/>
                    </svg>
                  </a>
                )}
                <button
                  type="button"
                  className="preview-icon-btn close"
                  onClick={onClose}
                  title="Close"
                  aria-label="Close"
                  style={{ marginLeft: 'auto' }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

        {/* 2-Tab Navigation Bar with Sliding Indicator */}
        <div className="preview-tabs-bar">
          <div className="preview-tabs-track">
            <button
              type="button"
              className={`preview-tab-btn ${activeTab === 'metrics' ? 'active' : ''}`}
              onClick={() => setActiveTab('metrics')}
            >
              <TrendingUp size={15} />
              <span>Metrics</span>
            </button>
            <button
              type="button"
              className={`preview-tab-btn ${activeTab === 'history' ? 'active' : ''}`}
              onClick={() => setActiveTab('history')}
            >
              <Clock size={15} />
              <span>History</span>
              {allOrders.length > 0 && (
                <span className="preview-tab-badge">{allOrders.length}</span>
              )}
            </button>
            {/* Sliding Active Tab Indicator */}
            <div
              className="preview-tab-indicator"
              style={{
                transform: activeTab === 'metrics' ? 'translateX(0%)' : 'translateX(100%)',
              }}
            />
          </div>
        </div>

        {/* Swipeable Viewport with Carousel Animation */}
        {loading ? (
          <div style={{ padding: '3.5rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
            <div className="loading-spinner" />
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Loading customer data...</div>
          </div>
        ) : detail ? (
          <div
            className="preview-swipe-viewport"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {/* ─── TAB 1: METRICS ─── */}
            <div
              className="preview-tab-slide"
              style={{ display: activeTab === 'metrics' ? 'flex' : 'none' }}
            >

                {/* 4 KPI Metrics Grid */}
                <div className="preview-metrics-grid">
                  <div className="preview-metric-card orders">
                    <div className="preview-metric-header">
                      <span className="preview-metric-label">Orders</span>
                      <div className="preview-metric-icon"><Package size={15} /></div>
                    </div>
                    <div className="preview-metric-value">{detail.summary.totalOrders}</div>
                    <span className="preview-metric-sub">Total bookings</span>
                  </div>

                  <div className="preview-metric-card billed">
                    <div className="preview-metric-header">
                      <span className="preview-metric-label">Billed</span>
                      <div className="preview-metric-icon"><TrendingUp size={15} /></div>
                    </div>
                    <div className="preview-metric-value">₹{detail.summary.totalValue.toLocaleString('en-IN')}</div>
                    <span className="preview-metric-sub">Lifetime value</span>
                  </div>

                  <div className="preview-metric-card paid">
                    <div className="preview-metric-header">
                      <span className="preview-metric-label">Received</span>
                      <div className="preview-metric-icon"><CheckCircle2 size={15} /></div>
                    </div>
                    <div className="preview-metric-value">₹{detail.summary.totalPaid.toLocaleString('en-IN')}</div>
                    <span className="preview-metric-sub">Cleared payments</span>
                  </div>

                  <div className={`preview-metric-card ${pendingAmount > 0 ? 'pending' : 'cleared'}`}>
                    <div className="preview-metric-header">
                      <span className="preview-metric-label">Pending</span>
                      <div className="preview-metric-icon">
                        {pendingAmount > 0 ? <AlertCircle size={15} /> : <Sparkles size={15} />}
                      </div>
                    </div>
                    <div className="preview-metric-value">
                      ₹{pendingAmount.toLocaleString('en-IN')}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      {pendingAmount > 0 && <span className="preview-pulse-dot" />}
                      <span className="preview-metric-sub" style={{ color: pendingAmount > 0 ? 'var(--accent-red)' : 'var(--accent-green)', fontWeight: 600 }}>
                        {pendingAmount > 0 ? 'Dues Outstanding' : 'All Paid Up'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* WhatsApp Reminder Banner removed — action is in hero icons */}

                {/* Quick Swipe Hint */}
                <div style={{ textAlign: 'center', fontSize: '0.74rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', marginTop: 'auto', paddingTop: '0.5rem' }}>
                  <span>👈 Swipe left or tap History to view orders</span>
                </div>
              </div>

              {/* ─── TAB 2: ORDER HISTORY ─── */}
              <div
                className="preview-tab-slide"
                style={{ display: activeTab === 'history' ? 'flex' : 'none' }}
              >
                <div className="preview-orders-box">
                  <div className="preview-orders-header">
                    <div className="preview-orders-title">
                      <Calendar size={16} style={{ color: 'var(--accent-blue)' }} /> Orders Log
                    </div>
                    <div className="preview-filter-chips">
                      <button
                        type="button"
                        className={`preview-filter-chip ${orderFilter === 'all' ? 'active' : ''}`}
                        onClick={() => setOrderFilter('all')}
                      >
                        All ({allOrders.length})
                      </button>
                      <button
                        type="button"
                        className={`preview-filter-chip ${orderFilter === 'paid' ? 'active' : ''}`}
                        onClick={() => setOrderFilter('paid')}
                      >
                        Paid ({paidOrders.length})
                      </button>
                      <button
                        type="button"
                        className={`preview-filter-chip ${orderFilter === 'unpaid' ? 'active' : ''}`}
                        onClick={() => setOrderFilter('unpaid')}
                      >
                        Unpaid ({unpaidOrders.length})
                      </button>
                    </div>
                  </div>

                  {visibleOrders.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2.5rem 1rem', background: 'var(--bg-secondary)', borderRadius: 12, border: '1px dashed var(--border)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      {orderFilter === 'all' ? 'No orders recorded yet' : `No ${orderFilter} orders found`}
                    </div>
                  ) : (
                    <div className="preview-orders-list">
                      {visibleOrders.map(o => {
                        const due = o.totalAmount - (o.paidAmount || 0);
                        const isExpanded = expandedOrder === o._id;
                        const isPaid = o.paymentStatus === 'paid';
                        const lines = o.lines || [];
                        const customerName = customer.name || 'Customer';
                        const totalCases = lines.reduce((sum, l) => sum + (l.cases || 0), 0);
                        const totalBottles = lines.reduce((sum, l) => sum + ((l.cases || 0) * (l.bottlesPerCase || 12)), 0);

                        return (
                          <div
                            key={o._id}
                            className="neo-order-card"
                          >
                            {/* Top Bar: Left Tab + Right Meta Time & Date on dark background */}
                            <div className="neo-order-topbar">
                              <div className="neo-order-tab">
                                {isPaid ? 'Paid' : due > 0 && (o.paidAmount || 0) > 0 ? 'Partial' : 'Pending'}
                              </div>
                              <div className="neo-order-meta">
                                <span className="neo-order-meta-item">
                                  <Clock size={13} /> {dayjs(o.createdAt).format('HH:mm')}
                                </span>
                                <span className="neo-order-meta-item">
                                  <Calendar size={13} /> {dayjs(o.createdAt).format('DD-MM-YYYY')}
                                </span>
                              </div>
                            </div>

                            {/* Main Body */}
                            <div className="neo-order-body">
                              <div className="neo-order-title" onClick={() => setExpandedOrder(isExpanded ? null : o._id)}>
                                {customerName} (Order #{o.orderNumber})
                              </div>

                              {/* Frosted Pill Badges */}
                              <div className="neo-order-pills" onClick={() => setExpandedOrder(isExpanded ? null : o._id)}>
                                <span className="neo-order-pill">
                                  <TrendingUp size={12} /> {totalCases > 0 ? `${totalCases} Cases (${totalBottles} Btls)` : 'Standard Order'}
                                </span>
                              </div>

                              {/* Bottom Stats Row */}
                              <div className="neo-order-footer">
                                <div>
                                  Total Billed : <span className="neo-order-stat-val">₹{o.totalAmount.toLocaleString('en-IN')}</span>
                                </div>
                                <div>
                                  {due > 0 ? (
                                    <span>Due : <span className="neo-order-stat-val" style={{ color: 'var(--palette-sky-blue)' }}>₹{due.toLocaleString('en-IN')}</span></span>
                                  ) : (
                                    <span>Profit : <span className="neo-order-stat-val">₹{o.totalAmount.toLocaleString('en-IN')}</span></span>
                                  )}
                                </div>
                              </div>

                              {/* Quick Action Strip + Expand Toggle */}
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.75rem', paddingTop: '0.65rem', borderTop: '1px dashed rgba(255,255,255,0.22)' }}>
                                <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                                  {!isPaid && cleanPhone && (
                                    <button
                                      type="button"
                                      className="btn btn-sm"
                                      style={{ background: '#25D366', color: '#fff', border: 'none', padding: '0.3rem 0.65rem', borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        sendOrderWhatsApp(o);
                                      }}
                                      title="Send WhatsApp payment reminder"
                                    >
                                      <MessageCircle size={14} /> Send Reminder
                                    </button>
                                  )}
                                </div>

                                <button
                                  type="button"
                                  style={{ background: 'transparent', border: 'none', color: 'var(--palette-ice-blue)', display: 'flex', alignItems: 'center', gap: 2, fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', marginLeft: 'auto' }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setExpandedOrder(isExpanded ? null : o._id);
                                  }}
                                >
                                  <span>{isExpanded ? 'Hide' : 'Items'}</span>
                                  {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                </button>
                              </div>

                              {/* Expandable Line Items breakdown */}
                              {isExpanded && lines.length > 0 && (
                                <div className="neo-order-expanded" onClick={e => e.stopPropagation()}>
                                  <div style={{ fontWeight: 800, opacity: 0.9, marginBottom: 2 }}>Order Items:</div>
                                  {lines.map((l, idx) => (
                                    <div key={idx} className="neo-order-expanded-row">
                                      <span>💧 {l.productName} ({l.size || 'Standard'}) × {l.cases} cases ({l.cases * (l.bottlesPerCase || 12)} bottles)</span>
                                      <span style={{ fontWeight: 800 }}>₹{((l.cases * (l.bottlesPerCase || 12)) * (l.pricePerBottle || 0)).toLocaleString('en-IN')}</span>
                                    </div>
                                  ))}
                                  {o.notes && (
                                    <div style={{ opacity: 0.85, fontStyle: 'italic', marginTop: 4 }}>
                                      Note: {o.notes}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Quick Swipe Hint */}
                  <div style={{ textAlign: 'center', fontSize: '0.74rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', marginTop: 'auto', paddingTop: '0.5rem' }}>
                    <span>👉 Swipe right or tap Metrics to view summary</span>
                  </div>
                </div>
              </div>
            </div>
        ) : null}
      </div>
    </div>
  );
}

/* ─── Main Page ─── */
export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);       // null | 'add' | customer (edit)
  const [detail, setDetail] = useState(null);     // customer object for detail panel

  // 300ms Debounce for smooth, lag-free search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      const { data } = await api.get('/customers', { params });
      setCustomers(data);
    } catch { toast.error('Failed to load customers'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchCustomers(); }, [search]);

  useEffect(() => {
    const handleGlobalCustomer = (e) => {
      if (e.detail) {
        setCustomers(prev => [e.detail, ...prev.filter(c => c._id !== e.detail._id)]);
      }
    };
    window.addEventListener('app:customer-saved', handleGlobalCustomer);
    return () => window.removeEventListener('app:customer-saved', handleGlobalCustomer);
  }, []);

  const handleSave = (savedCustomer, mode) => {
    if (mode === 'add') setCustomers(prev => [savedCustomer, ...prev]);
    else setCustomers(prev => prev.map(c => c._id === savedCustomer._id ? savedCustomer : c));
    if (detail?._id === savedCustomer._id) setDetail(savedCustomer);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this customer?')) return;
    try {
      await api.delete(`/customers/${id}`);
      setCustomers(prev => prev.filter(c => c._id !== id));
      if (detail?._id === id) setDetail(null);
      toast.success('Customer deleted');
    } catch { toast.error('Failed to delete'); }
  };

  // Generate a consistent gradient color from name initials
  const getAvatarGradient = (name = '') => {
    const gradients = [
      ['#0277B6', '#48CBE4'],
      ['#7c3aed', '#a78bfa'],
      ['#059669', '#34d399'],
      ['#dc2626', '#f87171'],
      ['#d97706', '#fbbf24'],
      ['#0369a1', '#38bdf8'],
      ['#be185d', '#f472b6'],
      ['#065f46', '#6ee7b7'],
    ];
    const idx = name.charCodeAt(0) % gradients.length;
    return gradients[idx];
  };

  return (
    <div className="customers-page-shell">
      {/* ── Pinned Top Controls (Header + Search Bar) ── */}
      <div className="customers-top-controls">
        <div className="page-header" style={{ marginBottom: '0.85rem' }}>
          <div>
            <h1 className="page-title" style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--palette-deep-navy)', marginBottom: '2px' }}>
              Customers
            </h1>
            <p className="page-subtitle" style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 500, margin: 0 }}>
              {customers.length} customer{customers.length !== 1 ? 's' : ''} registered
            </p>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => setModal('add')}
            style={{
              height: 42,
              padding: '0 1rem',
              borderRadius: 10,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              fontSize: '0.85rem',
              fontWeight: 700,
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <Plus size={16} strokeWidth={2.5} /> Add Customer
          </button>
        </div>

        {/* ── Search Bar ── */}
        <div style={{ marginBottom: '1rem' }}>
          <div className="search-input-wrapper" style={{ position: 'relative', width: '100%' }}>
            <Search
              size={18}
              style={{
                position: 'absolute',
                left: '0.95rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-secondary)',
                pointerEvents: 'none'
              }}
            />
            <input
              className="form-input"
              placeholder="Search customers by name, phone..."
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              style={{
                width: '100%',
                height: 44,
                paddingLeft: '2.65rem',
                paddingRight: searchInput ? '2.5rem' : '1rem',
                background: '#FFFFFF',
                border: '1px solid var(--border)',
                borderRadius: 12,
                fontSize: '0.88rem',
                color: 'var(--text-primary)',
                fontFamily: 'inherit',
                outline: 'none',
                boxShadow: 'var(--shadow-sm)',
                transition: 'border-color 0.15s, box-shadow 0.15s'
              }}
            />
            {searchInput && (
              <button
                type="button"
                className="btn btn-ghost btn-icon btn-sm"
                style={{
                  position: 'absolute',
                  right: '0.5rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  minHeight: 'unset',
                  width: 28,
                  height: 28,
                  padding: 0
                }}
                onClick={() => setSearchInput('')}
                title="Clear search"
                aria-label="Clear search"
              >
                <X size={15} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Dedicated Scroll Container ── */}
      <div className="customer-cards-scroll-container">
        {loading ? (
          <div className="loading-page"><div className="loading-spinner" /></div>
        ) : customers.length === 0 ? (
          <div className="empty-state" style={{ padding: '3.5rem 1rem', background: '#FFFFFF', borderRadius: 16, border: '1px solid var(--border)' }}>
            <User size={44} style={{ color: 'var(--text-secondary)', opacity: 0.5 }} />
            <h3 style={{ color: 'var(--palette-deep-navy)', marginTop: '0.75rem' }}>No customers found</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              {search ? 'Try adjusting your search criteria' : 'Add your first customer to get started'}
            </p>
            <button
              className="btn btn-primary"
              style={{ marginTop: '1.25rem', height: 40, borderRadius: 10 }}
              onClick={() => { setSearchInput(''); setModal('add'); }}
            >
              <Plus size={16} /> Add Customer
            </button>
          </div>
        ) : (
          <div className="customer-cards-grid">
            {customers.map(c => {
              const [g1, g2] = getAvatarGradient(c.name);
              const initials = c.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
              return (
                <div
                  key={c._id}
                  className="customer-card"
                  onClick={() => setDetail(c)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => e.key === 'Enter' && setDetail(c)}
                  aria-label={`View orders and details for ${c.name}`}
                >
                  <div className="customer-card-body">
                    {/* Top Row: Avatar + Name & Phone + Action Buttons */}
                    <div className="customer-card-header">
                      <div className="customer-card-avatar">
                        {c.stickerImage ? (
                          <img
                            src={c.stickerImage}
                            alt={`${c.name} sticker`}
                            style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 10 }}
                          />
                        ) : (
                          <div
                            className="customer-card-avatar-initials"
                            style={{ background: `linear-gradient(135deg, ${g1}, ${g2})` }}
                          >
                            {initials}
                          </div>
                        )}
                      </div>

                      <div className="customer-card-name-block">
                        <div className="customer-card-name">{c.name}</div>
                        {c.phone && (
                          <a
                            href={`tel:${c.phone}`}
                            className="customer-card-phone"
                            onClick={e => e.stopPropagation()}
                            aria-label={`Call ${c.name} at ${c.phone}`}
                          >
                            <Phone size={12} />
                            <span>{c.phone}</span>
                          </a>
                        )}
                      </div>

                      {/* Edit / Delete actions */}
                      <div className="customer-card-actions" onClick={e => e.stopPropagation()}>
                        <button
                          type="button"
                          className="customer-card-action-btn"
                          onClick={() => setModal(c)}
                          title="Edit customer"
                          aria-label={`Edit ${c.name}`}
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          type="button"
                          className="customer-card-action-btn danger"
                          onClick={() => handleDelete(c._id)}
                          title="Delete customer"
                          aria-label={`Delete ${c.name}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Address row */}
                    {c.address && (
                      <div className="customer-card-address">
                        <MapPin size={13} style={{ color: 'var(--text-secondary)', flexShrink: 0, marginTop: 2 }} />
                        <span className="customer-card-address-text">{c.address}</span>
                      </div>
                    )}

                    {/* Subtle divider */}
                    <div className="customer-card-divider" />

                    {/* Footer: Clearly tappable View orders & details row with right chevron */}
                    <div className="customer-card-footer">
                      <span className="customer-card-hint">View orders &amp; details</span>
                      <ChevronRight size={16} className="customer-card-arrow" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {modal && (
        <CustomerModal
          customer={modal === 'add' ? null : modal}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}

      {/* Detail Panel */}
      {detail && (
        <CustomerDetail
          customer={detail}
          onClose={() => setDetail(null)}
          onEdit={() => { setModal(detail); setDetail(null); }}
        />
      )}
    </div>
  );
}

