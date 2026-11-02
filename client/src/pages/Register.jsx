import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { ArrowRight, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import '../styles/auth.css';
import logo from '../assets/logo.png';

export default function Register() {
  const [form, setForm] = useState({
    name: '', email: '', password: '',
    businessName: '', fssaiNo: '', phone: '', upiId: ''
  });
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
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
      <div className="auth-shell register-shell">
        <aside className="auth-brand-panel">
          <div className="auth-brand">
            <img src={logo} alt="Hydro Business Manager" className="auth-brand-logo" />
            <div>
              <strong>Hydro</strong>
              <span>Business Manager</span>
            </div>
          </div>
          <div className="auth-brand-copy">
            <span className="auth-eyebrow">A better way to run your plant</span>
            <h1>Set up your business once. Run it with confidence.</h1>
            <p>Create your workspace and bring orders, payments and customers together from day one.</p>
          </div>
          <div className="auth-trust"><ShieldCheck size={17} /> Built for growing water businesses</div>
        </aside>

        <main className="auth-card">
          <div className="auth-heading">
            <span className="auth-mobile-brand">Get started</span>
            <h2>Create your workspace</h2>
            <p>Tell us a little about you and your business.</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form register-form">
            <div className="auth-section-label">Your details</div>
            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label" htmlFor="register-name">Your name <span>*</span></label>
                <input id="register-name" className="form-input" placeholder="John Kumar" {...f('name')} required autoComplete="name" />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="register-email">Email address <span>*</span></label>
                <input id="register-email" className="form-input" type="email" placeholder="you@business.com" {...f('email')} required autoComplete="email" />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="register-password">Password <span>*</span></label>
              <div className="auth-input-wrap">
                <input id="register-password" className="form-input" type={showPass ? 'text' : 'password'} placeholder="At least 8 characters" {...f('password')} required minLength={8} autoComplete="new-password" />
                <button className="auth-visibility" type="button" onClick={() => setShowPass(!showPass)} aria-label={showPass ? 'Hide password' : 'Show password'}>{showPass ? <EyeOff size={17} /> : <Eye size={17} />}</button>
              </div>
            </div>

            <div className="auth-section-label auth-section-business">Business details</div>
            <div className="form-group">
              <label className="form-label" htmlFor="register-business">Business name <span>*</span></label>
              <input id="register-business" className="form-input" placeholder="Manjeera Beverages" {...f('businessName')} required autoComplete="organization" />
            </div>
            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label" htmlFor="register-phone">Phone number</label>
                <input id="register-phone" className="form-input" placeholder="+91 9999 999999" {...f('phone')} autoComplete="tel" />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="register-upi">UPI ID</label>
                <input id="register-upi" className="form-input" placeholder="yourname@upi" {...f('upiId')} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="register-fssai">FSSAI registration number <span className="optional">(optional)</span></label>
              <input id="register-fssai" className="form-input" placeholder="23626019000558" {...f('fssaiNo')} />
            </div>

            <button className="auth-submit" type="submit" disabled={loading}>
              {loading ? 'Creating workspace...' : <>Create workspace <ArrowRight size={17} /></>}
            </button>
          </form>

          <p className="auth-switch">Already have an account? <Link to="/login">Sign in</Link></p>
        </main>
      </div>
    </div>
  );
}
