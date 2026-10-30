import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Terminal, Search, Award, Brain, Shield, Layers, FileCode, CheckCircle2, ChevronRight } from 'lucide-react';
import './LandingPage.css';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="landing-container">
      {/* Header Navigation */}
      <header className="landing-header">
        <div className="landing-logo" onClick={() => navigate('/')}>
          <div className="logo-icon">IQ</div>
          <span className="logo-text">Project<span className="text-purple">IQ</span></span>
        </div>
        <div className="landing-nav-links">
          <a href="#features">Capabilities</a>
          <a href="#preview">Platform</a>
          <button className="btn-secondary btn-sm" onClick={() => navigate('/login')}>Sign In</button>
          <button className="btn-primary btn-sm" onClick={() => navigate('/register')}>Get Started</button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-text-content">
          <div className="enterprise-badge">
            <span className="badge-dot"></span>
            Enterprise Code Intelligence & Technical Readiness
          </div>
          <h1 className="hero-title">
            Understand your codebase.<br />
            <span className="text-highlight">Excel in technical interviews.</span>
          </h1>
          <p className="hero-subtitle">
            Upload your project archive to instantly map module boundaries, trace architectural flow, audit security vulnerabilities, and prepare for oral viva and technical interviews with AI.
          </p>
          <div className="hero-cta-group">
            <button className="btn-primary btn-large" onClick={() => navigate('/upload')}>
              Analyze Your Codebase <ArrowRight size={17} />
            </button>
            <button className="btn-secondary btn-large" onClick={() => navigate('/dashboard')}>
              Explore Workspace
            </button>
          </div>
          <div className="hero-metrics-strip">
            <div className="hero-metric-item">
              <strong>100%</strong>
              <span>Deterministic AST Analysis</span>
            </div>
            <div className="hero-metric-divider"></div>
            <div className="hero-metric-item">
              <strong>Multi-Lang</strong>
              <span>JS, TS, Python, Java, Go</span>
            </div>
            <div className="hero-metric-divider"></div>
            <div className="hero-metric-item">
              <strong>Zero</strong>
              <span>Hallucinated Dependencies</span>
            </div>
          </div>
        </div>

        {/* Enterprise Platform Window Preview */}
        <div className="hero-preview-container" id="preview">
          <div className="preview-window-frame">
            <div className="window-titlebar">
              <div className="window-controls">
                <span className="ctrl-dot"></span>
                <span className="ctrl-dot"></span>
                <span className="ctrl-dot"></span>
              </div>
              <div className="window-title">projectiq.workspace / telemetry-flow</div>
              <div className="window-badge">Live Index</div>
            </div>

            <div className="preview-window-body">
              {/* Telemetry Header */}
              <div className="preview-app-header">
                <div className="preview-project-meta">
                  <div className="preview-project-name">OmniCommerce Core</div>
                  <div className="preview-tags">
                    <span className="tech-chip">React</span>
                    <span className="tech-chip">Express</span>
                    <span className="tech-chip">MongoDB</span>
                  </div>
                </div>
                <div className="preview-readiness-pill">
                  <span className="readiness-label">Interview Readiness</span>
                  <strong className="readiness-value text-green">87%</strong>
                </div>
              </div>

              {/* Split Workspace View */}
              <div className="preview-app-grid">
                {/* Code Inspection Panel */}
                <div className="preview-pane code-pane">
                  <div className="pane-header">
                    <div className="flex-center-gap">
                      <Terminal size={13} className="text-purple" />
                      <span>middleware/authProtect.js</span>
                    </div>
                    <span className="pane-badge">Verified</span>
                  </div>
                  <div className="code-editor-preview">
                    <div className="line-row"><span className="ln">1</span><span className="code-text"><span className="kw">const</span> protect = <span className="kw">async</span> (req, res, next) =&gt; &#123;</span></div>
                    <div className="line-row"><span className="ln">2</span><span className="code-text">&nbsp;&nbsp;<span className="kw">const</span> token = req.headers.authorization;</span></div>
                    <div className="line-row"><span className="ln">3</span><span className="code-text">&nbsp;&nbsp;<span className="kw">if</span> (token &amp;&amp; token.startsWith(<span className="str">'Bearer'</span>)) &#123;</span></div>
                    <div className="line-row"><span className="ln">4</span><span className="code-text">&nbsp;&nbsp;&nbsp;&nbsp;<span className="kw">const</span> decoded = jwt.verify(token, SECRET);</span></div>
                    <div className="line-row"><span className="ln">5</span><span className="code-text">&nbsp;&nbsp;&nbsp;&nbsp;req.user = <span className="kw">await</span> User.findById(decoded.id);</span></div>
                    <div className="line-row"><span className="ln">6</span><span className="code-text">&nbsp;&nbsp;&nbsp;&nbsp;<span className="kw">return</span> next();</span></div>
                    <div className="line-row"><span className="ln">7</span><span className="code-text">&nbsp;&nbsp;&#125;</span></div>
                    <div className="line-row"><span className="ln">8</span><span className="code-text">&nbsp;&nbsp;res.status(<span className="num">401</span>).json(&#123; message: <span className="str">'Unauthorized'</span> &#125;);</span></div>
                    <div className="line-row"><span className="ln">9</span><span className="code-text">&#125;;</span></div>
                  </div>
                </div>

                {/* AI Telemetry & Assessment Panel */}
                <div className="preview-pane telemetry-pane">
                  <div className="pane-header">
                    <div className="flex-center-gap">
                      <Brain size={13} className="text-cyan" />
                      <span>Code Telemetry & AI Mentor</span>
                    </div>
                    <span className="status-badge success">Grounded</span>
                  </div>
                  <div className="telemetry-items">
                    <div className="telemetry-item">
                      <CheckCircle2 size={14} className="text-green" />
                      <div className="item-text">
                        <strong>JWT Authenticator detected</strong>
                        <span>Validated against process.env.JWT_SECRET</span>
                      </div>
                    </div>
                    <div className="telemetry-item">
                      <Shield size={14} className="text-cyan" />
                      <div className="item-text">
                        <strong>REST API Route Guard</strong>
                        <span>Applied to 14 private endpoints</span>
                      </div>
                    </div>
                    <div className="telemetry-item ai-focus-item">
                      <div className="focus-header">
                        <span className="focus-badge">Viva Interview Prep</span>
                      </div>
                      <p className="focus-desc">
                        "Be prepared to explain token signature verification vs payload decryption during your architecture viva."
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid Section */}
      <section id="features" className="features-section">
        <div className="features-header">
          <h2 className="section-title">The Complete Codebase Readiness Engine</h2>
          <p className="section-subtitle">
            Enterprise static telemetry and AI-driven technical preparation tailored specifically to what you built.
          </p>
        </div>
        <div className="features-grid">
          <div className="glass-card feature-card">
            <div className="icon-wrapper purple"><Search size={22} /></div>
            <h3>Static Code Intelligence</h3>
            <p>Direct AST analysis resolves relative imports, maps dependencies, and isolates modules with 100% determinism.</p>
          </div>
          <div className="glass-card feature-card">
            <div className="icon-wrapper cyan"><Layers size={22} /></div>
            <h3>Architectural Flow</h3>
            <p>Interactive dependency DAG visualizes entry points, controller pipelines, database models, and external services.</p>
          </div>
          <div className="glass-card feature-card">
            <div className="icon-wrapper green"><Award size={22} /></div>
            <h3>Grounded Mock Viva</h3>
            <p>Simulate technical interviews with code-grounded questions targeting your exact functions, error handlers, and schemas.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
