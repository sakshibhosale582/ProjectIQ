import React, { useContext, useState, useEffect } from 'react';
import { AppContext } from '../context/AppContext';
import AnalysisNav from '../components/AnalysisNav';
import { 
  AlertTriangle, AlertOctagon, CheckCircle2, ShieldCheck, 
  FileCode, Filter, AlertCircle, ShieldAlert, Lock, Terminal, Wrench
} from 'lucide-react';
import './ProjectAnalysis.css';

export default function AnalysisIssues() {
  const { projects, activeProject } = useContext(AppContext);

  // Security Findings
  const securityFindings = activeProject?.securityFindings || [];
  const codeIssues = activeProject?.codeIssues || [];

  // Default to quality tab if security has 0 findings but quality has issues
  const [activeTab, setActiveTab] = useState('security');
  const [filterSeverity, setFilterSeverity] = useState('ALL'); // ALL, High, Medium, Low
  const [filterCategory, setFilterCategory] = useState('ALL');

  useEffect(() => {
    if (securityFindings.length === 0 && codeIssues.length > 0) {
      setActiveTab('quality');
    } else {
      setActiveTab('security');
    }
  }, [activeProject?._id || activeProject?.id]);

  if (projects.length === 0 || !activeProject) {
    return (
      <div className="analysis-page-container" style={{ padding: '2rem' }}>
        <div className="glass-card" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
          <h3>No scanned project assets found</h3>
          <p>Go to the Upload page to import and scan your project directories ZIP file.</p>
        </div>
      </div>
    );
  }

  // Security Filtering
  const secHigh = securityFindings.filter(f => f.severity === 'High').length;
  const secMed = securityFindings.filter(f => f.severity === 'Medium').length;
  const secLow = securityFindings.filter(f => f.severity === 'Low').length;

  const filteredSecurity = securityFindings.filter(f => {
    const matchSev = filterSeverity === 'ALL' || f.severity?.toUpperCase() === filterSeverity.toUpperCase();
    const matchCat = filterCategory === 'ALL' || f.category === filterCategory;
    return matchSev && matchCat;
  });

  // Code Quality Filtering
  const qualHigh = codeIssues.filter(i => i.severity === 'High').length;
  const qualMed = codeIssues.filter(i => i.severity === 'Medium').length;
  const qualLow = codeIssues.filter(i => i.severity === 'Low').length;

  const filteredQuality = codeIssues.filter(i => {
    const matchSev = filterSeverity === 'ALL' || i.severity?.toUpperCase() === filterSeverity.toUpperCase();
    const matchCat = filterCategory === 'ALL' || i.category === filterCategory || i.issueType === filterCategory;
    return matchSev && matchCat;
  });

  // Category options come from the real data (never hardcoded)
  const securityCategories = Array.from(new Set(securityFindings.map(f => f.category).filter(Boolean)));
  const qualityCategories = Array.from(new Set(codeIssues.flatMap(i => [i.category, i.issueType]).filter(Boolean)));

  const currentItems = activeTab === 'security' ? filteredSecurity : filteredQuality;
  const totalCount = activeTab === 'security' ? securityFindings.length : codeIssues.length;
  const highCount = activeTab === 'security' ? secHigh : qualHigh;
  const medCount = activeTab === 'security' ? secMed : qualMed;
  const lowCount = activeTab === 'security' ? secLow : qualLow;

  // Helper for Code Quality Remediation Guide
  const getQualityRemediation = (issueType = '') => {
    const type = issueType.toLowerCase();
    if (type.includes('large file')) {
      return "Decompose this large file (>500 lines of code) into smaller modular sub-components or helper services to improve maintainability and testability.";
    }
    if (type.includes('code smell') || type.includes('debug')) {
      return "Remove or wrap debug output statements (console.log) before deploying to production environments.";
    }
    if (type.includes('safety risk') || type.includes('exception')) {
      return "Ensure all asynchronous operations are wrapped in try-catch blocks and handled centrally to prevent unhandled promise rejections.";
    }
    if (type.includes('hardcoded secret') || type.includes('secret')) {
      return "Move plain-text credentials and API keys into environment variables (.env) and access them via process.env.";
    }
    return "Refactor function complexity and adhere to clean code modular standards.";
  };

  return (
    <div className="analysis-page-container">
      <AnalysisNav 
        title="Security Audit & Code Diagnostics" 
        subtitle="Vulnerability detection, hardcoded secrets inspection, auth checks, and static quality diagnostics."
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', textAlign: 'left' }}>
        
        {/* Main Tab Switcher: Security Analysis vs Code Quality */}
        <div style={{ display: 'flex', gap: '0.75rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
          <button
            className={`btn ${activeTab === 'security' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => { setActiveTab('security'); setFilterSeverity('ALL'); setFilterCategory('ALL'); }}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.55rem 1.25rem' }}
          >
            <ShieldAlert size={16} />
            <span>Security Analysis ({securityFindings.length})</span>
          </button>
          <button
            className={`btn ${activeTab === 'quality' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => { setActiveTab('quality'); setFilterSeverity('ALL'); setFilterCategory('ALL'); }}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.55rem 1.25rem' }}
          >
            <AlertTriangle size={16} />
            <span>Code Quality ({codeIssues.length})</span>
          </button>
        </div>

        {/* Severity Metrics Bar */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
          <div 
            className={`glass-card ${filterSeverity === 'ALL' ? 'glow-purple' : ''}`}
            onClick={() => setFilterSeverity('ALL')}
            style={{ padding: '1.25rem', textAlign: 'center', cursor: 'pointer', border: filterSeverity === 'ALL' ? '2px solid var(--accent-purple)' : '1px solid var(--border-color)' }}
          >
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>Total Flagged</span>
            <strong style={{ fontSize: '1.8rem', color: 'var(--text-primary)', display: 'block', margin: '0.2rem 0' }}>{totalCount}</strong>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{activeTab === 'security' ? 'Security Audit Rules' : 'Quality Diagnostics'}</span>
          </div>

          <div 
            className={`glass-card ${filterSeverity === 'High' ? 'glow-purple' : ''}`}
            onClick={() => setFilterSeverity('High')}
            style={{ padding: '1.25rem', textAlign: 'center', cursor: 'pointer', border: filterSeverity === 'High' ? '2px solid #ef4444' : '1px solid var(--border-color)' }}
          >
            <span style={{ fontSize: '0.75rem', color: '#ef4444', textTransform: 'uppercase', fontWeight: '700' }}>High Severity</span>
            <strong style={{ fontSize: '1.8rem', color: '#ef4444', display: 'block', margin: '0.2rem 0' }}>{highCount}</strong>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Urgent Attention</span>
          </div>

          <div 
            className={`glass-card ${filterSeverity === 'Medium' ? 'glow-purple' : ''}`}
            onClick={() => setFilterSeverity('Medium')}
            style={{ padding: '1.25rem', textAlign: 'center', cursor: 'pointer', border: filterSeverity === 'Medium' ? '2px solid #f59e0b' : '1px solid var(--border-color)' }}
          >
            <span style={{ fontSize: '0.75rem', color: '#f59e0b', textTransform: 'uppercase', fontWeight: '700' }}>Medium Severity</span>
            <strong style={{ fontSize: '1.8rem', color: '#f59e0b', display: 'block', margin: '0.2rem 0' }}>{medCount}</strong>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Warnings</span>
          </div>

          <div 
            className={`glass-card ${filterSeverity === 'Low' ? 'glow-purple' : ''}`}
            onClick={() => setFilterSeverity('Low')}
            style={{ padding: '1.25rem', textAlign: 'center', cursor: 'pointer', border: filterSeverity === 'Low' ? '2px solid var(--accent-cyan)' : '1px solid var(--border-color)' }}
          >
            <span style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', textTransform: 'uppercase', fontWeight: '700' }}>Low Severity</span>
            <strong style={{ fontSize: '1.8rem', color: 'var(--accent-cyan)', display: 'block', margin: '0.2rem 0' }}>{lowCount}</strong>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Minor / Hints</span>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <Filter size={15} className="text-purple" />
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Severity:</span>
            {['ALL', 'High', 'Medium', 'Low'].map(s => (
              <button
                key={s}
                onClick={() => setFilterSeverity(s)}
                className={`btn btn-secondary ${filterSeverity === s ? 'active' : ''}`}
                style={{ padding: '0.3rem 0.75rem', fontSize: '0.78rem', background: filterSeverity === s ? 'var(--accent-purple)' : 'var(--bg-card)', color: filterSeverity === s ? '#ffffff' : 'var(--text-secondary)', border: '1px solid var(--border-color)' }}
              >
                {s}
              </button>
            ))}

            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600', marginLeft: '0.5rem' }}>Category:</span>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem', background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '6px' }}
            >
              <option value="ALL">All Categories</option>
              {(activeTab === 'security' ? securityCategories : qualityCategories).map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Showing {currentItems.length} of {totalCount} items
          </span>
        </div>

        {/* ======================================================== */}
        {/* TAB 1: SECURITY FINDINGS LIST */}
        {/* ======================================================== */}
        {activeTab === 'security' && (
          securityFindings.length === 0 ? (
            <div className="glass-card" style={{ border: '1px solid var(--accent-green)', background: 'rgba(5, 150, 105, 0.04)', padding: '3.5rem 2rem', textAlign: 'center', borderRadius: '10px' }}>
              <ShieldCheck size={40} className="text-green" style={{ margin: '0 auto 1rem auto' }} />
              <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--accent-green)', fontWeight: '800' }}>No Security Vulnerabilities Detected</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', maxWidth: '600px', margin: '0 auto' }}>
                The built-in static checks did not find any security issues in the scanned files. This is a pattern-based scan, not a full security audit.
              </p>
            </div>
          ) : filteredSecurity.length === 0 ? (
            <div className="glass-card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No security findings matching the selected filters.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {filteredSecurity.map((item, idx) => {
                const isHigh = item.severity === 'High';
                const isMed = item.severity === 'Medium';
                const color = isHigh ? '#ef4444' : isMed ? '#f59e0b' : 'var(--accent-cyan)';
                const bg = isHigh ? 'rgba(239, 68, 68, 0.04)' : isMed ? 'rgba(245, 158, 11, 0.04)' : 'rgba(8, 145, 178, 0.04)';

                return (
                  <div 
                    key={idx}
                    className="glass-card" 
                    style={{ borderLeft: `4px solid ${color}`, background: 'var(--bg-card)', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
                  >
                    {/* Finding Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color, fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.3rem', background: bg, padding: '0.2rem 0.55rem', borderRadius: '4px', border: `1px solid ${color}` }}>
                          {isHigh ? <AlertOctagon size={12} /> : <AlertTriangle size={12} />}
                          {item.severity} Severity
                        </span>
                        <span style={{ fontSize: '0.75rem', background: 'var(--bg-deep)', border: '1px solid var(--border-color)', color: 'var(--accent-purple-light)', padding: '0.2rem 0.55rem', borderRadius: '4px', fontWeight: '600' }}>
                          {item.category}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        <FileCode size={13} className="text-purple" />
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: '600', color: 'var(--text-primary)' }}>
                          {item.filePath}
                        </span>
                        <span style={{ background: 'var(--bg-deep)', border: '1px solid var(--border-color)', color: 'var(--accent-cyan)', padding: '0.1rem 0.4rem', borderRadius: '3px', fontWeight: '600' }}>
                          Line {item.line || 1}
                        </span>
                      </div>
                    </div>

                    {/* Title */}
                    <h4 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-primary)', fontWeight: '700' }}>
                      {item.title}
                    </h4>

                    {/* Relevant Code / Context Snippet */}
                    {item.codeSnippet && (
                      <div style={{ background: '#0f172a', padding: '0.5rem 0.75rem', borderRadius: '5px', border: '1px solid var(--border-color)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: '#f8fafc', overflowX: 'auto' }}>
                        <code>{item.codeSnippet}</code>
                      </div>
                    )}

                    {/* Explanation */}
                    <div style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                      <strong style={{ color: 'var(--text-primary)' }}>Why it is a problem: </strong>
                      {item.explanation}
                    </div>

                    {/* Suggested Remediation */}
                    <div style={{ background: 'rgba(5, 150, 105, 0.04)', border: '1px solid rgba(5, 150, 105, 0.2)', padding: '0.6rem 0.85rem', borderRadius: '6px', fontSize: '0.84rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'flex-start', gap: '0.4rem' }}>
                      <CheckCircle2 size={14} className="text-green" style={{ flexShrink: 0, marginTop: '0.15rem' }} />
                      <div>
                        <strong style={{ color: 'var(--accent-green)' }}>Recommended Fix: </strong>
                        {item.remediation}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}

        {/* ======================================================== */}
        {/* TAB 2: CODE QUALITY DIAGNOSTICS LIST */}
        {/* ======================================================== */}
        {activeTab === 'quality' && (
          codeIssues.length === 0 ? (
            <div className="glass-card" style={{ border: '1px solid var(--accent-green)', background: 'rgba(5, 150, 105, 0.04)', padding: '3.5rem 2rem', textAlign: 'center', borderRadius: '10px' }}>
              <CheckCircle2 size={36} className="text-green" style={{ margin: '0 auto 1rem auto' }} />
              <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--accent-green)', fontWeight: '800' }}>0 Quality Issues Detected</h3>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.92rem' }}>
                Your scanned codebase passes all static analysis, syntax verification, and quality diagnostics without warnings.
              </p>
            </div>
          ) : filteredQuality.length === 0 ? (
            <div className="glass-card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No quality issues found matching the selected filters.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {filteredQuality.map((issue, idx) => {
                const isHigh = issue.severity === 'High';
                const isMed = issue.severity === 'Medium';
                const color = isHigh ? '#ef4444' : isMed ? '#f59e0b' : 'var(--accent-cyan)';
                const bg = isHigh ? 'rgba(239, 68, 68, 0.04)' : isMed ? 'rgba(245, 158, 11, 0.04)' : 'rgba(8, 145, 178, 0.04)';
                
                return (
                  <div 
                    key={idx} 
                    className="glass-card" 
                    style={{ borderLeft: `4px solid ${color}`, background: 'var(--bg-card)', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.7rem' }}
                  >
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color, fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.3rem', background: bg, padding: '0.2rem 0.55rem', borderRadius: '4px', border: `1px solid ${color}` }}>
                          {isHigh ? <AlertOctagon size={12} /> : <AlertTriangle size={12} />}
                          {issue.severity || 'Medium'} Severity
                        </span>
                        <span style={{ fontSize: '0.75rem', background: 'var(--bg-deep)', border: '1px solid var(--border-color)', color: 'var(--accent-purple)', padding: '0.2rem 0.55rem', borderRadius: '4px', fontWeight: '600' }}>
                          {issue.category ? `${issue.category} · ` : ''}{issue.issueType || 'Code Diagnostics'}{issue.count > 1 ? ` ×${issue.count}` : ''}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        <FileCode size={13} className="text-purple" />
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: '600', color: 'var(--text-primary)' }}>
                          {issue.filePath}
                        </span>
                        <span style={{ background: 'var(--bg-deep)', border: '1px solid var(--border-color)', color: 'var(--accent-cyan)', padding: '0.1rem 0.4rem', borderRadius: '3px', fontWeight: '600' }}>
                          Line {issue.line || 1}
                        </span>
                      </div>
                    </div>

                    {/* Title & Message */}
                    <div>
                      <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '0.95rem', color: 'var(--text-primary)', fontWeight: '700' }}>
                        {issue.issueType}: {(issue.filePath || '').split('/').pop()}
                      </h4>
                      <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                        {issue.message}
                      </p>
                    </div>

                    {/* Suggested Fix */}
                    <div style={{ background: 'rgba(5, 150, 105, 0.04)', border: '1px solid rgba(5, 150, 105, 0.2)', padding: '0.6rem 0.85rem', borderRadius: '6px', fontSize: '0.84rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'flex-start', gap: '0.4rem' }}>
                      <CheckCircle2 size={14} className="text-green" style={{ flexShrink: 0, marginTop: '0.15rem' }} />
                      <div>
                        <strong style={{ color: 'var(--accent-green)' }}>Suggested Fix / Improvement: </strong>
                        {issue.suggestion || getQualityRemediation(issue.issueType)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}

      </div>
    </div>
  );
}
