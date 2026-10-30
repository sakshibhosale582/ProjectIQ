import React, { useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext, API_BASE } from '../context/AppContext';
import AnalysisNav from '../components/AnalysisNav';
import { 
  FileCode, Layers, ArrowRight, Share2, AlertTriangle, 
  Server, Database, Code2, CheckCircle2, ShieldCheck, Cpu,
  Activity, Wrench, ShieldAlert
} from 'lucide-react';
import './ProjectAnalysis.css';

export default function AnalysisOverview() {
  const { projects, activeProject } = useContext(AppContext);
  const navigate = useNavigate();

  // Simple wording: State for qualitative project health analysis (Feature 5)
  const [healthData, setHealthData] = useState(null);
  const [loadingHealth, setLoadingHealth] = useState(false);

  useEffect(() => {
    if (!activeProject?._id && !activeProject?.id) return;
    const projectId = activeProject._id || activeProject.id;
    const token = localStorage.getItem('projectiq_token') || localStorage.getItem('token');

    let isMounted = true;
    setLoadingHealth(true);

    fetch(`${API_BASE}/projects/${projectId}/health`, {
      headers: {
        'Authorization': token ? `Bearer ${token}` : ''
      }
    })
      .then(res => res.json())
      .then(data => {
        if (isMounted && data.success && data.health) {
          setHealthData(data.health);
        }
      })
      .catch(err => {
        // Silently fallback if offline
        console.warn('Health overview fetch error:', err);
      })
      .finally(() => {
        if (isMounted) setLoadingHealth(false);
      });

    return () => { isMounted = false; };
  }, [activeProject]);

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

  const metrics = activeProject.metrics || {};
  const issuesCount = activeProject.analysis?.codeIssuesTotal ?? activeProject.codeIssues?.length ?? 0;

  // Simple wording: Qualitative health overview computed from real project data if backend not yet loaded
  const health = healthData || {
    codeQuality: {
      status: (activeProject.codeIssues || []).filter(i => i.severity === 'High').length === 0 ? 'Good' : 'Needs Review',
      keyFindings: [
        `Scanned ${metrics.totalFiles || 0} files totaling ${metrics.linesOfCode || 0} lines of code.`,
        `Found ${issuesCount} static code diagnostic issue(s).`
      ],
      detectedIssues: (activeProject.codeIssues || []).slice(0, 3).map(i => `${i.message}`),
      recommendations: ['Address flagged issues and maintain test coverage.']
    },
    architecture: {
      status: (activeProject.modules || []).length >= 2 ? 'Modular' : 'Monolithic',
      keyFindings: [
        `Found ${(activeProject.modules || []).length} detected functional module(s).`,
        `Architecture flow traverses ${(activeProject.architectureFlow || []).length} stage(s).`
      ],
      detectedIssues: [],
      recommendations: ['Maintain clean separation between business logic and routes.']
    },
    security: {
      status: (activeProject.securityFindings || []).length === 0 ? 'No findings (static checks)' : (activeProject.securityFindings || []).filter(f => f.severity === 'High').length === 0 ? 'Moderate' : 'Attention Required',
      keyFindings: [
        `${activeProject.analysis?.securityFindingsTotal ?? (activeProject.securityFindings || []).length} security finding(s) evaluated.`,
        `API endpoints audited: ${(activeProject.endpointRoutes || []).length} path(s).`
      ],
      detectedIssues: (activeProject.securityFindings || []).map(f => `[${f.category}] ${f.title}`),
      recommendations: ['Isolate secrets in environment files and enforce strict CORS.']
    },
    maintainability: {
      status: metrics.totalFiles > 0 && Math.round((metrics.linesOfCode || 0) / metrics.totalFiles) < 250 ? 'High' : 'Moderate',
      keyFindings: [
        `Average file size is ~${metrics.totalFiles > 0 ? Math.round((metrics.linesOfCode || 0) / metrics.totalFiles) : 0} lines per file.`,
        `Total external packages: ${(activeProject.dependencies || []).length}.`
      ],
      detectedIssues: [],
      recommendations: ['Keep modules focused and update packages regularly.']
    },
    complexity: {
      status: ((activeProject.endpointRoutes || []).length > 20) ? 'High' : 'Balanced',
      keyFindings: [
        `${(activeProject.endpointRoutes || []).length} HTTP endpoint route(s) mapped.`,
        `${(activeProject.techStack || []).length} core technologies in application stack.`
      ],
      detectedIssues: [],
      recommendations: ['Group API routes logically with version prefixes.']
    }
  };

  return (
    <div className="analysis-page-container">
      <AnalysisNav 
        title="Project Overview & Telemetry" 
        subtitle="High-level structural breakdown, detected languages, metrics, and core entry points."
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', textAlign: 'left' }}>
        
        {/* Main Overview Card */}
        <div className="glass-card glow-purple" style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <h2 style={{ fontSize: '1.8rem', fontWeight: '800', margin: 0, color: 'var(--text-primary)' }}>
                  {activeProject.name}
                </h2>
                <span className="status-label-glow green">✓ Analyzed</span>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: '0.4rem 0 0 0', lineHeight: '1.5', maxWidth: '800px' }}>
                {activeProject.description || 'Static analysis and structural dependencies successfully scanned.'}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button className="btn btn-secondary" onClick={() => navigate('/analysis/architecture')} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem' }}>
                <Share2 size={14} /> Architecture Flow
              </button>
              <button className="btn btn-secondary" onClick={() => navigate('/analysis/files')} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem' }}>
                <FileCode size={14} /> File Inspector
              </button>
            </div>
          </div>

          {/* Programmatic Metrics 4-Grid */}
          <div className="programmatic-metrics-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginTop: '1.5rem' }}>
            <div className="p-metric-card" style={{ background: 'var(--bg-card)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)', textAlign: 'center', boxShadow: 'var(--soft-shadow)' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', fontWeight: '700' }}>Total Files</span>
              <strong style={{ fontSize: '1.6rem', color: 'var(--text-primary)', display: 'block', margin: '0.2rem 0' }}>{metrics.totalFiles || 0}</strong>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Scanned Assets</span>
            </div>

            <div className="p-metric-card" style={{ background: 'var(--bg-card)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)', textAlign: 'center', boxShadow: 'var(--soft-shadow)' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', fontWeight: '700' }}>Lines of Code</span>
              <strong style={{ fontSize: '1.6rem', color: 'var(--accent-purple)', display: 'block', margin: '0.2rem 0' }}>{metrics.linesOfCode || 0}</strong>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Source Volume</span>
            </div>

            <div className="p-metric-card" style={{ background: 'var(--bg-card)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)', textAlign: 'center', boxShadow: 'var(--soft-shadow)' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', fontWeight: '700' }}>Scanned Endpoints</span>
              <strong style={{ fontSize: '1.6rem', color: 'var(--accent-cyan)', display: 'block', margin: '0.2rem 0' }}>{metrics.apiEndpointsCount || 0}</strong>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>API Paths</span>
            </div>

            <div className="p-metric-card" style={{ background: 'var(--bg-card)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)', textAlign: 'center', boxShadow: 'var(--soft-shadow)' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', fontWeight: '700' }}>Static Issues</span>
              <strong style={{ fontSize: '1.6rem', color: issuesCount > 0 ? '#ef4444' : 'var(--accent-green)', display: 'block', margin: '0.2rem 0' }}>
                {issuesCount}
              </strong>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Quality Warnings</span>
            </div>
          </div>
        </div>

        {/* 2-Column Split: Tech Stacks & Key Entry Points */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          
          {/* Tech Stacks & Language Distribution Card */}
          <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-primary)', fontWeight: '700', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Code2 size={16} className="text-purple" /> Language Distribution & Tech Stack
            </h3>
            
            {/* Language Distribution Breakdown */}
            <div>
              <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', fontWeight: '700' }}>
                Programming Language Breakdown
              </h4>

              {activeProject.languageDistribution && Object.keys(activeProject.languageDistribution).length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {/* Multi-colored Language Progress Bar */}
                  <div style={{ display: 'flex', height: '10px', borderRadius: '6px', overflow: 'hidden', background: 'var(--bg-card-subtle)', border: '1px solid var(--border-color)' }}>
                    {(() => {
                      const totalLangFiles = Object.values(activeProject.languageDistribution).reduce((a, b) => a + b, 0) || 1;
                      const colors = ['#6366f1', '#0284c7', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#3b82f6'];
                      return Object.entries(activeProject.languageDistribution).map(([lang, count], idx) => {
                        const pct = Math.round((count / totalLangFiles) * 100);
                        if (pct <= 0) return null;
                        return (
                          <div 
                            key={lang} 
                            title={`${lang}: ${count} files (${pct}%)`}
                            style={{ 
                              width: `${pct}%`, 
                              backgroundColor: colors[idx % colors.length], 
                              transition: 'width 0.3s ease' 
                            }} 
                          />
                        );
                      });
                    })()}
                  </div>

                  {/* Language Badges Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.5rem' }}>
                    {(() => {
                      const totalLangFiles = Object.values(activeProject.languageDistribution).reduce((a, b) => a + b, 0) || 1;
                      const colors = ['#6366f1', '#0284c7', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#3b82f6'];
                      return Object.entries(activeProject.languageDistribution).map(([lang, count], idx) => {
                        const pct = Math.round((count / totalLangFiles) * 100);
                        return (
                          <div key={lang} style={{ background: 'var(--bg-deep)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.4rem 0.6rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', fontWeight: '600' }}>
                              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: colors[idx % colors.length] }} />
                              {lang}
                            </span>
                            <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                              {pct}%
                            </span>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Language Distribution: <strong>Not detected</strong>
                </div>
              )}
            </div>

            {/* Frameworks & Libraries Tags */}
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
              <h4 style={{ margin: '0 0 0.4rem 0', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', fontWeight: '700' }}>
                Detected Tech Stack & Frameworks
              </h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {activeProject.techStack && activeProject.techStack.length > 0 ? (
                  activeProject.techStack.map((tech, idx) => (
                    <span key={idx} className="tech-chip" style={{ fontSize: '0.82rem', padding: '0.25rem 0.6rem' }}>
                      {tech}
                    </span>
                  ))
                ) : (
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Not detected</span>
                )}
              </div>
            </div>

            {/* Database Summary Section */}
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
              <h4 style={{ margin: '0 0 0.35rem 0', fontSize: '0.85rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: '700' }}>
                <Database size={14} className="text-cyan" /> Database Configuration:
              </h4>
              {activeProject.databaseInfo && activeProject.databaseInfo.dbType && activeProject.databaseInfo.dbType !== 'None detected' ? (
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <div>Engine: <strong>{activeProject.databaseInfo.dbType}</strong></div>
                  {activeProject.databaseInfo.connectionStringFile && (
                    <div>Config File: <code>{activeProject.databaseInfo.connectionStringFile}</code></div>
                  )}
                  {activeProject.databaseInfo.detectedTablesOrCollections?.length > 0 && (
                    <div>Models/Tables: {activeProject.databaseInfo.detectedTablesOrCollections.join(', ')}</div>
                  )}
                </div>
              ) : (
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Not detected</div>
              )}
            </div>
          </div>

          {/* Critical Files (Primary Nodes) */}
          <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-primary)', fontWeight: '700', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileCode size={16} className="text-cyan" /> Critical Entry Points & Primary Files
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: '250px', overflowY: 'auto' }}>
              {activeProject.importantFiles?.map((file, idx) => (
                <div 
                  key={idx} 
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', padding: '0.65rem 0.85rem', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}
                  onClick={() => navigate('/analysis/files')}
                  title="Click to inspect this file"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden' }}>
                    <FileCode size={16} className="text-purple" style={{ flexShrink: 0 }} />
                    <div>
                      <strong style={{ fontSize: '0.85rem', color: 'var(--text-primary)', display: 'block' }}>
                        {file.name.split('/').pop()}
                      </strong>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {file.purpose || 'Core execution module'}
                      </span>
                    </div>
                  </div>
                  <ArrowRight size={14} className="text-muted" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Simple wording: Feature 5 - Qualitative Project Health Analysis (No fake score numbers) */}
        {health && (
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text-primary)', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Activity size={18} className="text-purple" /> Project Health Analysis
                </h3>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  Qualitative evaluation grounded in actual static code analysis, modules, dependencies, and security findings.
                </p>
              </div>
              {loadingHealth && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Updating health telemetry...</span>}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
              {/* 1. Code Quality */}
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <FileCode size={15} className="text-cyan" /> Code Quality
                  </span>
                  <span className={`status-label-glow ${health.codeQuality?.status === 'Good' ? 'green' : 'amber'}`} style={{ fontSize: '0.75rem' }}>
                    {health.codeQuality?.status}
                  </span>
                </div>
                <ul style={{ margin: '0 0 0.5rem 0', paddingLeft: '1.1rem', fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: '1.4', flex: 1 }}>
                  {health.codeQuality?.keyFindings?.map((f, i) => <li key={i}>{f}</li>)}
                </ul>
                {health.codeQuality?.recommendations?.length > 0 && (
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', borderTop: '1px dashed var(--border-color)', paddingTop: '0.4rem' }}>
                    <strong>Tip:</strong> {health.codeQuality.recommendations[0]}
                  </div>
                )}
              </div>

              {/* 2. Architecture */}
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Share2 size={15} className="text-purple" /> Architecture
                  </span>
                  <span className={`status-label-glow ${health.architecture?.status === 'Modular' ? 'green' : 'amber'}`} style={{ fontSize: '0.75rem' }}>
                    {health.architecture?.status}
                  </span>
                </div>
                <ul style={{ margin: '0 0 0.5rem 0', paddingLeft: '1.1rem', fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: '1.4', flex: 1 }}>
                  {health.architecture?.keyFindings?.map((f, i) => <li key={i}>{f}</li>)}
                </ul>
                {health.architecture?.recommendations?.length > 0 && (
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', borderTop: '1px dashed var(--border-color)', paddingTop: '0.4rem' }}>
                    <strong>Tip:</strong> {health.architecture.recommendations[0]}
                  </div>
                )}
              </div>

              {/* 3. Security */}
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <ShieldCheck size={15} className="text-cyan" /> Security
                  </span>
                  <span className={`status-label-glow ${health.security?.status === 'Strong' ? 'green' : (health.security?.status === 'Moderate' ? 'blue' : 'amber')}`} style={{ fontSize: '0.75rem' }}>
                    {health.security?.status}
                  </span>
                </div>
                <ul style={{ margin: '0 0 0.5rem 0', paddingLeft: '1.1rem', fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: '1.4', flex: 1 }}>
                  {health.security?.keyFindings?.map((f, i) => <li key={i}>{f}</li>)}
                </ul>
                {health.security?.recommendations?.length > 0 && (
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', borderTop: '1px dashed var(--border-color)', paddingTop: '0.4rem' }}>
                    <strong>Tip:</strong> {health.security.recommendations[0]}
                  </div>
                )}
              </div>

              {/* 4. Maintainability */}
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Wrench size={15} className="text-purple" /> Maintainability
                  </span>
                  <span className={`status-label-glow ${health.maintainability?.status === 'High' ? 'green' : 'amber'}`} style={{ fontSize: '0.75rem' }}>
                    {health.maintainability?.status}
                  </span>
                </div>
                <ul style={{ margin: '0 0 0.5rem 0', paddingLeft: '1.1rem', fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: '1.4', flex: 1 }}>
                  {health.maintainability?.keyFindings?.map((f, i) => <li key={i}>{f}</li>)}
                </ul>
                {health.maintainability?.recommendations?.length > 0 && (
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', borderTop: '1px dashed var(--border-color)', paddingTop: '0.4rem' }}>
                    <strong>Tip:</strong> {health.maintainability.recommendations[0]}
                  </div>
                )}
              </div>

              {/* 5. Complexity */}
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Cpu size={15} className="text-cyan" /> Complexity
                  </span>
                  <span className={`status-label-glow ${health.complexity?.status === 'Balanced' ? 'green' : 'amber'}`} style={{ fontSize: '0.75rem' }}>
                    {health.complexity?.status}
                  </span>
                </div>
                <ul style={{ margin: '0 0 0.5rem 0', paddingLeft: '1.1rem', fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: '1.4', flex: 1 }}>
                  {health.complexity?.keyFindings?.map((f, i) => <li key={i}>{f}</li>)}
                </ul>
                {health.complexity?.recommendations?.length > 0 && (
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', borderTop: '1px dashed var(--border-color)', paddingTop: '0.4rem' }}>
                    <strong>Tip:</strong> {health.complexity.recommendations[0]}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* API Routing Paths Table (if detected) */}
        {activeProject.endpointRoutes?.length > 0 && (
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.05rem', color: 'var(--text-primary)', fontWeight: '700', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Server size={16} className="text-cyan" /> Scanned API Endpoints & Routes ({activeProject.endpointRoutes.length})
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem' }}>
              {activeProject.endpointRoutes.map((route, idx) => (
                <div key={idx} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', padding: '0.65rem 0.85rem', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', fontWeight: '700', color: 'var(--accent-purple)' }}>
                    [{route.method}] <span style={{ color: 'var(--text-primary)' }}>{route.path}</span>
                  </span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', background: 'var(--bg-deep)', border: '1px solid var(--border-color)', padding: '0.15rem 0.4rem', borderRadius: '3px' }}>
                    {route.type || 'REST'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
