import React, { useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../context/AppContext';
import { 
  UploadCloud, ArrowRight, Brain, Clock, 
  Sparkles, CheckCircle2, Circle, Play, 
  Layers, ShieldCheck, FileSearch, MessageSquareCode,
  FileCode, Activity, Mic, GitBranch, Zap, 
  TrendingUp, BookOpen, Target, Code2, Shield
} from 'lucide-react';
import './Dashboard.css';

// simple wording: modern dashboard with active project overview, quick access hub, and assessment readiness
export default function Dashboard() {
  const { user, activeProject, roadmap, API_BASE } = useContext(AppContext);
  const navigate = useNavigate();

  // null means "no real data yet" and is displayed as "Not enough data" (never a made-up number)
  const [metrics, setMetrics] = useState({
    readiness: null,
    quizAvg: null,
    vivaAvg: null,
    interviewAvg: null,
    progress: null,
    weakAreas: [],
    recommendations: [],
    strengths: []
  });

  // Safe formatted date helper for dashboard display
  const getFormattedDate = () => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  useEffect(() => {
    const fetchDashboardAnalytics = async () => {
      if (!activeProject) return;
      const token = localStorage.getItem('projectiq_token');
      if (!token) return;

      const projectId = activeProject._id || activeProject.id;
      try {
        const res = await fetch(`${API_BASE}/prepare/${projectId}/readiness`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setMetrics(prev => ({
            ...prev,
            readiness: data.readinessIndex ?? null,
            quizAvg: data.quizAvg ?? null,
            vivaAvg: data.vivaAvg ?? null,
            interviewAvg: data.interviewAvg ?? null,
            progress: data.progressPct ?? null,
            weakAreas: data.weakAreas || [],
            recommendations: data.recommendations || [],
            strengths: data.strengths || []
          }));
        }
      } catch (err) {
        console.error('[Dashboard Metrics Error]:', err);
      }
    };

    fetchDashboardAnalytics();
  }, [activeProject?._id, activeProject?.id, API_BASE]);

  // Reusable Mini Progress Bar
  const MiniProgressBar = ({ value, color, label }) => {
    const hasValue = typeof value === 'number';
    return (
      <div className="mini-progress-item">
        <div className="mini-progress-header">
          <span className="mini-progress-label">{label}</span>
          <span className={`mini-progress-value ${color}`}>{hasValue ? `${value}%` : '—'}</span>
        </div>
        <div className="mini-progress-track">
          <div 
            className={`mini-progress-fill ${color}`}
            style={{ width: hasValue ? `${value}%` : '0%' }}
          />
        </div>
      </div>
    );
  };

  /* ── EMPTY STATE (no project uploaded) ── */
  if (!activeProject) {
    return (
      <div className="dashboard-page-container">
        <div className="dash-empty-state">
          {/* Left: Illustration & Message */}
          <div className="empty-left-panel">
            <div className="empty-illustration-wrap">
              <svg viewBox="0 0 400 320" fill="none" xmlns="http://www.w3.org/2000/svg" className="empty-hero-svg">
                {/* Background shapes */}
                <rect x="60" y="40" width="280" height="220" rx="16" fill="var(--bg-card-subtle)" stroke="var(--border-color)" strokeWidth="1.5"/>
                {/* Screen header */}
                <rect x="60" y="40" width="280" height="36" rx="16" fill="var(--bg-card)" stroke="var(--border-color)" strokeWidth="1.5"/>
                <rect x="60" y="60" width="280" height="16" fill="var(--bg-card)"/>
                <circle cx="80" cy="58" r="5" fill="#ef4444" opacity="0.6"/>
                <circle cx="96" cy="58" r="5" fill="#f59e0b" opacity="0.6"/>
                <circle cx="112" cy="58" r="5" fill="#10b981" opacity="0.6"/>
                {/* Upload cloud icon */}
                <g transform="translate(160, 120)">
                  <rect x="0" y="25" width="80" height="60" rx="8" fill="var(--accent-purple-light)" stroke="var(--border-purple)" strokeWidth="1.5" strokeDasharray="6 3"/>
                  <path d="M40 45 L40 65 M30 55 L40 45 L50 55" stroke="var(--accent-purple)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <text x="40" y="80" textAnchor="middle" fill="var(--text-muted)" fontSize="8" fontWeight="600">.ZIP</text>
                </g>
                {/* Floating tech badges */}
                <rect x="80" y="100" width="56" height="22" rx="6" fill="var(--bg-card)" stroke="var(--border-color)" strokeWidth="1"/>
                <text x="108" y="115" textAnchor="middle" fill="var(--accent-cyan)" fontSize="8" fontWeight="600">React</text>
                <rect x="264" y="110" width="56" height="22" rx="6" fill="var(--bg-card)" stroke="var(--border-color)" strokeWidth="1"/>
                <text x="292" y="125" textAnchor="middle" fill="var(--accent-green)" fontSize="8" fontWeight="600">Node.js</text>
                <rect x="90" y="210" width="60" height="22" rx="6" fill="var(--bg-card)" stroke="var(--border-color)" strokeWidth="1"/>
                <text x="120" y="225" textAnchor="middle" fill="var(--accent-purple)" fontSize="8" fontWeight="600">Python</text>
                <rect x="250" y="200" width="70" height="22" rx="6" fill="var(--bg-card)" stroke="var(--border-color)" strokeWidth="1"/>
                <text x="285" y="215" textAnchor="middle" fill="var(--accent-amber)" fontSize="8" fontWeight="600">MongoDB</text>
                {/* Arrows connecting */}
                <path d="M136 111 L160 135" stroke="var(--border-strong)" strokeWidth="1" strokeDasharray="3 2"/>
                <path d="M264 121 L240 140" stroke="var(--border-strong)" strokeWidth="1" strokeDasharray="3 2"/>
              </svg>
            </div>
            <div className="empty-text-content">
              <h1>Welcome to ProjectIQ</h1>
              <p>
                Upload a project ZIP archive to unlock AI-powered code analysis, 
                interactive architecture mapping, security audits, and personalized 
                technical interview preparation.
              </p>
              <div className="empty-cta-row">
                <button className="btn-primary btn-large" onClick={() => navigate('/upload')}>
                  <UploadCloud size={18} /> Upload Project ZIP
                </button>
              </div>
            </div>
          </div>

          {/* Right: Feature highlights */}
          <div className="empty-right-panel">
            <h3 className="panel-label">What you'll get</h3>
            <div className="feature-highlight-list">
              <div className="feature-highlight-item">
                <div className="fh-icon icon-purple"><Layers size={18} /></div>
                <div className="fh-text">
                  <strong>Architecture Flow</strong>
                  <span>Interactive dependency graph of your entire codebase</span>
                </div>
              </div>
              <div className="feature-highlight-item">
                <div className="fh-icon icon-cyan"><Shield size={18} /></div>
                <div className="fh-text">
                  <strong>Security Audit</strong>
                  <span>Detect hardcoded secrets, CORS issues & vulnerabilities</span>
                </div>
              </div>
              <div className="feature-highlight-item">
                <div className="fh-icon icon-green"><Brain size={18} /></div>
                <div className="fh-text">
                  <strong>AI Mentor Chat</strong>
                  <span>Ask questions about your own code with grounded answers</span>
                </div>
              </div>
              <div className="feature-highlight-item">
                <div className="fh-icon icon-amber"><Target size={18} /></div>
                <div className="fh-text">
                  <strong>Interview Prep</strong>
                  <span>Quiz, viva & mock interviews based on your actual code</span>
                </div>
              </div>
              <div className="feature-highlight-item">
                <div className="fh-icon icon-purple"><BookOpen size={18} /></div>
                <div className="fh-text">
                  <strong>Learning Roadmap</strong>
                  <span>Step-by-step syllabus generated from your project modules</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── ACTIVE PROJECT DASHBOARD (two‑panel) ── */
  return (
    <div className="dashboard-page-container">

      {/* ═══════════ TOP: Welcome Banner with inline illustration ═══════════ */}
      <div className="dash-hero-banner">
        <div className="hero-banner-text">
          <span className="date-badge">{getFormattedDate()}</span>
          <h1>{getGreeting()}, {user?.name?.split(' ')[0] || 'Developer'}</h1>
          <p>Your codebase telemetry and interview readiness command center.</p>
          <div className="hero-banner-actions">
            <button className="btn-primary" onClick={() => navigate('/analysis/overview')}>
              <FileSearch size={15} /> View Telemetry
            </button>
            <button className="btn-secondary" onClick={() => navigate('/upload')}>
              <UploadCloud size={15} /> New Upload
            </button>
          </div>
        </div>
        <div className="hero-banner-visual">
          <svg viewBox="0 0 320 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="hero-illustration-svg">
            {/* Central dashboard frame */}
            <rect x="40" y="20" width="240" height="160" rx="12" fill="var(--bg-card)" stroke="var(--border-color)" strokeWidth="1.5"/>
            <rect x="40" y="20" width="240" height="28" rx="12" fill="var(--bg-card-subtle)" stroke="var(--border-color)" strokeWidth="1.5"/>
            <rect x="40" y="38" width="240" height="10" fill="var(--bg-card-subtle)"/>
            <circle cx="56" cy="34" r="4" fill="var(--accent-red)" opacity="0.5"/>
            <circle cx="68" cy="34" r="4" fill="var(--accent-amber)" opacity="0.5"/>
            <circle cx="80" cy="34" r="4" fill="var(--accent-green)" opacity="0.5"/>
            {/* Metrics bars */}
            <rect x="60" y="60" width="100" height="8" rx="4" fill="var(--border-color)"/>
            <rect x="60" y="60" width="72" height="8" rx="4" fill="var(--accent-purple)"/>
            <rect x="60" y="78" width="100" height="8" rx="4" fill="var(--border-color)"/>
            <rect x="60" y="78" width="85" height="8" rx="4" fill="var(--accent-cyan)"/>
            <rect x="60" y="96" width="100" height="8" rx="4" fill="var(--border-color)"/>
            <rect x="60" y="96" width="60" height="8" rx="4" fill="var(--accent-green)"/>
            {/* Mini code lines */}
            <rect x="180" y="60" width="80" height="6" rx="3" fill="var(--accent-purple)" opacity="0.15"/>
            <rect x="180" y="72" width="65" height="6" rx="3" fill="var(--accent-purple)" opacity="0.1"/>
            <rect x="180" y="84" width="75" height="6" rx="3" fill="var(--accent-purple)" opacity="0.15"/>
            <rect x="180" y="96" width="55" height="6" rx="3" fill="var(--accent-purple)" opacity="0.1"/>
            {/* Bottom stats */}
            <rect x="60" y="120" width="48" height="40" rx="6" fill="var(--accent-purple-light)" stroke="var(--border-purple)" strokeWidth="1"/>
            <text x="84" y="140" textAnchor="middle" fill="var(--accent-purple)" fontSize="11" fontWeight="800">{activeProject.metrics?.totalFiles || '—'}</text>
            <text x="84" y="152" textAnchor="middle" fill="var(--text-muted)" fontSize="6" fontWeight="600">FILES</text>
            <rect x="118" y="120" width="48" height="40" rx="6" fill="var(--accent-cyan-light)" stroke="var(--border-cyan)" strokeWidth="1"/>
            <text x="142" y="140" textAnchor="middle" fill="var(--accent-cyan)" fontSize="11" fontWeight="800">{activeProject.metrics?.apiEndpointsCount || '—'}</text>
            <text x="142" y="152" textAnchor="middle" fill="var(--text-muted)" fontSize="6" fontWeight="600">APIs</text>
            <rect x="176" y="120" width="48" height="40" rx="6" fill="var(--accent-green-light)" stroke="var(--border-green)" strokeWidth="1"/>
            <text x="200" y="140" textAnchor="middle" fill="var(--accent-green)" fontSize="11" fontWeight="800">{(activeProject.modules || []).length || '—'}</text>
            <text x="200" y="152" textAnchor="middle" fill="var(--text-muted)" fontSize="6" fontWeight="600">MODULES</text>
            {/* Checkmark badge */}
            <circle cx="256" cy="140" r="16" fill="var(--accent-green-light)" stroke="var(--border-green)" strokeWidth="1.5"/>
            <path d="M249 140 L254 145 L263 136" stroke="var(--accent-green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>

      {/* ═══════════ MAIN: Two-Panel Layout ═══════════ */}
      <div className="dash-two-panel">

        {/* ── LEFT PANEL: Project + AI Mentor + Roadmap ── */}
        <div className="dash-panel-left">

          {/* Active Project Card */}
          <div className="dash-card project-card">
            <div className="dash-card-header">
              <div className="flex-center-gap">
                <Code2 size={16} className="text-purple" />
                <h3>Active Project</h3>
              </div>
              <div className="flex-center-gap">
                <span className="status-badge success">Analyzed</span>
              </div>
            </div>
            <div className="project-card-body">
              <h2 className="project-title">{activeProject.name || 'Unnamed Project'}</h2>
              <p className="project-desc">{activeProject.description || 'Codebase analyzed and loaded into workspace.'}</p>
              {activeProject.techStack && activeProject.techStack.length > 0 && (
                <div className="tech-stack-row">
                  {activeProject.techStack.map((tech, idx) => (
                    <span key={idx} className="tech-chip">{tech}</span>
                  ))}
                </div>
              )}
              <div className="project-stats-row">
                <div className="project-stat">
                  <FileCode size={14} className="text-purple" />
                  <span>{activeProject.metrics?.totalFiles || 0} files</span>
                </div>
                <div className="project-stat">
                  <Activity size={14} className="text-cyan" />
                  <span>{activeProject.metrics?.apiEndpointsCount || 0} endpoints</span>
                </div>
                <div className="project-stat">
                  <Layers size={14} className="text-green" />
                  <span>{activeProject.metrics?.linesOfCode?.toLocaleString() || 0} LOC</span>
                </div>
              </div>
              <div className="project-action-bar">
                <button className="btn-primary" onClick={() => navigate('/analysis/architecture')}>
                  Explore Architecture <ArrowRight size={14} />
                </button>
                <button className="btn-secondary" onClick={() => navigate('/analysis/overview')}>
                  Overview
                </button>
              </div>
            </div>
          </div>

          {/* AI Mentor Card */}
          <div className="dash-card mentor-card">
            <div className="dash-card-header">
              <div className="flex-center-gap">
                <Brain size={16} className="text-cyan" />
                <h3>AI Project Mentor</h3>
              </div>
              <span className="status-badge info">Smart</span>
            </div>
            <div className="mentor-card-body">
              <div className="mentor-insight-box">
                <Sparkles size={14} className="text-purple" />
                <p>
                  {metrics.weakAreas && metrics.weakAreas.length > 0 ? (
                    <>Focus on <strong>{metrics.weakAreas[0]}</strong>. Recommended: <em>{metrics.recommendations[0] || 'core architecture concepts'}</em>.</>
                  ) : (
                    <>Project structure is fully indexed. Take a quiz or start a mock interview to measure your readiness.</>
                  )}
                </p>
              </div>
              <div className="mentor-action-row">
                <button className="btn-primary" onClick={() => navigate('/chat')}>
                  <MessageSquareCode size={14} /> Ask Mentor
                </button>
                <button className="btn-secondary" onClick={() => navigate('/quiz')}>
                  <Play size={14} /> Start Quiz
                </button>
              </div>
            </div>
          </div>

          {/* Learning Roadmap Preview */}
          <div className="dash-card roadmap-card">
            <div className="dash-card-header">
              <div className="flex-center-gap">
                <GitBranch size={16} className="text-green" />
                <h3>Learning Roadmap</h3>
              </div>
              <button className="btn-link" onClick={() => navigate('/learning-path')}>
                View All <ArrowRight size={13} />
              </button>
            </div>
            <div className="roadmap-card-body">
              {roadmap && roadmap.length > 0 ? (
                <div className="roadmap-mini-list">
                  {roadmap.slice(0, 4).map((node) => (
                    <div key={node.id} className={`roadmap-mini-row ${node.status}`}>
                      <div className="roadmap-mini-bullet">
                        {node.status === 'completed' ? (
                          <CheckCircle2 size={15} className="text-green" />
                        ) : node.status === 'in-progress' ? (
                          <div className="in-progress-dot" />
                        ) : (
                          <Circle size={15} className="text-muted" />
                        )}
                      </div>
                      <span className="roadmap-mini-name">{node.name}</span>
                      <span className="roadmap-mini-time"><Clock size={11} /> {node.duration || '20 min'}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="empty-roadmap-text">Visit the Learning Path tab to initialize your personalized roadmap.</p>
              )}
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL: Metrics + Quick Actions ── */}
        <div className="dash-panel-right">

          {/* Assessment Readiness */}
          <div className="dash-card readiness-card">
            <div className="dash-card-header">
              <div className="flex-center-gap">
                <TrendingUp size={16} className="text-purple" />
                <h3>Assessment Readiness</h3>
              </div>
            </div>
            <div className="readiness-card-body">
              {/* Hero readiness score */}
              <div className="readiness-hero-row">
                <div className="readiness-ring-wrap">
                  <svg viewBox="0 0 100 100" className="readiness-ring-svg">
                    <circle cx="50" cy="50" r="40" fill="none" stroke="var(--border-color)" strokeWidth="8"/>
                    <circle cx="50" cy="50" r="40" fill="none" stroke="var(--accent-green)" strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={2 * Math.PI * 40}
                      strokeDashoffset={2 * Math.PI * 40 - (2 * Math.PI * 40 * (typeof metrics.readiness === 'number' ? metrics.readiness : 0)) / 100}
                      transform="rotate(-90 50 50)"
                      style={{ transition: 'stroke-dashoffset 0.6s ease' }}
                    />
                  </svg>
                  <div className="readiness-ring-label">
                    <span className="ring-score">{typeof metrics.readiness === 'number' ? `${metrics.readiness}%` : '—'}</span>
                    <span className="ring-subtitle">Ready</span>
                  </div>
                </div>
                <div className="readiness-bars-stack">
                  <MiniProgressBar value={metrics.quizAvg} color="purple" label="Quiz Score" />
                  <MiniProgressBar value={metrics.vivaAvg} color="cyan" label="Viva Score" />
                  <MiniProgressBar value={metrics.interviewAvg} color="green" label="Mock Interview" />
                  <MiniProgressBar value={metrics.progress} color="amber" label="Roadmap Progress" />
                </div>
              </div>
            </div>
          </div>

          {/* Quick Access Grid */}
          <div className="dash-card quick-access-card">
            <div className="dash-card-header">
              <div className="flex-center-gap">
                <Zap size={16} className="text-amber" />
                <h3>Quick Access</h3>
              </div>
            </div>
            <div className="quick-access-grid">
              <div className="qa-tile" onClick={() => navigate('/analysis/architecture')}>
                <div className="qa-tile-icon icon-purple"><Layers size={20} /></div>
                <span className="qa-tile-label">Architecture</span>
              </div>
              <div className="qa-tile" onClick={() => navigate('/analysis/issues')}>
                <div className="qa-tile-icon icon-danger"><ShieldCheck size={20} /></div>
                <span className="qa-tile-label">Security</span>
              </div>
              <div className="qa-tile" onClick={() => navigate('/analysis/files')}>
                <div className="qa-tile-icon icon-cyan"><FileSearch size={20} /></div>
                <span className="qa-tile-label">Files</span>
              </div>
              <div className="qa-tile" onClick={() => navigate('/chat')}>
                <div className="qa-tile-icon icon-green"><MessageSquareCode size={20} /></div>
                <span className="qa-tile-label">AI Chat</span>
              </div>
              <div className="qa-tile" onClick={() => navigate('/quiz')}>
                <div className="qa-tile-icon icon-purple"><Target size={20} /></div>
                <span className="qa-tile-label">Quiz & Viva</span>
              </div>
              <div className="qa-tile" onClick={() => navigate('/mock-interview')}>
                <div className="qa-tile-icon icon-amber"><Mic size={20} /></div>
                <span className="qa-tile-label">Interview</span>
              </div>
            </div>
          </div>

          {/* Strengths & Improvements */}
          <div className="dash-card insights-card">
            <div className="dash-card-header">
              <div className="flex-center-gap">
                <Sparkles size={16} className="text-green" />
                <h3>AI Insights</h3>
              </div>
            </div>
            <div className="insights-card-body">
              {metrics.strengths && metrics.strengths.length > 0 ? (
                <div className="insights-list">
                  {metrics.strengths.slice(0, 2).map((s, i) => (
                    <div key={`s-${i}`} className="insight-row insight-positive">
                      <CheckCircle2 size={14} className="text-green" />
                      <span>{s}</span>
                    </div>
                  ))}
                  {metrics.weakAreas.slice(0, 2).map((w, i) => (
                    <div key={`w-${i}`} className="insight-row insight-improve">
                      <Target size={14} className="text-amber" />
                      <span>{w}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="insights-empty">
                  <div className="insights-empty-illustration">
                    <svg viewBox="0 0 120 80" fill="none" className="insights-mini-svg">
                      <rect x="10" y="10" width="100" height="60" rx="8" fill="var(--bg-card-subtle)" stroke="var(--border-color)" strokeWidth="1"/>
                      <rect x="22" y="25" width="40" height="5" rx="2.5" fill="var(--accent-purple)" opacity="0.3"/>
                      <rect x="22" y="35" width="55" height="5" rx="2.5" fill="var(--accent-cyan)" opacity="0.2"/>
                      <rect x="22" y="45" width="30" height="5" rx="2.5" fill="var(--accent-green)" opacity="0.3"/>
                      <circle cx="88" cy="38" r="14" fill="var(--accent-purple-light)" stroke="var(--border-purple)" strokeWidth="1"/>
                      <path d="M83 38 L87 42 L93 34" stroke="var(--accent-purple)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <p>Complete a quiz or mock interview to see personalized AI insights and improvement areas.</p>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
