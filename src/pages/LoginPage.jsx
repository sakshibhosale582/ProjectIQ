import React, { useContext, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AppContext } from '../context/AppContext';
import { Mail, Lock, ShieldCheck, Terminal, Layers, CheckCircle2, ArrowRight } from 'lucide-react';
import './Auth.css';

export default function LoginPage() {
  const { login } = useContext(AppContext);
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return alert('Please enter all fields');
    
    setIsLoading(true);
    setErrorMsg('');
    
    const res = await login(email, password);
    setIsLoading(false);
    
    if (res.success) {
      navigate('/dashboard');
    } else {
      setErrorMsg(res.message || 'Authentication failed. Please verify credentials.');
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    const res = await login('alex.carter@gmail.com', 'google-auth');
    setIsLoading(false);
    if (res.success) {
      navigate('/dashboard');
    } else {
      setErrorMsg('Google login failed.');
    }
  };

  return (
    <div className="auth-split-screen">
      {/* Form Side */}
      <div className="auth-form-side">
        <div className="auth-brand" onClick={() => navigate('/')}>
          <div className="logo-icon">IQ</div>
          <span className="logo-text">Project<span className="text-purple">IQ</span></span>
        </div>

        <div className="form-container-box">
          <div className="auth-welcome-text">
            <h2>Welcome Back</h2>
            <p>Access your codebase telemetry, architectural flow, and AI technical mentor.</p>
          </div>

          {errorMsg && (
            <div className="auth-error-banner">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-actual-form">
            <div className="form-group">
              <label className="form-label">Work Email</label>
              <div className="input-with-icon">
                <Mail size={16} className="input-icon" />
                <input 
                  type="email" 
                  className="form-input" 
                  placeholder="alex@projectiq.io" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="input-with-icon">
                <Lock size={16} className="input-icon" />
                <input 
                  type="password" 
                  className="form-input" 
                  placeholder="••••••••" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-meta-row">
              <label className="remember-checkbox">
                <input 
                  type="checkbox" 
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span>Remember session</span>
              </label>
              <a href="#forgot" className="forgot-password-link">Forgot password?</a>
            </div>

            <button type="submit" className="btn-primary auth-submit-btn" disabled={isLoading}>
              {isLoading ? 'Signing In...' : 'Sign In to Workspace'}
            </button>
          </form>

          <div className="auth-separator">
            <span>OR CONTINUE WITH</span>
          </div>

          <button className="btn-secondary google-auth-btn" onClick={handleGoogleLogin} disabled={isLoading}>
            <svg viewBox="0 0 24 24" width="18" height="18" className="google-icon-svg">
              <path fill="#EA4335" d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.47 15.02 0 12 0 7.35 0 3.4 2.67 1.5 6.57l3.79 2.93C6.18 6.58 8.87 5.04 12 5.04z" />
              <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.51h6.46c-.29 1.48-1.14 2.73-2.4 3.58v2.96h3.87c2.26-2.09 3.56-5.16 3.56-8.69z" />
              <path fill="#FBBC05" d="M5.29 14.78c-.25-.72-.39-1.5-.39-2.3s.14-1.58.39-2.3L1.5 7.25C.54 9.17 0 11.31 0 13.5s.54 4.33 1.5 6.25l3.79-2.97z" />
              <path fill="#34A853" d="M12 24c3.24 0 5.97-1.08 7.96-2.91l-3.87-2.96c-1.08.72-2.45 1.15-4.09 1.15-3.13 0-5.82-1.54-6.79-4.46L1.42 17.8C3.3 21.65 7.3 24 12 24z" />
            </svg>
            Sign In with Google
          </button>

          <p className="auth-footer-redirect">
            Don't have an account? <Link to="/register" className="auth-link">Create Account</Link>
          </p>
        </div>
      </div>

      {/* Visual Telemetry Side */}
      <div className="auth-visual-side">
        <div className="auth-telemetry-card">
          <div className="telemetry-card-header">
            <div className="flex-center-gap">
              <span className="telemetry-live-dot"></span>
              <span className="telemetry-system-label">ProjectIQ Telemetry Engine</span>
            </div>
            <span className="status-badge success">Online</span>
          </div>

          <div className="telemetry-highlights-list">
            <div className="telemetry-highlight-item">
              <div className="highlight-icon-wrap icon-purple">
                <Terminal size={16} />
              </div>
              <div className="highlight-text">
                <strong>Static AST Architecture Scanner</strong>
                <span>Deterministic extraction of endpoints, modules, and dependencies.</span>
              </div>
            </div>

            <div className="telemetry-highlight-item">
              <div className="highlight-icon-wrap icon-cyan">
                <Layers size={16} />
              </div>
              <div className="highlight-text">
                <strong>Multi-Language Code Graph</strong>
                <span>Instant dependency mapping across JS, TS, Python, Java, and Go.</span>
              </div>
            </div>

            <div className="telemetry-highlight-item">
              <div className="highlight-icon-wrap icon-green">
                <ShieldCheck size={16} />
              </div>
              <div className="highlight-text">
                <strong>AI-Powered Technical Assessment</strong>
                <span>Code-grounded viva questions based on your authentic functions.</span>
              </div>
            </div>
          </div>

          <div className="telemetry-stat-banner">
            <div className="telemetry-stat-box">
              <span className="stat-label">Analysis Speed</span>
              <strong className="stat-val text-purple">&lt; 1.2s</strong>
            </div>
            <div className="telemetry-stat-box">
              <span className="stat-label">Vulnerability Rules</span>
              <strong className="stat-val text-cyan">Enterprise</strong>
            </div>
            <div className="telemetry-stat-box">
              <span className="stat-label">AST Accuracy</span>
              <strong className="stat-val text-green">100%</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
