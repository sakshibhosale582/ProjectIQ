import React, { useContext, useState, useEffect } from 'react';
import { AppContext } from '../context/AppContext';
import { 
  Mail, Cpu, ClipboardCheck, Mic, ChevronRight, Play,
  Sun, Moon, LogOut, Check, Palette, FileCode, Server
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './Profile.css';

export default function Profile() {
  const { user, projects, activeProject, API_BASE, theme, toggleTheme, logout } = useContext(AppContext);
  const navigate = useNavigate();

  // Simple wording: Handler to logout and return to login page
  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  
  // null = no real data yet: show text instead of a made-up number
  const fmtPct = (v) => (typeof v === 'number' ? `${v}%` : 'Not enough data');
  const barPct = (v) => (typeof v === 'number' ? v : 0);
  const [profileMetrics, setProfileMetrics] = useState({
    quizAvg: null,
    vivaAvg: null,
    interviewAvg: null,
    progressPct: null,
    readinessIndex: null,
    weakAreas: [],
    recommendations: [],
    strengths: []
  });

  useEffect(() => {
    const fetchAnalytics = async () => {
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
          setProfileMetrics({
            quizAvg: data.quizAvg ?? null,
            vivaAvg: data.vivaAvg ?? null,
            interviewAvg: data.interviewAvg ?? null,
            progressPct: data.progressPct ?? null,
            readinessIndex: data.readinessIndex ?? null,
            weakAreas: data.weakAreas || [],
            recommendations: data.recommendations || [],
            strengths: data.strengths || []
          });
        }
      } catch (err) {
        console.error('Failed to load profile metrics:', err);
      }
    };

    fetchAnalytics();
  }, [activeProject, API_BASE]);

  const handleStartPractice = (topic) => {
    navigate(`/quiz?topic=${encodeURIComponent(topic)}`);
  };

  return (
    <div className="profile-page-container">
      {/* Header Profile card */}
      <div className="profile-hero-card glass-card glow-purple">
        <div className="profile-main-meta">
          <div className="profile-avatar-large">
            {(user?.name || 'Developer').split(' ').filter(Boolean).map(n => n[0]).join('') || 'D'}
          </div>
          <div className="profile-credentials">
            <h2>{user?.name || 'Developer'}</h2>
            <p className="email-meta"><Mail size={12} /> {user?.email}</p>
          </div>
        </div>

        <div className="profile-metrics-row">
          <div className="metric-box">
            <Cpu size={22} className="text-cyan" />
            <div className="val">{projects.length}</div>
            <p>Projects Uploaded</p>
          </div>
          <div className="metric-box">
            <FileCode size={22} className="text-purple" />
            <div className="val">{projects.reduce((acc, p) => acc + (p.metrics?.totalFiles || 0), 0)}</div>
            <p>Files Scanned</p>
          </div>
          <div className="metric-box">
            <Server size={22} className="text-green" />
            <div className="val">{projects.reduce((acc, p) => acc + (p.endpointRoutes?.length || 0), 0)}</div>
            <p>Audited Routes</p>
          </div>
        </div>
      </div>

      <div className="profile-grid">
        {/* Left column: Reworked Progress Tracking */}
        <div className="col-7 profile-column-group">
          {/* Reworked Preparation Progress (Section 17) */}
          <div className="glass-card calendar-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="card-top-header">
              <h3><ClipboardCheck size={16} className="text-purple" /> Project Preparation Progress</h3>
              <span className="active-project-badge">Active Project: {activeProject?.name || 'None'}</span>
            </div>
            <p className="calendar-explanation-text" style={{ marginBottom: '0.5rem' }}>
              Real-time progress derived dynamically from your stored codebase analysis and assessment scorecard submissions.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem' }}>
              {/* Metric 1 */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.25rem', color: 'var(--text-secondary)' }}>
                  <span>Project Analysis</span>
                  <strong>{activeProject ? '100%' : '0%'}</strong>
                </div>
                <div className="readiness-progress-bar-bg" style={{ height: '8px' }}>
                  <div className="readiness-progress-fill purple" style={{ width: activeProject ? '100%' : '0%', height: '100%' }}></div>
                </div>
              </div>

              {/* Metric 2 */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.25rem', color: 'var(--text-secondary)' }}>
                  <span>Learning Path</span>
                  <strong>{fmtPct(profileMetrics.progressPct)}</strong>
                </div>
                <div className="readiness-progress-bar-bg" style={{ height: '8px' }}>
                  <div className="readiness-progress-fill cyan" style={{ width: `${barPct(profileMetrics.progressPct)}%`, height: '100%' }}></div>
                </div>
              </div>

              {/* Metric 3 */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.25rem', color: 'var(--text-secondary)' }}>
                  <span>Quiz (MCQ Average)</span>
                  <strong>{fmtPct(profileMetrics.quizAvg)}</strong>
                </div>
                <div className="readiness-progress-bar-bg" style={{ height: '8px' }}>
                  <div className="readiness-progress-fill green" style={{ width: `${barPct(profileMetrics.quizAvg)}%`, height: '100%' }}></div>
                </div>
              </div>

              {/* Metric 4 */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.25rem', color: 'var(--text-secondary)' }}>
                  <span>Oral Viva</span>
                  <strong>{fmtPct(profileMetrics.vivaAvg)}</strong>
                </div>
                <div className="readiness-progress-bar-bg" style={{ height: '8px' }}>
                  <div className="readiness-progress-fill purple" style={{ width: `${barPct(profileMetrics.vivaAvg)}%`, height: '100%' }}></div>
                </div>
              </div>

              {/* Metric 5 */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.25rem', color: 'var(--text-secondary)' }}>
                  <span>Mock Interview</span>
                  <strong>{fmtPct(profileMetrics.interviewAvg)}</strong>
                </div>
                <div className="readiness-progress-bar-bg" style={{ height: '8px' }}>
                  <div className="readiness-progress-fill cyan" style={{ width: `${barPct(profileMetrics.interviewAvg)}%`, height: '100%' }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Weak Areas & Dynamic Revision checks */}
          <div className="glass-card profile-weak-areas-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3>Weak Areas & Targeted Revision</h3>
            <p className="calendar-explanation-text" style={{ margin: 0 }}>
              AI detected weak topics based on assessment reviews. Trigger unlimited targeted practice sessions below.
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
              {profileMetrics.weakAreas.map((area, idx) => (
                <div key={idx} className="weak-area-item-row border-purple" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <ClipboardCheck size={18} className="text-purple" />
                    <div>
                      <h5 style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-primary)' }}>Weak Area: {area}</h5>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>Practice more questions to bridge this gap.</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleStartPractice(area)}
                    className="btn btn-purple" 
                    style={{ fontSize: '0.72rem', padding: '0.35rem 0.65rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                  >
                    <Play size={10} fill="white" /> Practice 10 More
                  </button>
                </div>
              ))}
            </div>

            {profileMetrics.recommendations.length > 0 && (
              <div style={{ marginTop: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                <h5 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem', fontSize: '0.85rem' }}>Next Recommended Actions:</h5>
                <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {profileMetrics.recommendations.map((rec, i) => (
                    <li key={i}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Right column: Analytics Performance summaries */}
        <div className="col-5 profile-column-group">
          <div className="glass-card performance-summary-card">
            <h3>Assessment Performance</h3>
            
            <div className="performance-stat-listing">
              <div className="performance-row">
                <div className="stat-label-with-icon">
                  <ClipboardCheck size={16} className="text-purple" />
                  <div>
                    <span>MCQ Average</span>
                    <p>Dynamic quiz logs average</p>
                  </div>
                </div>
                <div className="performance-score-pills green">{typeof profileMetrics.quizAvg === 'number' ? `${profileMetrics.quizAvg}% AVG` : 'No data'}</div>
              </div>

              <div className="performance-row">
                <div className="stat-label-with-icon">
                  <ClipboardCheck size={16} className="text-purple" />
                  <div>
                    <span>Viva Average</span>
                    <p>Oral answer scores average</p>
                  </div>
                </div>
                <div className="performance-score-pills purple">{typeof profileMetrics.vivaAvg === 'number' ? `${profileMetrics.vivaAvg}% AVG` : 'No data'}</div>
              </div>

              <div className="performance-row">
                <div className="stat-label-with-icon">
                  <Mic size={16} className="text-cyan" />
                  <div>
                    <span>Mock Interview Score</span>
                    <p>AI mock scorecard reviews</p>
                  </div>
                </div>
                <div className="performance-score-pills cyan">{typeof profileMetrics.interviewAvg === 'number' ? `${profileMetrics.interviewAvg}% AVG` : 'No data'}</div>
              </div>
            </div>

            <div className="viva-readiness-scale">
              <div className="scale-label-row">
                <span>Developer Readiness Index</span>
                <strong>{fmtPct(profileMetrics.readinessIndex)}</strong>
              </div>
              <div className="readiness-progress-bar-bg">
                <div className="readiness-progress-fill cyan" style={{ width: `${barPct(profileMetrics.readinessIndex)}%` }}></div>
              </div>
              <p className="readiness-tips-text">
                {typeof profileMetrics.readinessIndex !== 'number'
                  ? "Take a quiz, viva or mock interview to get your real readiness index."
                  : profileMetrics.readinessIndex >= 70
                    ? "Your results show strong command of this codebase. You are ready to present it in viva panels."
                    : "Practice timed mock interviews and revisit the code areas you missed to raise your readiness index."}
              </p>
            </div>
          </div>

          <div className="glass-card scanned-projects-card">
            <h3>Analyzed Projects</h3>
            <div className="scanned-projects-list">
              {projects.map((proj) => (
                <div key={proj.id || proj._id} className="scanned-project-row">
                  <div className="project-bullet-detail">
                    <strong>{proj.name}</strong>
                    <div className="project-chips-mini">
                      {proj.techStack?.slice(0, 3).map((t, idx) => (
                        <span key={idx} className="tech-chip-mini">{t}</span>
                      ))}
                    </div>
                  </div>
                  <span className="scanned-proj-score">{typeof proj.understanding === 'number' ? `${proj.understanding}%` : ''}</span>
                </div>
              ))}
              {projects.length === 0 && (
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>No analyzed projects uploaded yet.</p>
              )}
            </div>
          </div>

          {/* Simple wording: Feature 8 & 9 - Appearance Preference (Dark / Light Mode) */}
          <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Palette size={16} className="text-purple" />
              <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-primary)', fontWeight: '700' }}>
                Appearance Preference
              </h3>
            </div>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Choose your preferred workspace theme. Persisted automatically across sessions.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.25rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => { if (theme !== 'light') toggleTheme(); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  padding: '0.6rem 1rem',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  border: theme === 'light' ? '2px solid var(--accent-purple)' : '1px solid var(--border-color)',
                  background: theme === 'light' ? 'rgba(109, 40, 217, 0.1)' : 'var(--bg-card)',
                  cursor: 'pointer'
                }}
              >
                <Sun size={15} className={theme === 'light' ? 'text-purple' : ''} />
                <span>Light Mode</span>
                {theme === 'light' && <Check size={14} className="text-purple" />}
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => { if (theme !== 'dark') toggleTheme(); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  padding: '0.6rem 1rem',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  border: theme === 'dark' ? '2px solid var(--accent-purple)' : '1px solid var(--border-color)',
                  background: theme === 'dark' ? 'rgba(109, 40, 217, 0.1)' : 'var(--bg-card)',
                  cursor: 'pointer'
                }}
              >
                <Moon size={15} className={theme === 'dark' ? 'text-purple' : ''} />
                <span>Dark Mode</span>
                {theme === 'dark' && <Check size={14} className="text-purple" />}
              </button>
            </div>
          </div>

          {/* Simple wording: Simple Account Logout Action (Feature 9) */}
          <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)', display: 'block' }}>Account Session</strong>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Currently logged in as {user?.email || user?.name}</span>
            </div>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleLogout}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', padding: '0.45rem 0.85rem', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)', cursor: 'pointer' }}
            >
              <LogOut size={14} /> Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
