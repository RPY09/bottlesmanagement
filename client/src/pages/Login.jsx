import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { ArrowRight, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import '../styles/auth.css';
import logo from '../assets/logo.png';

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', form);
      login(data.token, data.user, data.refreshToken);
      toast.success(`Welcome back, ${data.user.name}!`);
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-shell">
        <aside className="auth-brand-panel">
          <div className="auth-brand">
            <img src={logo} alt="Hydro Business Manager" className="auth-brand-logo" />
            <div>
              <strong>Hydro</strong>
              <span>Business Manager</span>
            </div>
          </div>
          <div className="auth-brand-copy">
            <span className="auth-eyebrow">Water plant operations</span>
            <h1>Everything your business needs, in one clear view.</h1>
            <p>Track orders, collections, expenses and growth without the spreadsheet scramble.</p>
          </div>
          <div className="auth-trust"><ShieldCheck size={17} /> Your business data stays private</div>
        </aside>

        <main className="auth-card">
          <div className="auth-heading">
            <span className="auth-mobile-brand">Welcome back</span>
            <h2>Sign in to your account</h2>
            <p>Pick up where you left off in your business dashboard.</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label className="form-label" htmlFor="login-email">Email address</label>
              <input id="login-email" className="form-input" type="email" placeholder="you@business.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required autoComplete="email" />
            </div>
            <div className="form-group">
              <div className="auth-label-row">
                <label className="form-label" htmlFor="login-password">Password</label>
                <span className="auth-form-hint">Keep it secure</span>
              </div>
              <div className="auth-input-wrap">
                <input id="login-password" className="form-input" type={showPass ? 'text' : 'password'} placeholder="Enter your password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required autoComplete="current-password" />
                <button className="auth-visibility" type="button" onClick={() => setShowPass(!showPass)} aria-label={showPass ? 'Hide password' : 'Show password'}>{showPass ? <EyeOff size={17} /> : <Eye size={17} />}</button>
              </div>
            </div>

            <button className="auth-submit" type="submit" disabled={loading}>
              {loading ? 'Signing in...' : <>Sign in <ArrowRight size={17} /></>}
            </button>
          </form>

          <p className="auth-switch">Don't have an account? <Link to="/register">Create one</Link></p>
        </main>
      </div>
    </div>
  );
}
