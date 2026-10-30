import React, { useContext, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AppContext } from '../context/AppContext';
import { Mail, Lock, User, Terminal, Layers, ShieldCheck } from 'lucide-react';
import './Auth.css';

export default function RegisterPage() {
  const { register } = useContext(AppContext);
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !email || !password || !confirmPassword) {
      return setErrorMsg('Please fill in all registration fields.');
    }
    
    if (password !== confirmPassword) {
      return setErrorMsg('Passwords do not match. Please verify your entries.');
    }
    
    if (password.length < 6) {
      return setErrorMsg('Password must be at least 6 characters long.');
    }

    setIsLoading(true);
    setErrorMsg('');
    
    const res = await register(name, email, password);
    setIsLoading(false);
    
    if (res.success) {
      navigate('/dashboard');
    } else {
      setErrorMsg(res.message || 'Registration failed. Please check details.');
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    const res = await register('Alex Carter', 'alex.carter@gmail.com', 'google-auth');
    setIsLoading(false);
    if (res.success) {
      navigate('/dashboard');
    } else {
      setErrorMsg('Google registration failed.');
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
            <h2>Create Developer Account</h2>
            <p>Start analyzing your codebases and preparing for technical viva interviews.</p>
          </div>

          {errorMsg && (
            <div className="auth-error-banner">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-actual-form">
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <div className="input-with-icon">
                <User size={16} className="input-icon" />
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Alex Carter" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            </div>

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

            <div className="form-group">
              <label className="form-label">Confirm Password</label>
              <div className="input-with-icon">
                <Lock size={16} className="input-icon" />
                <input 
                  type="password" 
                  className="form-input" 
                  placeholder="••••••••" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn-primary auth-submit-btn" disabled={isLoading}>
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          <div className="auth-separator">
            <span>OR REGISTER WITH</span>
          </div>

          <button className="btn-secondary google-auth-btn" onClick={handleGoogleLogin} disabled={isLoading}>
            <svg viewBox="0 0 24 24" width="18" height="18" className="google-icon-svg">
              <path fill="#EA4335" d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.47 15.02 0 12 0 7.35 0 3.4 2.67 1.5 6.57l3.79 2.93C6.18 6.58 8.87 5.04 12 5.04z" />
              <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.51h6.46c-.29 1.48-1.14 2.73-2.4 3.58v2.96h3.87c2.26-2.09 3.56-5.16 3.56-8.69z" />
              <path fill="#FBBC05" d="M5.29 14.78c-.25-.72-.39-1.5-.39-2.3s.14-1.58.39-2.3L1.5 7.25C.54 9.17 0 11.31 0 13.5s.54 4.33 1.5 6.25l3.79-2.97z" />
              <path fill="#34A853" d="M12 24c3.24 0 5.97-1.08 7.96-2.91l-3.87-2.96c-1.08.72-2.45 1.15-4.09 1.15-3.13 0-5.82-1.54-6.79-4.46L1.42 17.8C3.3 21.65 7.3 24 12 24z" />
            </svg>
            Sign Up with Google
          </button>

          <p className="auth-footer-redirect">
            Already have an account? <Link to="/login" className="auth-link">Sign In</Link>
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
                <strong>Instant Project Upload & Parsing</strong>
                <span>Drag-and-drop any ZIP archive for instantaneous structural extraction.</span>
              </div>
            </div>

            <div className="telemetry-highlight-item">
              <div className="highlight-icon-wrap icon-cyan">
                <Layers size={16} />
              </div>
              <div className="highlight-text">
                <strong>Structured Learning Roadmap</strong>
                <span>Transform complex code folders into step-by-step master syllabi.</span>
              </div>
            </div>

            <div className="telemetry-highlight-item">
              <div className="highlight-icon-wrap icon-green">
                <ShieldCheck size={16} />
              </div>
              <div className="highlight-text">
                <strong>Comprehensive PDF Readiness Reports</strong>
                <span>Generate printable executive summaries of technical strengths and viva readiness.</span>
              </div>
            </div>
          </div>

          <div className="telemetry-stat-banner">
            <div className="telemetry-stat-box">
              <span className="stat-label">Analysis Speed</span>
              <strong className="stat-val text-purple">&lt; 1.2s</strong>
            </div>
            <div className="telemetry-stat-box">
              <span className="stat-label">Security Scanner</span>
              <strong className="stat-val text-cyan">Standard</strong>
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
