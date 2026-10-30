import React, { useContext, useState, useEffect } from 'react';
import { AppContext } from '../context/AppContext';
import { FileText, Printer, ShieldCheck, Sparkles, Award, CheckCircle } from 'lucide-react';
import './PDFReport.css';

export default function PDFReport() {
  const { user, activeProject, API_BASE } = useContext(AppContext);
  
  const [reportMetrics, setReportMetrics] = useState({
    quizAvg: null,
    vivaAvg: null,
    interviewAvg: null,
    progressPct: null,
    readinessIndex: null,
    weakAreas: [],
    recommendations: [],
    strengths: []
  });
  
  const [loading, setLoading] = useState(false);

  // Load database readiness calculations on load (Phase 19)
  useEffect(() => {
    const fetchReportMetrics = async () => {
      if (!activeProject) return;
      setLoading(true);
      const token = localStorage.getItem('projectiq_token');
      const projectId = activeProject._id || activeProject.id;
      
      try {
        const res = await fetch(`${API_BASE}/prepare/${projectId}/readiness`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setReportMetrics(data);
        }
      } catch (err) {
        console.error('Failed to load PDF report metrics:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchReportMetrics();
  }, [activeProject]);

  const handlePrint = () => {
    window.print();
  };

  // Date format standardizer (30 Aug 2026)
  const getStandardizedDate = () => {
    const d = new Date();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  };

  if (!activeProject) {
    return (
      <div className="report-page-container" style={{ padding: '2rem' }}>
        <div className="glass-card" style={{ padding: '3rem 2rem', textAlign: 'center' }}>
          <h3>No active project found</h3>
          <p>Please upload a ZIP file first before exporting performance summaries.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="report-page-container" style={{ textAlign: 'left' }}>
      {/* Action Header bar (hidden in prints) */}
      <div className="report-view-header print-hidden" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1>PDF Summary & Project Report</h1>
          <p>Export clean technical blueprints, architecture metrics, and assessment readiness scorecards.</p>
        </div>
        <button className="btn-primary print-trigger-btn" onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Printer size={16} /> Print / Save as PDF
        </button>
      </div>

      {loading ? (
        <div className="glass-card" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
          <div className="typing-dots-animation" style={{ display: 'flex', gap: '0.35rem', justifyContent: 'center', marginBottom: '1rem' }}>
            <span className="dot animate-pulse"></span>
            <span className="dot animate-pulse" style={{ animationDelay: '0.2s' }}></span>
            <span className="dot animate-pulse" style={{ animationDelay: '0.4s' }}></span>
          </div>
          <p>Compiling database scorecard reports...</p>
        </div>
      ) : (
        /* Printable Sheet */
        <div className="printable-report-sheet" style={{ padding: '2.5rem', background: 'var(--bg-card)', color: 'var(--text-primary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
          
          {/* Document Header */}
          <div className="report-document-header" style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '2rem' }}>
            <div className="report-branding-side">
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-primary)', margin: 0 }}>
                TECHNICAL PROJECT SUMMARY & ASSESSMENT REPORT
              </h2>
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                ProjectIQ Architecture Telemetry & Technical Readiness Sheet
              </p>
            </div>
            <div className="report-branding-date" style={{ textAlign: 'right', fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Date:</span>
              <p style={{ margin: 0, fontWeight: 'bold', color: 'var(--text-primary)' }}>{getStandardizedDate()}</p>
            </div>
          </div>

          {/* Section 1: Project Name & Overview */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.35rem', color: 'var(--text-primary)', fontSize: '1.1rem' }}>
              1. Project Name & Overview
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.88rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
              <div><strong>Project Name:</strong> <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>{activeProject.name}</span></div>
              <div><strong>Candidate / Owner:</strong> {user?.name || 'Developer'} ({user?.email || 'N/A'})</div>
            </div>
            <p style={{ fontSize: '0.88rem', margin: '0.5rem 0', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
              {activeProject.description || 'Static analysis and architectural dependencies successfully scanned.'}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', fontSize: '0.82rem', marginTop: '0.75rem', background: 'var(--bg-deep)', border: '1px solid var(--border-color)', padding: '0.75rem', borderRadius: '6px', textAlign: 'center' }}>
              <div>Total Files: <strong style={{ color: 'var(--text-primary)' }}>{activeProject.metrics?.totalFiles || 0}</strong></div>
              <div>Lines of Code: <strong style={{ color: 'var(--accent-purple)' }}>{activeProject.metrics?.linesOfCode || 0} LoC</strong></div>
              <div>API Endpoints: <strong style={{ color: 'var(--accent-cyan)' }}>{activeProject.metrics?.apiEndpointsCount || 0}</strong></div>
              <div>Modules: <strong style={{ color: 'var(--accent-green)' }}>{activeProject.modules?.length || 0}</strong></div>
            </div>
          </div>

          {/* Section 2: Tech Stack & Project Structure */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.35rem', color: 'var(--text-primary)', fontSize: '1.1rem' }}>
              2. Tech Stack & Project Structure
            </h3>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', margin: '0.5rem 0' }}>
              {activeProject.techStack?.map((tech, idx) => (
                <span key={idx} style={{ background: 'var(--bg-deep)', color: 'var(--text-primary)', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem', border: '1px solid var(--border-color)', fontWeight: 'bold' }}>
                  {tech}
                </span>
              ))}
            </div>
            {/* Database & Structure Info */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.75rem', fontSize: '0.85rem' }}>
              <div style={{ border: '1px solid var(--border-color)', padding: '0.75rem', borderRadius: '6px' }}>
                <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '0.35rem' }}>Database Configuration:</strong>
                <div style={{ color: 'var(--text-secondary)' }}>Type: <strong>{activeProject.databaseInfo?.dbType || 'None detected'}</strong></div>
                {activeProject.databaseInfo?.connectionStringFile && (
                  <div style={{ color: 'var(--text-secondary)' }}>Config File: <code>{activeProject.databaseInfo.connectionStringFile}</code></div>
                )}
                {activeProject.databaseInfo?.detectedTablesOrCollections?.length > 0 && (
                  <div style={{ color: 'var(--text-secondary)' }}>Entities: {activeProject.databaseInfo.detectedTablesOrCollections.join(', ')}</div>
                )}
              </div>
              <div style={{ border: '1px solid var(--border-color)', padding: '0.75rem', borderRadius: '6px' }}>
                <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '0.35rem' }}>Primary Modules ({activeProject.modules?.length || 0}):</strong>
                <div style={{ color: 'var(--text-secondary)', maxHeight: '70px', overflowY: 'auto' }}>
                  {activeProject.modules?.slice(0, 4).map((m, i) => (
                    <div key={i}>📦 <strong>{m.name}</strong> ({m.files?.length || 0} files)</div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Architecture & Data Flow Summary */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.35rem', color: 'var(--text-primary)', fontSize: '1.1rem' }}>
              3. Architecture & Data Flow Summary
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '0.5rem', fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
              {activeProject.architectureFlow?.map((edge, i) => (
                <div key={i} style={{ background: 'var(--bg-deep)', padding: '0.35rem 0.6rem', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                  📁 <strong>{edge.from}</strong> ──[{edge.relationType}]──&gt; 📁 <strong>{edge.to}</strong>
                </div>
              ))}
              {(!activeProject.architectureFlow || activeProject.architectureFlow.length === 0) && (
                <span style={{ color: 'var(--text-muted)' }}>Standard layered architectural pattern detected.</span>
              )}
            </div>
            {/* Scanned Endpoints Preview */}
            {activeProject.endpointRoutes?.length > 0 && (
              <div style={{ marginTop: '0.6rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                <strong>Key Routes ({activeProject.endpointRoutes.length} detected): </strong>
                {activeProject.endpointRoutes.slice(0, 5).map((r, i) => `[${r.method}] ${r.path}`).join('  •  ')}
              </div>
            )}
          </div>

          {/* Section 4: Code Analysis Summary */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.35rem', color: 'var(--text-primary)', fontSize: '1.1rem' }}>
              4. Code Analysis Summary
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.5rem', fontSize: '0.82rem' }}>
              {activeProject.codeIssues?.length === 0 ? (
                <div style={{ color: 'var(--accent-green)', fontWeight: 'bold' }}>
                  ✓ 0 code quality warnings flagged by static diagnostics.
                </div>
              ) : (
                activeProject.codeIssues.slice(0, 4).map((issue, i) => (
                  <div key={i} style={{ color: issue.severity === 'High' ? '#dc2626' : '#d97706' }}>
                    ⚠ [{issue.issueType}] {issue.filePath.split('/').pop()} (line {issue.line}): {issue.message}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Section 5: Security Audit Findings */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.35rem', color: 'var(--text-primary)', fontSize: '1.1rem' }}>
              5. Security Audit Findings
            </h3>
            <div style={{ marginTop: '0.5rem' }}>
              {(activeProject.securityFindings || []).length === 0 ? (
                <div style={{ color: 'var(--accent-green)', fontWeight: 'bold', fontSize: '0.85rem' }}>
                  ✓ No critical security vulnerabilities or exposed hardcoded secrets detected.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.82rem' }}>
                  {(activeProject.securityFindings || []).slice(0, 5).map((finding, i) => (
                    <div key={i} style={{ background: 'var(--bg-deep)', border: '1px solid var(--border-color)', padding: '0.4rem 0.6rem', borderRadius: '4px' }}>
                      <span style={{ fontWeight: 'bold', color: finding.severity === 'High' ? '#dc2626' : (finding.severity === 'Medium' ? '#d97706' : 'var(--accent-cyan)') }}>
                        [{finding.severity.toUpperCase()}] [{finding.category}]
                      </span>{' '}
                      <span style={{ color: 'var(--text-primary)' }}>{finding.title}</span> in <code>{finding.filePath?.split('/').pop()}</code>
                      <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                        Remediation: {finding.remediation}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Section 6: Key Recommendations & Technical Checklist */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.35rem', color: 'var(--text-primary)', fontSize: '1.1rem' }}>
              6. Key Recommendations & Technical Checklist
            </h3>
            <div style={{ background: 'var(--bg-deep)', border: '1px solid var(--border-color)', padding: '0.85rem', borderRadius: '6px', fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.5rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <span>✓</span>
                <span><strong>Environment Isolation:</strong> Verify all secret keys, database credentials, and port configurations reside strictly in <code>.env</code> files.</span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <span>✓</span>
                <span><strong>CORS & Security Headers:</strong> Restrict origin domain whitelist in production and enable Helmet or standard security headers.</span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <span>✓</span>
                <span><strong>API Input Validation:</strong> Enforce strict request payload schemas on all POST/PUT endpoints to avoid injection attacks.</span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <span>✓</span>
                <span><strong>Modular Decoupling:</strong> Maintain clear layer boundaries between database models, business controllers, and frontend views.</span>
              </div>
            </div>
          </div>

          {/* Section 7: Interview Preparation Summary */}
          <div>
            <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.35rem', color: 'var(--text-primary)', fontSize: '1.1rem' }}>
              7. Interview Preparation Summary
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginTop: '0.5rem', textAlign: 'center' }}>
              <div style={{ border: '1px solid var(--border-color)', padding: '0.5rem', borderRadius: '6px' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>MCQ Quiz Avg</div>
                <strong style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>{typeof reportMetrics.quizAvg === 'number' ? `${reportMetrics.quizAvg}%` : 'Not enough data'}</strong>
              </div>
              <div style={{ border: '1px solid var(--border-color)', padding: '0.5rem', borderRadius: '6px' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Oral Viva Avg</div>
                <strong style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>{typeof reportMetrics.vivaAvg === 'number' ? `${reportMetrics.vivaAvg}%` : 'Not enough data'}</strong>
              </div>
              <div style={{ border: '1px solid var(--border-color)', padding: '0.5rem', borderRadius: '6px' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Mock Interview</div>
                <strong style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>{typeof reportMetrics.interviewAvg === 'number' ? `${reportMetrics.interviewAvg}%` : 'Not enough data'}</strong>
              </div>
              <div style={{ border: '1px solid var(--border-color)', padding: '0.5rem', borderRadius: '6px', background: 'var(--bg-deep)' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Readiness Index</div>
                <strong style={{ fontSize: '1.1rem', color: 'var(--accent-purple)' }}>{typeof reportMetrics.readinessIndex === 'number' ? `${reportMetrics.readinessIndex}%` : 'Not enough data'}</strong>
              </div>
            </div>

            <div style={{ marginTop: '0.75rem', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              <strong>Key Viva Talking Points:</strong> Be prepared to explain component interactions between{' '}
              <strong>{activeProject.techStack?.slice(0, 3).join(', ') || 'the frontend and backend'}</strong>, how state updates propagate across modules, and error-handling strategies.
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
