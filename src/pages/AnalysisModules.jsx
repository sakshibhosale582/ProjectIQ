import React, { useContext, useState, useEffect } from 'react';
import { AppContext } from '../context/AppContext';
import AnalysisNav from '../components/AnalysisNav';
import { 
  Layers, FileCode, Cpu, CheckCircle2, ArrowRight, ArrowLeftRight, 
  Code2, Package, Share2, Database, ShieldCheck, Layout, Settings, 
  Terminal, Search, BookOpen, Lightbulb, Sparkles, Filter
} from 'lucide-react';
import './ProjectAnalysis.css';

export default function AnalysisModules() {
  const { projects, activeProject, setActiveProject, API_BASE } = useContext(AppContext);
  const [modulesList, setModulesList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch enriched modules from backend if needed
  useEffect(() => {
    if (!activeProject) return;

    // Use existing activeProject.modules if available
    if (activeProject.modules && activeProject.modules.length > 0) {
      setModulesList(activeProject.modules);
    }

    // Also fetch latest enriched modules from backend endpoint
    const fetchModules = async () => {
      try {
        const token = localStorage.getItem('projectiq_token');
        const projectId = activeProject._id || activeProject.id;
        const res = await fetch(`${API_BASE}/projects/${projectId}/modules`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.length > 0) {
            setModulesList(data);
            setActiveProject(prev => prev ? { ...prev, modules: data } : prev);
          }
        }
      } catch (err) {
        console.error('Failed to load enriched modules:', err);
      }
    };

    fetchModules();
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

  // Choose icon based on module name
  const getModuleIcon = (name = '') => {
    const lower = name.toLowerCase();
    if (lower.includes('controller') || lower.includes('handler')) return <Cpu size={20} className="text-purple" />;
    if (lower.includes('model') || lower.includes('schema') || lower.includes('persistence') || lower.includes('data')) return <Database size={20} className="text-cyan" />;
    if (lower.includes('route') || lower.includes('routing') || lower.includes('endpoint')) return <Share2 size={20} className="text-green" />;
    if (lower.includes('middleware') || lower.includes('auth') || lower.includes('security')) return <ShieldCheck size={20} className="text-purple" />;
    if (lower.includes('ui') || lower.includes('presentation') || lower.includes('view') || lower.includes('component')) return <Layout size={20} className="text-cyan" />;
    if (lower.includes('config') || lower.includes('build') || lower.includes('env')) return <Settings size={20} className="text-muted" />;
    if (lower.includes('bootstrap') || lower.includes('entry')) return <Terminal size={20} className="text-green" />;
    return <Layers size={20} className="text-purple" />;
  };

  // Filter chip -> backend category key (the backend tags every module with `category`)
  const FILTER_TO_CATEGORIES = {
    Controllers: ['controllers'],
    Models: ['models'],
    Routing: ['routes'],
    Middleware: ['middleware'],
    Services: ['services'],
    UI: ['ui'],
    Utils: ['utils'],
    Config: ['config', 'bootstrap']
  };

  const doesModuleMatchCategory = (mod, filterKey) => {
    if (!mod || !filterKey || filterKey === 'ALL') return true;
    const wanted = FILTER_TO_CATEGORIES[filterKey];
    if (!wanted) return (mod.category || '').toLowerCase() === filterKey.toLowerCase();
    return wanted.includes((mod.category || '').toLowerCase());
  };

  const countForFilter = (filterKey) => modulesList.filter(m => doesModuleMatchCategory(m, filterKey)).length;

  // Search never crashes on missing fields
  const q = searchQuery.trim().toLowerCase();
  const filteredModules = modulesList.filter(mod => {
    const matchesFilter = doesModuleMatchCategory(mod, selectedFilter);
    const matchesSearch = q === '' ||
      (mod.name || '').toLowerCase().includes(q) ||
      (mod.purpose || '').toLowerCase().includes(q) ||
      (mod.files || []).some(f => f.toLowerCase().includes(q)) ||
      (mod.techs || []).some(t => t.toLowerCase().includes(q));
    return matchesFilter && matchesSearch;
  });

  const totalModuleFiles = modulesList.reduce((acc, m) => acc + (m.files?.length || 0), 0);

  return (
    <div className="analysis-page-container">
      <AnalysisNav 
        title="Detected System Modules" 
        subtitle="Architectural breakdown of detected modules, responsibilities, actual files, classes, dependencies, and inter-module connections."
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', textAlign: 'left' }}>
        
        {/* Top Summary Banner */}
        <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.3rem', color: 'var(--text-primary)', fontWeight: '800' }}>
                {activeProject.name} — Architecture Modules
              </h2>
              <span className="status-label-glow green" style={{ padding: '0.25rem 0.65rem', fontSize: '0.75rem' }}>
                ✓ {modulesList.length} Modules Mapped
              </span>
            </div>
            <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
              Dynamically discovered from repository directories, file imports, and code syntax patterns.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', fontWeight: '700' }}>Modules</span>
              <strong style={{ fontSize: '1.4rem', color: 'var(--accent-purple)' }}>{modulesList.length}</strong>
            </div>
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', fontWeight: '700' }}>Module Files</span>
              <strong style={{ fontSize: '1.4rem', color: 'var(--accent-cyan)' }}>{totalModuleFiles}</strong>
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
            <Filter size={15} className="text-purple" />
            {['ALL', 'Controllers', 'Models', 'Routing', 'Middleware', 'Services', 'UI', 'Utils', 'Config'].map(filterKey => {
              const isActive = selectedFilter === filterKey;
              return (
                <button
                  key={filterKey}
                  onClick={() => setSelectedFilter(filterKey)}
                  className={`btn btn-secondary ${isActive ? 'active' : ''}`}
                  style={{
                    padding: '0.35rem 0.75rem',
                    fontSize: '0.78rem',
                    background: isActive ? 'var(--accent-purple)' : 'var(--bg-card)',
                    color: isActive ? '#ffffff' : 'var(--text-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {filterKey === 'ALL' ? 'All Modules' : filterKey} ({countForFilter(filterKey)})
                </button>
              );
            })}
          </div>

          <div style={{ position: 'relative', minWidth: '240px' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text"
              placeholder="Search module, file, or tech..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '2rem', fontSize: '0.82rem', width: '100%', background: 'var(--bg-input)' }}
            />
          </div>
        </div>

        {/* Detailed Modules Cards List */}
        {filteredModules.length === 0 ? (
          <div className="glass-card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            {modulesList.length === 0
              ? 'No modules were detected for this project.'
              : searchQuery
                ? 'No modules match your search.'
                : `No ${selectedFilter} module was detected in this project.`}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {filteredModules.map((mod, index) => {
              const fileCount = mod.files?.length || 0;
              const classesCount = mod.classesOrComponents?.length || 0;

              return (
                <div 
                  key={index} 
                  className="glass-card border-purple" 
                  style={{ 
                    padding: '1.75rem', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '1.25rem', 
                    background: 'var(--bg-card)',
                    borderRadius: '10px'
                  }}
                >
                  {/* Module Card Top Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ background: 'rgba(109, 40, 217, 0.08)', border: '1px solid rgba(109, 40, 217, 0.2)', padding: '0.6rem', borderRadius: '8px' }}>
                        {getModuleIcon(mod.name)}
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-primary)', fontWeight: '800' }}>
                            {mod.name}
                          </h3>
                          <span style={{ fontSize: '0.7rem', background: 'var(--bg-deep)', border: '1px solid var(--border-color)', color: 'var(--text-muted)', padding: '0.15rem 0.45rem', borderRadius: '4px', fontWeight: '600' }}>
                            Module 0{index + 1}
                          </span>
                        </div>
                        <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: '500', lineHeight: '1.4' }}>
                          {mod.purpose}
                        </p>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <span className="node-mini-pill" style={{ background: 'var(--bg-deep)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.75rem', padding: '0.25rem 0.6rem', borderRadius: '4px' }}>
                        📁 {fileCount} {fileCount === 1 ? 'File' : 'Files'}
                      </span>
                      {classesCount > 0 && (
                        <span className="node-mini-pill" style={{ background: 'rgba(8, 145, 178, 0.08)', color: 'var(--accent-cyan)', border: '1px solid rgba(8, 145, 178, 0.2)', fontSize: '0.75rem', padding: '0.25rem 0.6rem', borderRadius: '4px', fontWeight: '600' }}>
                          {classesCount} Symbols / Classes
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Student Interview Explanation Box */}
                  {mod.explanation && (
                    <div style={{ background: 'rgba(109, 40, 217, 0.04)', border: '1px solid rgba(109, 40, 217, 0.15)', borderRadius: '8px', padding: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.4rem', color: 'var(--accent-purple)' }}>
                        <Lightbulb size={16} />
                        <strong style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                          How this Module Works in this Project (Interview Guide)
                        </strong>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                        {mod.explanation}
                      </p>
                    </div>
                  )}

                  {/* Cross-Module Connections */}
                  {mod.connections && mod.connections.length > 0 && (
                    <div>
                      <strong style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem', fontWeight: '700' }}>
                        <ArrowLeftRight size={14} className="text-cyan" /> Module Connections & Data Flow:
                      </strong>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {mod.connections.map((conn, cIdx) => (
                          <div 
                            key={cIdx} 
                            style={{ 
                              background: 'var(--bg-deep)', 
                              border: '1px solid var(--border-color)', 
                              borderRadius: '6px', 
                              padding: '0.4rem 0.75rem', 
                              fontSize: '0.82rem', 
                              color: 'var(--text-primary)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.4rem'
                            }}
                          >
                            <span style={{ color: 'var(--accent-purple)', fontWeight: 'bold' }}>⇄</span>
                            <span>{conn}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 2-Column Split: Actual Files/Classes & Tech/Dependencies */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                    
                    {/* Left: Actual Files & Classes/Components */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <strong style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: '700' }}>
                        <FileCode size={14} className="text-purple" /> Actual Project Files ({fileCount}):
                      </strong>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '160px', overflowY: 'auto' }}>
                        {mod.files?.map((f, fIdx) => (
                          <div 
                            key={fIdx} 
                            style={{ 
                              fontSize: '0.8rem', 
                              fontFamily: 'var(--font-mono)', 
                              color: 'var(--text-primary)', 
                              background: 'var(--bg-deep)', 
                              border: '1px solid var(--border-color)', 
                              padding: '0.35rem 0.65rem', 
                              borderRadius: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.4rem'
                            }}
                          >
                            <FileCode size={12} className="text-cyan" style={{ flexShrink: 0 }} />
                            <span>{f}</span>
                          </div>
                        ))}
                      </div>

                      {/* Detected Classes or Components */}
                      {mod.classesOrComponents && mod.classesOrComponents.length > 0 && (
                        <div style={{ marginTop: '0.35rem' }}>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '600' }}>
                            Classes / Exported Symbols:
                          </span>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.25rem' }}>
                            {mod.classesOrComponents.map((sym, sIdx) => (
                              <span 
                                key={sIdx} 
                                style={{ 
                                  fontFamily: 'var(--font-mono)', 
                                  fontSize: '0.72rem', 
                                  background: 'rgba(109, 40, 217, 0.08)', 
                                  color: 'var(--accent-purple)', 
                                  padding: '0.15rem 0.45rem', 
                                  borderRadius: '3px',
                                  fontWeight: '600' 
                                }}
                              >
                                {sym}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right: Technologies & Important Dependencies */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {/* Technologies */}
                      {mod.techs && mod.techs.length > 0 && (
                        <div>
                          <strong style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem', fontWeight: '700' }}>
                            <Code2 size={14} className="text-cyan" /> Technologies Used:
                          </strong>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                            {mod.techs.map((tech, tIdx) => (
                              <span 
                                key={tIdx} 
                                className="tech-chip" 
                                style={{ fontSize: '0.78rem', padding: '0.2rem 0.6rem' }}
                              >
                                {tech}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Important Dependencies */}
                      {mod.dependencies && mod.dependencies.length > 0 && (
                        <div>
                          <strong style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem', fontWeight: '700' }}>
                            <Package size={14} className="text-green" /> Important Dependencies:
                          </strong>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                            {mod.dependencies.map((dep, dIdx) => (
                              <span 
                                key={dIdx} 
                                style={{ 
                                  fontFamily: 'var(--font-mono)', 
                                  fontSize: '0.74rem', 
                                  background: 'rgba(5, 150, 105, 0.08)', 
                                  color: 'var(--accent-green)', 
                                  border: '1px solid rgba(5, 150, 105, 0.2)', 
                                  padding: '0.2rem 0.5rem', 
                                  borderRadius: '4px',
                                  fontWeight: '600'
                                }}
                              >
                                {dep}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                  </div>

                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}
