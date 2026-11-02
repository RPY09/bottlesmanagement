import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { Droplets } from 'lucide-react';

export default function Register() {
  const [form, setForm] = useState({
    name: '', email: '', password: '',
    businessName: '', fssaiNo: '', phone: '', upiId: ''
  });
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', form);
      login(data.token, data.user);
      toast.success('Account created! Welcome!');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const f = (field) => ({ value: form[field], onChange: e => setForm({ ...form, [field]: e.target.value }) });

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: 500 }}>
        <div className="auth-logo">
          <div className="auth-logo-icon"><Droplets size={28} /></div>
          <h2 style={{ marginBottom: '0.25rem' }}>Create Account</h2>
          <p style={{ fontSize: '0.85rem' }}>Set up your water plant business manager</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Your Name *</label>
              <input className="form-input" placeholder="John Kumar" {...f('name')} required />
            </div>
            <div className="form-group">
              <label className="form-label">Business Name *</label>
              <input className="form-input" placeholder="Manjeera Beverages" {...f('businessName')} required />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Email Address *</label>
            <input className="form-input" type="email" placeholder="you@business.com" {...f('email')} required />
          </div>
          <div className="form-group">
            <label className="form-label">Password *</label>
            <input className="form-input" type="password" placeholder="Minimum 8 characters" {...f('password')} required minLength={8} />
          </div>
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input className="form-input" placeholder="+91 9999 999999" {...f('phone')} />
            </div>
            <div className="form-group">
              <label className="form-label">UPI ID</label>
              <input className="form-input" placeholder="yourname@upi" {...f('upiId')} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">FSSAI Registration No.</label>
            <input className="form-input" placeholder="23626019000558" {...f('fssaiNo')} />
          </div>

          <button className="btn btn-primary w-full" type="submit" disabled={loading} style={{ justifyContent: 'center', marginTop: '0.5rem' }}>
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--accent-blue)', textDecoration: 'none', fontWeight: 500 }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
