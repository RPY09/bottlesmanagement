import { useEffect, useState, useRef, useCallback } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import { useAuth } from '../context/AuthContext';
import '../styles/customers.css';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Plus, Search, Edit2, Trash2, Phone, MapPin, User,
  Image, X, MessageCircle, IndianRupee, Package, Clock,
  Navigation, Crosshair, Check, Copy, ExternalLink,
  ChevronDown, ChevronUp, TrendingUp, CheckCircle2, AlertCircle,
  Calendar, CreditCard, Sparkles, ChevronRight,
  UserPlus, UserCheck, UploadCloud, Loader2
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
    <div className="modal-overlay" style={{ zIndex: 1200 }} onClick={e => e.target === e.currentTarget && onClose()}>
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
    <div className="cm-address-wrap" ref={wrapRef}>
      <div className="cm-address-input-box">
        <textarea
          id="customer-address"
          className="cm-address-textarea"
          placeholder="Enter complete address or landmark..."
          value={value}
          onChange={handleChange}
          onFocus={() => (suggestions.length > 0 || (searched && value.length >= 3)) && setOpen(true)}
          rows={2}
        />

        {open && (
          <div className="cm-address-dropdown">
            {suggestions.map((s) => (
              <div
                key={s.place_id}
                onMouseDown={() => pick(s)}
                className="cm-address-item"
              >
                <MapPin size={15} style={{ color: '#0277B6', marginTop: 2, flexShrink: 0 }} />
                <span>{s.display_name}</span>
              </div>
            ))}

            {searched && suggestions.length === 0 && (
              <div style={{ padding: '0.75rem 0.9rem', fontSize: '0.82rem', color: '#64748B' }}>
                No address found for "{value}".
              </div>
            )}

            <div
              onMouseDown={(e) => {
                e.preventDefault();
                setOpen(false);
                onOpenMap();
              }}
              className="cm-address-item"
              style={{
                background: '#F0F9FF',
                color: '#0277B6',
                fontWeight: 700,
                borderTop: suggestions.length ? '1px solid #E2E8F0' : 'none',
              }}
            >
              <Navigation size={15} style={{ marginTop: 2, flexShrink: 0 }} />
              <span>Can't find exact location? Open Map & Select Visually 🗺️</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Helper to parse initial phone to 10 digits ─── */
const parsePhoneTo10 = (rawPhone) => {
  if (!rawPhone) return '';
  const digits = String(rawPhone).replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length > 10) return digits.slice(-10);
  return digits;
};

/* ─── Premium Customer Add/Edit Modal (Ocean Blue Design System) ─── */
export function CustomerModal({ customer, onClose, onSave }) {
  const isEdit = Boolean(customer?._id);

  const [name, setName] = useState(customer?.name || '');
  const [phoneDigits, setPhoneDigits] = useState(() => parsePhoneTo10(customer?.phone));
  const [address, setAddress] = useState(customer?.address || '');
  const [stickerImage, setStickerImage] = useState(customer?.stickerImage || '');
  const [notes, setNotes] = useState(customer?.notes || '');

  const [loading, setLoading] = useState(false);
  const [closing, setClosing] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [mapConfirmed, setMapConfirmed] = useState(Boolean(customer?.address));
  const [isDragOver, setIsDragOver] = useState(false);
  const [touched, setTouched] = useState({ name: false, phone: false });

  const nameInputRef = useRef(null);
  const fileRef = useRef(null);

  // Auto-focus name field on open
  useEffect(() => {
    const t = setTimeout(() => {
      nameInputRef.current?.focus();
    }, 150);
    return () => clearTimeout(t);
  }, []);

  // Validation
  const isNameValid = name.trim().length >= 2;
  const isPhoneValid = /^[6-9]\d{9}$/.test(phoneDigits.trim());

  // Smooth exit transition
  const triggerClose = useCallback(() => {
    if (loading) return;
    setClosing(true);
    setTimeout(() => {
      onClose();
    }, 200);
  }, [loading, onClose]);

  // Keyboard accessibility: Escape to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        triggerClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [triggerClose]);

  // File Upload Processing
  const handleFileProcess = (file) => {
    if (!file) return;
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      toast.error('Unsupported format. Please upload PNG, JPG, WEBP, or SVG');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image is too large. Maximum size is 5MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setStickerImage(ev.target.result);
      toast.success('Sticker label attached!');
    };
    reader.onerror = () => {
      toast.error('Failed to read image file');
    };
    reader.readAsDataURL(file);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) handleFileProcess(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileProcess(file);
  };

  const handleRemoveSticker = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setStickerImage('');
    if (fileRef.current) fileRef.current.value = '';
    toast('Sticker image removed');
  };

  // Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched({ name: true, phone: true });

    if (!isNameValid) {
      toast.error('Please enter customer full name (min 2 characters)');
      nameInputRef.current?.focus();
      return;
    }

    if (!isPhoneValid) {
      toast.error('Please enter a valid 10-digit mobile number');
      return;
    }

    setLoading(true);
    const payload = {
      name: name.trim(),
      phone: `+91 ${phoneDigits.trim()}`,
      address: address.trim(),
      stickerImage,
      notes: notes.trim(),
    };

    try {
      if (isEdit) {
        const { data } = await api.put(`/customers/${customer._id}`, payload);
        onSave(data, 'edit');
        toast.success(`Updated customer: ${data.name}`);
      } else {
        const { data } = await api.post('/customers', payload);
        onSave(data, 'add');
        toast.success(`Customer created: ${data.name}`);
      }
      triggerClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save customer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div
        className={`customer-modal-overlay ${closing ? 'closing' : ''}`}
        onClick={(e) => e.target === e.currentTarget && triggerClose()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="customer-modal-title"
      >
        <div className={`customer-modal-dialog ${closing ? 'closing' : ''}`}>
          {/* Mobile swipe handle */}
          <div className="customer-sheet-handle" />

          {/* 3. Header */}
          <div className="customer-modal-header">
            <div className="cm-header-left">
              <div className="cm-header-icon">
                {isEdit ? <UserCheck size={22} /> : <UserPlus size={22} />}
              </div>
              <div className="cm-title-wrap">
                <div id="customer-modal-title" className="cm-title">
                  {isEdit ? 'Edit Customer' : 'Add New Customer'}
                </div>
                <div className="cm-subtitle">
                  {isEdit
                    ? 'Update customer information and branding.'
                    : 'Create a customer profile to manage orders and deliveries.'}
                </div>
              </div>
            </div>

            <button
              type="button"
              className="cm-close-btn"
              onClick={triggerClose}
              aria-label="Close dialog"
              disabled={loading}
            >
              <X size={18} />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
            <div className="customer-modal-body">
              {/* 4. Full Name Field */}
              <div className="cm-field-group">
                <div className="cm-label-row">
                  <label htmlFor="customer-name" className="cm-label">
                    Full Name <span className="cm-req">*</span>
                  </label>
                </div>
                <input
                  id="customer-name"
                  ref={nameInputRef}
                  type="text"
                  className={`cm-input ${touched.name && !isNameValid ? 'error' : ''}`}
                  placeholder="Enter customer name"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (!touched.name) setTouched((prev) => ({ ...prev, name: true }));
                  }}
                  onBlur={() => setTouched((prev) => ({ ...prev, name: true }))}
                  required
                  autoComplete="off"
                />
                {touched.name && !isNameValid && (
                  <div className="cm-field-error">
                    <AlertCircle size={13} /> Full name must be at least 2 characters
                  </div>
                )}
              </div>

              {/* 5. Phone Number Field (+91 | 9876543210) */}
              <div className="cm-field-group">
                <div className="cm-label-row">
                  <label htmlFor="customer-phone" className="cm-label">
                    Phone Number <span className="cm-req">*</span>
                  </label>
                  <span className="cm-opt">10-digit mobile</span>
                </div>
                <div className={`cm-phone-wrap ${touched.phone && !isPhoneValid ? 'error' : ''}`}>
                  <div className="cm-phone-prefix">
                    <Phone size={14} />
                    <span>+91</span>
                  </div>
                  <input
                    id="customer-phone"
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={10}
                    className="cm-phone-input"
                    placeholder="9876543210"
                    value={phoneDigits}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setPhoneDigits(digits);
                      if (!touched.phone) setTouched((prev) => ({ ...prev, phone: true }));
                    }}
                    onBlur={() => setTouched((prev) => ({ ...prev, phone: true }))}
                    required
                  />
                </div>
                {touched.phone && !isPhoneValid && (
                  <div className="cm-field-error">
                    <AlertCircle size={13} />
                    {phoneDigits.length === 0
                      ? 'Phone number is required'
                      : 'Please enter a valid 10-digit mobile number starting with 6, 7, 8, or 9'}
                  </div>
                )}
              </div>

              {/* 6. Address Field with Autocomplete & Map Picker */}
              <div className="cm-field-group">
                <div className="cm-label-row">
                  <label htmlFor="customer-address" className="cm-label">
                    Address
                  </label>
                  <span className="cm-opt">Delivery &amp; Billing</span>
                </div>

                <AddressAutocomplete
                  value={address}
                  onChange={(val) => {
                    setAddress(val);
                    setMapConfirmed(false);
                  }}
                  onOpenMap={() => setShowMapPicker(true)}
                />

                <button
                  type="button"
                  className="cm-map-btn"
                  onClick={() => setShowMapPicker(true)}
                >
                  <MapPin size={16} /> Select location on map
                </button>

                {mapConfirmed && address && (
                  <div className="cm-map-pinned-badge">
                    <CheckCircle2 size={13} /> Location verified on map
                  </div>
                )}
              </div>

              {/* 7. Customer Sticker Image */}
              <div className="cm-field-group">
                <div className="cm-label-row">
                  <label className="cm-label">
                    Customer Sticker / Label
                  </label>
                  <span className="cm-opt">Water bottle artwork</span>
                </div>

                {!stickerImage ? (
                  <div
                    className={`cm-sticker-dropzone ${isDragOver ? 'dragover' : ''}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileRef.current?.click()}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && fileRef.current?.click()}
                    aria-label="Upload sticker image"
                  >
                    <div className="cm-sticker-icon-wrap">
                      <UploadCloud size={24} />
                    </div>
                    <div className="cm-sticker-title">Upload Sticker Image</div>
                    <div className="cm-sticker-sub">PNG, JPG, WEBP or SVG up to 5MB</div>
                    <span className="cm-sticker-browse">
                      <Image size={14} /> Browse Files
                    </span>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                      style={{ display: 'none' }}
                      onChange={handleFileSelect}
                    />
                  </div>
                ) : (
                  <div className="cm-sticker-card">
                    <div className="cm-sticker-frame">
                      <img
                        src={stickerImage}
                        alt="Customer Sticker Preview"
                        className="cm-sticker-img"
                      />
                    </div>
                    <div className="cm-sticker-actions">
                      <span className="cm-sticker-badge">
                        <CheckCircle2 size={13} /> Label Attached
                      </span>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button
                          type="button"
                          className="cm-btn-change"
                          onClick={() => fileRef.current?.click()}
                        >
                          <Image size={13} /> Change Image
                        </button>
                        <button
                          type="button"
                          className="cm-btn-remove"
                          onClick={handleRemoveSticker}
                        >
                          <Trash2 size={13} /> Remove
                        </button>
                      </div>
                    </div>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                      style={{ display: 'none' }}
                      onChange={handleFileSelect}
                    />
                  </div>
                )}
              </div>

              {/* 8. Notes */}
              <div className="cm-field-group">
                <div className="cm-label-row">
                  <label htmlFor="customer-notes" className="cm-label">
                    Notes
                  </label>
                  <span className="cm-opt">Optional</span>
                </div>
                <textarea
                  id="customer-notes"
                  className="cm-notes-textarea"
                  placeholder="Add delivery instructions, preferences or other customer notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>

            {/* 9. Save Action (Sticky Footer) */}
            <div className="customer-modal-footer">
              <button
                type="button"
                className="cm-btn-cancel"
                onClick={triggerClose}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="cm-btn-submit"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" /> Saving...
                  </>
                ) : isEdit ? (
                  <>
                    <UserCheck size={18} /> Save Changes
                  </>
                ) : (
                  <>
                    <UserPlus size={18} /> Save Customer
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Map Picker Modal */}
      {showMapPicker && (
        <MapLocationPicker
          initialAddress={address}
          onSelect={(selectedAddr) => {
            setAddress(selectedAddr);
            setMapConfirmed(true);
          }}
          onClose={() => setShowMapPicker(false)}
        />
      )}
    </>
  );
}

/* ─── Customer Detail & Orders Preview Modal (Premium CRM Profile) ─── */
function CustomerDetail({ customer, onClose, onEdit }) {
  const { user } = useAuth();
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState(false);
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

  // Smooth exit transition
  const triggerClose = useCallback(() => {
    setClosing(true);
    setTimeout(() => {
      onClose();
    }, 180);
  }, [onClose]);

  // Keyboard accessibility: Escape to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        triggerClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [triggerClose]);

  const rawPhone = (customer.phone || '').replace(/\D/g, '');
  const cleanPhone = rawPhone.startsWith('91') ? rawPhone : (rawPhone ? `91${rawPhone}` : '');
  const initials = (customer.name || 'C')
    .split(' ')
    .map(n => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  /* Touch swipe left/right handlers */
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e) => {
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY) * 1.3) {
      if (deltaX < 0) setActiveTab('history');
      else setActiveTab('metrics');
    }
  };

  const sendWhatsApp = () => {
    if (!detail) {
      if (cleanPhone) window.open(`https://wa.me/${cleanPhone}`, '_blank');
      return;
    }
    const { summary, orders } = detail;
    const pendingOrders = (orders || []).filter(o => o.paymentStatus !== 'paid' && o.totalAmount > (o.paidAmount || 0));

    if (!pendingOrders.length) {
      toast('No pending dues for this customer 🎉', { icon: '✅' });
      return;
    }

    const orderLines = pendingOrders
      .map(o => {
        const due = o.totalAmount - (o.paidAmount || 0);
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
  const paidOrders = allOrders.filter(o => o.paymentStatus === 'paid' || (o.totalAmount - (o.paidAmount || 0)) <= 0);
  const unpaidOrders = allOrders.filter(o => o.paymentStatus !== 'paid' && (o.totalAmount - (o.paidAmount || 0)) > 0);

  const visibleOrders = orderFilter === 'paid'
    ? paidOrders
    : orderFilter === 'unpaid'
    ? unpaidOrders
    : allOrders;

  const pendingAmount = detail?.summary?.pending ?? 0;
  const mapsUrl = customer.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(customer.address)}`
    : '';

  const receivedPercent = detail?.summary?.totalValue > 0
    ? Math.min(100, Math.round((detail.summary.totalPaid / detail.summary.totalValue) * 100))
    : 100;

  const recentOrders = allOrders.slice(0, 2);

  return (
    <div
      className={`crm-profile-overlay ${closing ? 'closing' : ''}`}
      onClick={e => e.target === e.currentTarget && triggerClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="crm-customer-title"
    >
      <div className={`crm-profile-dialog ${closing ? 'closing' : ''}`}>
        {/* Mobile drag handle */}
        <div className="crm-sheet-handle" />

        {/* ══════════════════════════════════════════════════════
            1. STICKY HERO HEADER: Profile + Actions + Status
           ══════════════════════════════════════════════════════ */}
        <div className="crm-hero">
          <div className="crm-hero-top">
            <div className="crm-hero-profile">
              <div className="crm-avatar-wrap">
                {customer.stickerImage ? (
                  <img src={customer.stickerImage} alt={customer.name} className="crm-avatar-img" />
                ) : (
                  <div className="crm-avatar-fallback">{initials}</div>
                )}
              </div>

              <div className="crm-hero-info">
                <div className="crm-customer-name-row">
                  <span id="crm-customer-title" className="crm-customer-name">{customer.name}</span>
                  {detail && (
                    <span className={`crm-due-pill ${pendingAmount > 0 ? 'due' : 'clear'}`}>
                      {pendingAmount > 0
                        ? ` Due`
                        : '✓ All Clear'}
                    </span>
                  )}
                </div>

                {customer.phone && (
                  <a href={`tel:${customer.phone}`} className="crm-phone-link" title="Click to call">
                    <Phone size={12} />
                    <span>{customer.phone}</span>
                  </a>
                )}
              </div>
            </div>

            <button
              type="button"
              className="crm-action-btn close"
              onClick={triggerClose}
              aria-label="Close profile"
            >
              <X size={18} />
            </button>
          </div>

          {/* Quick Action Toolbar */}
          <div className="crm-quick-actions">
            {customer.phone && (
              <a
                href={`tel:${customer.phone}`}
                className="crm-action-btn call"
                title="Call Customer"
                aria-label="Call Customer"
              >
                <Phone size={15} />
              </a>
            )}

            {cleanPhone && (
              <button
                type="button"
                className="crm-action-btn whatsapp"
                title="Send WhatsApp Reminder"
                aria-label="Send WhatsApp Reminder"
                onClick={sendWhatsApp}
              >
                <i class="bi bi-whatsapp"></i>
              </button>
            )}

            {mapsUrl && (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="crm-action-btn map"
                title="Open location on Google Maps"
                aria-label="Open location on Google Maps"
              >
                <MapPin size={15} />
              </a>
            )}

            <button
              type="button"
              className="crm-action-btn edit"
              onClick={() => onEdit(customer)}
              title="Edit customer profile"
              aria-label="Edit customer profile"
            >
              <Edit2 size={15} />
            </button>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════
            2. STICKY TABS BAR: Metrics vs History
           ══════════════════════════════════════════════════════ */}
        <div className="crm-tabs-bar">
          <div className="crm-tabs-track">
            <button
              type="button"
              className={`crm-tab-btn ${activeTab === 'metrics' ? 'active' : ''}`}
              onClick={() => setActiveTab('metrics')}
            >
              <TrendingUp size={15} />
              <span>Metrics</span>
            </button>
            <button
              type="button"
              className={`crm-tab-btn ${activeTab === 'history' ? 'active' : ''}`}
              onClick={() => setActiveTab('history')}
            >
              <Clock size={15} />
              <span>History</span>
              {allOrders.length > 0 && (
                <span className="crm-tab-badge">{allOrders.length}</span>
              )}
            </button>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════
            3. SCROLLABLE TAB CONTENT (Metrics or History)
           ══════════════════════════════════════════════════════ */}
        {loading ? (
          <div style={{ padding: '3.5rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
            <div className="loading-spinner" />
            <div style={{ fontSize: '0.85rem', color: '#64748B' }}>Loading customer records...</div>
          </div>
        ) : detail ? (
          <div
            className="crm-scroll-body"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {/* ─── TAB 1: METRICS ─── */}
            {activeTab === 'metrics' && (
              <>
                {/* 4 Primary KPI Metrics in 2-Column Grid */}
                <div className="crm-metrics-grid">
                  <div className="crm-metric-card orders">
                    <div className="crm-metric-header">
                      <span>Total Orders</span>
                      <Package size={15} style={{ color: '#0277B6' }} />
                    </div>
                    <div className="crm-metric-value">{detail.summary.totalOrders}</div>
                    <span className="crm-metric-sub">Lifetime bookings</span>
                  </div>

                  <div className="crm-metric-card billed">
                    <div className="crm-metric-header">
                      <span>Total Billed</span>
                      <TrendingUp size={15} style={{ color: '#03045E' }} />
                    </div>
                    <div className="crm-metric-value">₹{detail.summary.totalValue.toLocaleString('en-IN')}</div>
                    <span className="crm-metric-sub">Gross order value</span>
                  </div>

                  <div className="crm-metric-card received">
                    <div className="crm-metric-header">
                      <span>Total Received</span>
                      <CheckCircle2 size={15} style={{ color: '#15803D' }} />
                    </div>
                    <div className="crm-metric-value">₹{detail.summary.totalPaid.toLocaleString('en-IN')}</div>
                    <span className="crm-metric-sub">Cleared payments</span>
                  </div>

                  <div className={`crm-metric-card ${pendingAmount > 0 ? 'pending' : 'settled'}`}>
                    <div className="crm-metric-header">
                      <span>Pending Balance</span>
                      {pendingAmount > 0 ? (
                        <AlertCircle size={15} style={{ color: '#DC2626' }} />
                      ) : (
                        <Sparkles size={15} style={{ color: '#15803D' }} />
                      )}
                    </div>
                    <div className="crm-metric-value" style={{ color: pendingAmount > 0 ? '#DC2626' : '#15803D' }}>
                      ₹{pendingAmount.toLocaleString('en-IN')}
                    </div>
                    <span className="crm-metric-sub" style={{ color: pendingAmount > 0 ? '#DC2626' : '#15803D', fontWeight: 600 }}>
                      {pendingAmount > 0 ? 'Dues Outstanding' : 'All Settled'}
                    </span>
                  </div>
                </div>

                {/* Financial Overview Card */}
                <div className="crm-overview-card">
                  <div className="crm-overview-title">
                    <CreditCard size={16} style={{ color: '#0277B6' }} />
                    <span>Financial Overview</span>
                  </div>

                  <div className="crm-overview-bar">
                    <div
                      className="crm-overview-bar-fill"
                      style={{ width: `${receivedPercent}%` }}
                    />
                  </div>

                  <div className="crm-overview-row">
                    <span>Lifetime Billed</span>
                    <strong>₹{detail.summary.totalValue.toLocaleString('en-IN')}</strong>
                  </div>

                  <div className="crm-overview-row">
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#15803D' }} />
                      Payments Received ({receivedPercent}%)
                    </span>
                    <strong style={{ color: '#15803D' }}>₹{detail.summary.totalPaid.toLocaleString('en-IN')}</strong>
                  </div>

                  <div className="crm-overview-row">
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: pendingAmount > 0 ? '#DC2626' : '#15803D' }} />
                      Outstanding Balance
                    </span>
                    <strong style={{ color: pendingAmount > 0 ? '#DC2626' : '#15803D' }}>
                      ₹{pendingAmount.toLocaleString('en-IN')}
                    </strong>
                  </div>
                </div>

                {/* Recent Orders Section */}
                <div className="crm-recent-section">
                  <div className="crm-recent-header">
                    <span className="crm-recent-title">
                      <Clock size={15} style={{ color: '#0277B6' }} />
                      Recent Orders
                    </span>
                    {allOrders.length > 0 && (
                      <button
                        type="button"
                        className="crm-recent-view-all"
                        onClick={() => setActiveTab('history')}
                      >
                        View All ({allOrders.length}) →
                      </button>
                    )}
                  </div>

                  {recentOrders.length > 0 ? (
                    <div className="crm-recent-orders-list">
                      {recentOrders.map(o => {
                        const due = o.totalAmount - (o.paidAmount || 0);
                        const isPaid = o.paymentStatus === 'paid' || due <= 0;
                        return (
                          <div
                            key={o._id}
                            className="crm-recent-order-item"
                            onClick={() => {
                              setActiveTab('history');
                              setExpandedOrder(o._id);
                            }}
                          >
                            <div>
                              <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#03045E' }}>
                                #{o.orderNumber}
                              </div>
                              <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                                {dayjs(o.createdAt).format('DD MMM YYYY · HH:mm')}
                              </div>
                            </div>

                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#0277B6' }}>
                                ₹{o.totalAmount.toLocaleString('en-IN')}
                              </div>
                              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: isPaid ? '#15803D' : '#DC2626' }}>
                                {isPaid ? 'Paid' : `Due: ₹${due.toLocaleString('en-IN')}`}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ padding: '1.25rem', textAlign: 'center', background: '#F8FAFC', borderRadius: 10, border: '1px dashed #E2E8F0', fontSize: '0.8rem', color: '#64748B' }}>
                      No orders recorded yet
                    </div>
                  )}
                </div>

                {/* Customer Address & Notes details */}
                {(customer.address || customer.notes) && (
                  <div style={{ padding: '0.75rem 0.95rem', background: '#F8FAFC', borderRadius: 12, border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {customer.address && (
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.45rem', fontSize: '0.78rem', color: '#172033' }}>
                        <MapPin size={14} style={{ color: '#0277B6', flexShrink: 0, marginTop: 2 }} />
                        <span>{customer.address}</span>
                      </div>
                    )}
                    {customer.notes && (
                      <div style={{ fontSize: '0.74rem', color: '#64748B', fontStyle: 'italic', paddingTop: '0.35rem', borderTop: '1px dashed #E2E8F0' }}>
                        Note: {customer.notes}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* ─── TAB 2: ORDER HISTORY ─── */}
            {activeTab === 'history' && (
              <>
                {/* Segmented Filter Control */}
                <div className="crm-history-filters">
                  <button
                    type="button"
                    className={`crm-filter-chip ${orderFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setOrderFilter('all')}
                  >
                    All ({allOrders.length})
                  </button>
                  <button
                    type="button"
                    className={`crm-filter-chip ${orderFilter === 'paid' ? 'active' : ''}`}
                    onClick={() => setOrderFilter('paid')}
                  >
                    Paid ({paidOrders.length})
                  </button>
                  <button
                    type="button"
                    className={`crm-filter-chip ${orderFilter === 'unpaid' ? 'active' : ''}`}
                    onClick={() => setOrderFilter('unpaid')}
                  >
                    Unpaid ({unpaidOrders.length})
                  </button>
                </div>

                {visibleOrders.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2.5rem 1rem', background: '#F8FAFC', borderRadius: 14, border: '1px dashed #E2E8F0', color: '#64748B', fontSize: '0.85rem' }}>
                    {orderFilter === 'all' ? 'No orders recorded yet' : `No ${orderFilter} orders found`}
                  </div>
                ) : (
                  <div className="crm-orders-list">
                    {visibleOrders.map(o => {
                      const due = o.totalAmount - (o.paidAmount || 0);
                      const isExpanded = expandedOrder === o._id;
                      const isPaid = o.paymentStatus === 'paid' || due <= 0;
                      const isPartial = !isPaid && (o.paidAmount || 0) > 0;
                      const lines = o.lines || [];
                      const totalCases = lines.reduce((sum, l) => sum + (l.cases || 0), 0);
                      const totalBottles = lines.reduce((sum, l) => sum + ((l.cases || 0) * (l.bottlesPerCase || 12)), 0);

                      return (
                        <div key={o._id} className="crm-order-card">
                          {/* 1. Header: Status badge + Order ID + Date & Time */}
                          <div className="crm-order-header">
                            <div className="crm-order-header-left">
                              <span className={`crm-order-status-badge ${isPaid ? 'paid' : isPartial ? 'partial' : 'unpaid'}`}>
                                {isPaid ? 'Paid' : isPartial ? 'Partial' : 'Unpaid'}
                              </span>
                              <span className="crm-order-id">#{o.orderNumber}</span>
                            </div>

                            <span className="crm-order-time">
                              <Calendar size={12} />
                              {dayjs(o.createdAt).format('DD MMM YYYY · HH:mm')}
                            </span>
                          </div>

                          {/* 2. Order Body */}
                          <div className="crm-order-body">
                            {/* Summary row */}
                            <div className="crm-order-summary-row">
                              <span className="crm-order-summary-pill">
                                <Package size={13} style={{ color: '#0277B6' }} />
                                {totalCases} Cases ({totalBottles} Btls)
                              </span>
                            </div>

                            {/* Financial 3-column overview */}
                            <div className="crm-order-financials">
                              <div className="crm-order-fin-item">
                                <span className="crm-order-fin-label">Billed</span>
                                <span className="crm-order-fin-val">₹{o.totalAmount.toLocaleString('en-IN')}</span>
                              </div>
                              <div className="crm-order-fin-item">
                                <span className="crm-order-fin-label">Received</span>
                                <span className="crm-order-fin-val paid">₹{(o.paidAmount || 0).toLocaleString('en-IN')}</span>
                              </div>
                              <div className="crm-order-fin-item">
                                <span className="crm-order-fin-label">Pending</span>
                                <span className={`crm-order-fin-val ${due > 0 ? 'due' : 'paid'}`}>
                                  ₹{due.toLocaleString('en-IN')}
                                </span>
                              </div>
                            </div>

                            {/* Actions row: WhatsApp Reminder + View Items toggle */}
                            <div className="crm-order-actions-row">
                              {!isPaid && cleanPhone ? (
                                <button
                                  type="button"
                                  className="crm-btn-reminder"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    sendOrderWhatsApp(o);
                                  }}
                                  title="Send payment reminder via WhatsApp"
                                >
                                  <MessageCircle size={13} /> Send Reminder
                                </button>
                              ) : <span />}

                              <button
                                type="button"
                                className="crm-btn-view-items"
                                onClick={() => setExpandedOrder(isExpanded ? null : o._id)}
                              >
                                <span>{isExpanded ? 'Hide Items' : 'View Items'}</span>
                                {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                              </button>
                            </div>
                          </div>

                          {/* 3. Inline Expandable Line Items breakdown */}
                          {isExpanded && lines.length > 0 && (
                            <div className="crm-order-items-breakdown">
                              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#03045E', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                                Order Items Breakdown:
                              </div>
                              {lines.map((l, idx) => {
                                const bpc = l.bottlesPerCase || 12;
                                const lineBottles = (l.cases || 0) * bpc;
                                const lineSubtotal = lineBottles * (l.pricePerBottle || 0);
                                return (
                                  <div key={idx} className="crm-order-item-row">
                                    <div>
                                      <div className="crm-order-item-name">
                                        💧 {l.productName} ({l.size || 'Standard'})
                                      </div>
                                      <div className="crm-order-item-desc">
                                        {l.cases} case{l.cases !== 1 ? 's' : ''} × {bpc} = {lineBottles} btls @ ₹{l.pricePerBottle}/btl
                                      </div>
                                    </div>
                                    <div className="crm-order-item-subtotal">
                                      ₹{lineSubtotal.toLocaleString('en-IN')}
                                    </div>
                                  </div>
                                );
                              })}
                              {o.notes && (
                                <div className="crm-order-notes-box">
                                  Delivery / Order Note: {o.notes}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
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
            <Plus size={16} strokeWidth={2.5} /> Customer
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

