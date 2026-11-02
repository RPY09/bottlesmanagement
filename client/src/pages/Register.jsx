import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { ArrowLeft, ArrowRight, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import '../styles/auth.css';
import logo from '../assets/logo.png';

export default function Register() {
  const [form, setForm] = useState({
    name: '', email: '', password: '',
    businessName: '', fssaiNo: '', phone: '', upiId: ''
  });
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [step, setStep] = useState(1);
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

  const goToBusinessDetails = () => {
    if (!form.name.trim() || !form.email.trim() || !form.password) {
      toast.error('Complete all personal details');
      return;
    }
    if (form.password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setStep(2);
  };

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

          <div className="register-stepper" aria-label="Registration steps">
            <div className={`register-step${step === 1 ? ' active' : ' complete'}`}>
              <span>1</span>
              <b>Personal details</b>
            </div>
            <div className="register-step-line" />
            <div className={`register-step${step === 2 ? ' active' : ''}`}>
              <span>2</span>
              <b>Business details</b>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="auth-form register-form">
            {step === 1 ? (
              <>
                <div className="form-group">
                  <label className="form-label" htmlFor="register-name">Name <span>*</span></label>
                  <input id="register-name" className="form-input" {...f('name')} required autoComplete="name" />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="register-email">Email <span>*</span></label>
                  <input id="register-email" className="form-input" type="email" {...f('email')} required autoComplete="email" />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="register-password">Password <span>*</span></label>
                  <div className="auth-input-wrap">
                    <input id="register-password" className="form-input" type={showPass ? 'text' : 'password'} {...f('password')} required minLength={8} autoComplete="new-password" />
                    <button className="auth-visibility" type="button" onClick={() => setShowPass(!showPass)} aria-label={showPass ? 'Hide password' : 'Show password'}>{showPass ? <EyeOff size={17} /> : <Eye size={17} />}</button>
                  </div>
                </div>
                <button className="auth-submit" type="button" onClick={goToBusinessDetails}>
                  Next <ArrowRight size={17} />
                </button>
              </>
            ) : (
              <>
                <div className="form-group">
                  <label className="form-label" htmlFor="register-business">Business name <span>*</span></label>
                  <input id="register-business" className="form-input" {...f('businessName')} required autoComplete="organization" />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="register-phone">Phone</label>
                  <input id="register-phone" className="form-input" type="tel" {...f('phone')} autoComplete="tel" />
                </div>
                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label" htmlFor="register-upi">UPI ID</label>
                    <input id="register-upi" className="form-input" {...f('upiId')} />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="register-fssai">FSSAI number</label>
                    <input id="register-fssai" className="form-input" {...f('fssaiNo')} />
                  </div>
                </div>
                <div className="register-actions">
                  <button className="auth-back" type="button" onClick={() => setStep(1)} disabled={loading}>
                    <ArrowLeft size={17} /> Back
                  </button>
                  <button className="auth-submit" type="submit" disabled={loading}>
                    {loading ? 'Creating...' : <>Create account <ArrowRight size={17} /></>}
                  </button>
                </div>
              </>
            )}
          </form>

          <p className="auth-switch">Already have an account? <Link to="/login">Sign in</Link></p>
        </main>
      </div>
    </div>
  );
}
