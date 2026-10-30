import React, { useContext, useState, useEffect } from 'react';
import { AppContext } from '../context/AppContext';
import { 
  Folder, File, FileCode, CheckCircle2, AlertTriangle, AlertOctagon, 
  Terminal, Cpu, Code, Layers, Share2, ZoomIn, ZoomOut, Maximize2, Plus, Minus, RotateCcw
} from 'lucide-react';
import './ProjectAnalysis.css';

export default function ProjectAnalysis() {
  const { projects, activeProject, setActiveProject, isProjectsLoading, API_BASE } = useContext(AppContext);
  const [selectedFile, setSelectedFile] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // overview, architecture, issues, modules
  const [fileContentLoading, setFileContentLoading] = useState(false);

  // Zoom & Pan states for the Import Graph SVG (Section 14)
  const [scale, setScale] = useState(1);
  const [translateX, setTranslateX] = useState(0);
  const [translateY, setTranslateY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Sync selected file when active project loads
  useEffect(() => {
    if (activeProject && activeProject.importantFiles && activeProject.importantFiles.length > 0) {
      setSelectedFile(activeProject.importantFiles[0]);
    } else {
      setSelectedFile(null);
    }
    // Reset zoom parameters
    setScale(1);
    setTranslateX(0);
    setTranslateY(0);
  }, [activeProject]);

  if (isProjectsLoading) {
    return (
      <div className="analysis-page-container" style={{ padding: '2rem' }}>
        <div className="glass-card" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
          <div className="typing-dots-animation"><span></span><span></span><span></span></div>
          <p style={{ marginTop: '1rem' }}>Loading workspace projects...</p>
        </div>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="analysis-page-container" style={{ padding: '2rem' }}>
        <div className="glass-card" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
          <h3>No scanned project assets found</h3>
          <p>Go to the Upload page to import and scan your project directories ZIP file.</p>
        </div>
      </div>
    );
  }

  // Helper: Recursive Directory Tree builder
  const renderTree = (node, depth = 0) => {
    if (!node) return null;
    const isFile = node.type === 'file';
    
    return (
      <div key={node.name} style={{ marginLeft: `${depth * 10}px` }}>
        <div className="tree-node-row" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', padding: '0.25rem 0' }}>
          {isFile ? <File size={12} className="text-cyan" /> : <Folder size={12} className="text-purple" />}
          <span style={{ fontSize: '0.78rem', color: isFile ? 'var(--text-secondary)' : 'var(--text-primary)' }}>{node.name}</span>
        </div>
        {node.children && node.children.map(child => renderTree(child, depth + 1))}
      </div>
    );
  };

  // Zoom & Pan handlers
  const handleZoomIn = () => setScale(prev => Math.min(2.5, prev + 0.15));
  const handleZoomOut = () => setScale(prev => Math.max(0.4, prev - 0.15));
  const handleResetZoom = () => {
    setScale(1);
    setTranslateX(0);
    setTranslateY(0);
  };

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - translateX, y: e.clientY - translateY });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setTranslateX(e.clientX - dragStart.x);
    setTranslateY(e.clientY - dragStart.y);
  };

  const handleMouseUp = () => setIsDragging(false);

  // Compute layout coordinates for nodes dynamically to prevent cramping (Section 14)
  const renderDynamicImportGraph = () => {
    const graph = activeProject.dependencyGraph || [];
    if (graph.length === 0) {
      return (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
          No file dependency imports detected in codebase scripts.
        </div>
      );
    }

    // Collect unique node names
    const distinctNodes = Array.from(new Set(graph.flatMap(edge => [edge.from, edge.to])));
    
    // Position nodes dynamically in 2-column layout to prevent overlapping
    const colWidth = 260;
    const rowHeight = 70;
    const numCols = 2;
    const nodeCoords = {};

    distinctNodes.forEach((node, idx) => {
      const col = idx % numCols;
      const row = Math.floor(idx / numCols);
      nodeCoords[node] = {
        x: col * colWidth + 50,
        y: row * rowHeight + 35
      };
    });

    const canvasWidth = numCols * colWidth + 100;
    const canvasHeight = Math.ceil(distinctNodes.length / numCols) * rowHeight + 50;

    return (
      <div 
        className="graph-canvas-container" 
        style={{ 
          border: '1px solid var(--border-color)', 
          background: 'rgba(0,0,0,0.3)', 
          borderRadius: '8px', 
          overflow: 'hidden', 
          position: 'relative', 
          height: '350px',
          cursor: isDragging ? 'grabbing' : 'grab'
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Controls Overlay */}
        <div style={{ position: 'absolute', right: '10px', top: '10px', display: 'flex', gap: '0.4rem', zIndex: 10 }}>
          <button className="btn btn-secondary" onClick={handleZoomIn} style={{ padding: '0.35rem' }} title="Zoom In"><ZoomIn size={14} /></button>
          <button className="btn btn-secondary" onClick={handleZoomOut} style={{ padding: '0.35rem' }} title="Zoom Out"><ZoomOut size={14} /></button>
          <button className="btn btn-secondary" onClick={handleResetZoom} style={{ padding: '0.35rem' }} title="Reset View"><RotateCcw size={14} /></button>
        </div>

        <svg 
          width="100%" 
          height="100%" 
          viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
          style={{ userSelect: 'none' }}
        >
          <defs>
            <marker id="arrow-marker" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--accent-purple-light)" />
            </marker>
          </defs>

          <g transform={`translate(${translateX}, ${translateY}) scale(${scale})`}>
            {/* Draw import paths */}
            {graph.map((edge, i) => {
              const fromCoord = nodeCoords[edge.from];
              const toCoord = nodeCoords[edge.to];
              if (!fromCoord || !toCoord) return null;

              return (
                <line 
                  key={`line-${i}`}
                  x1={fromCoord.x + 60} 
                  y1={fromCoord.y + 15}
                  x2={toCoord.x} 
                  y2={toCoord.y + 15}
                  stroke="var(--accent-purple)"
                  strokeWidth="1.5"
                  markerEnd="url(#arrow-marker)"
                  strokeDasharray="4,2"
                />
              );
            })}

            {/* Draw nodes */}
            {distinctNodes.map((node) => {
              const coord = nodeCoords[node];
              const fileName = node.split('/').pop();
              return (
                <g key={node} className="arch-node-group">
                  <rect 
                    x={coord.x} 
                    y={coord.y} 
                    width="140" 
                    height="32" 
                    rx="5" 
                    fill="#0d0d12" 
                    stroke="var(--accent-purple-light)" 
                    strokeWidth="1" 
                  />
                  <text 
                    x={coord.x + 70} 
                    y={coord.y + 19} 
                    textAnchor="middle" 
                    fill="#fff" 
                    fontSize="9.5" 
                    fontWeight="600"
                    title={node}
                  >
                    {fileName.length > 20 ? fileName.slice(0, 17) + '...' : fileName}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
      </div>
    );
  };

  // Render Dynamic Architecture layout based on scanned evidence (Section 13)
  const renderDynamicArchitecture = () => {
    const flow = activeProject.architectureFlow || [];
    if (flow.length === 0) {
      return (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
          No system architecture data maps generated.
        </div>
      );
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '1rem' }}>
        <div className="svg-flow-diagram-container" style={{ padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'rgba(0,0,0,0.1)' }}>
          <svg viewBox="0 0 320 250" style={{ width: '100%' }}>
            <defs>
              <filter id="glow-purple" x="-10%" y="-10%" width="120%" height="120%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {flow.map((edge, idx) => {
              const rowHeight = 70;
              const yStart = idx * rowHeight + 35;
              const yEnd = (idx + 1) * rowHeight + 10;
              return (
                <g key={idx}>
                  {/* Connection arrow */}
                  <line x1="160" y1={yStart} x2="160" y2={yEnd} stroke="var(--accent-cyan)" strokeWidth="1.5" strokeDasharray="3,3" />
                  <polygon points={`160,${yEnd} 156,${yEnd - 6} 164,${yEnd - 6}`} fill="var(--accent-cyan)" />
                  <text x="170" y={(yStart + yEnd) / 2 + 4} fill="var(--text-muted)" fontSize="8.5" fontFamily="var(--font-mono)">
                    {edge.relationType}
                  </text>
                  
                  {/* Start Node */}
                  <g className="arch-node-group">
                    <rect x="50" y={yStart - 30} width="220" height="30" rx="4" fill="#0d0d12" stroke="var(--accent-purple-light)" strokeWidth="1" />
                    <text x="160" y={yStart - 12} textAnchor="middle" fill="#fff" fontSize="9" fontWeight="bold">
                      {edge.from.toUpperCase()}
                    </text>
                  </g>

                  {/* End Node (only for the last edge) */}
                  {idx === flow.length - 1 && (
                    <g className="arch-node-group">
                      <rect x="50" y={yEnd} width="220" height="30" rx="4" fill="#0d0d12" stroke="var(--accent-green)" strokeWidth="1" filter="url(#glow-purple)" />
                      <text x="160" y={yEnd + 18} textAnchor="middle" fill="#fff" fontSize="9" fontWeight="bold">
                        {edge.to.toUpperCase()}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        <div style={{ marginTop: '0.5rem' }}>
          <h5 style={{ fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Scanned Architecture Evidence:</h5>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {flow.map((edge, i) => (
              <div key={i} style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <span style={{ color: 'var(--accent-purple-light)', fontWeight: 'bold' }}>{edge.from}</span>
                <span>──[{edge.relationType}]──&gt;</span>
                <span style={{ color: 'var(--accent-green-light)', fontWeight: 'bold' }}>{edge.to}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="analysis-page-container">
      {/* Selector drop panel */}
      <div className="analysis-top-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div className="header-text">
          <h1>Workspace Diagnostics</h1>
          <p>Inspect detected code flows, static diagnostic warnings, and package structures.</p>
        </div>

        <div className="project-dropdown-selector">
          <label style={{ marginRight: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Selected Project:</label>
          <select 
            className="form-input" 
            value={activeProject._id || activeProject.id}
            onChange={(e) => setActiveProject(projects.find(p => (p._id || p.id) === e.target.value))}
            style={{ padding: '0.4rem 1rem', background: 'var(--bg-input)' }}
          >
            {projects.map(p => (
              <option key={p._id || p.id} value={p._id || p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="workspace-layout-grid" style={{ display: 'grid', gridTemplateColumns: '300px 1fr 340px', gap: '1.5rem' }}>
        {/* Column 1: Files directory trees */}
        <div className="workspace-column tree-column glass-card">
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
            <Folder size={14} className="text-purple" /> Project Directory Files
          </h4>
          <div className="directory-scroller" style={{ maxHeight: '550px', overflowY: 'auto', textAlign: 'left' }}>
            {renderTree(activeProject.folderStructure)}
          </div>
        </div>

        {/* Column 2: Code Viewer editor */}
        <div className="workspace-column editor-column glass-card">
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
            <FileCode size={14} className="text-cyan" /> Selected File Inspector: {selectedFile?.name.split('/').pop() || 'None'}
          </h4>

          <div className="editor-textarea-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%', minHeight: '500px' }}>
            <div className="editor-textarea-preview" style={{ flexGrow: 1, minHeight: '260px' }}>
              <pre className="line-numbers-pre">
                <code>
                  {selectedFile?.code ? (
                    selectedFile.code.split('\n').map((line, idx) => (
                      <div key={idx} className="code-line-row">
                        <span className="line-num">{idx + 1}</span>
                        <span className="line-text">{line}</span>
                      </div>
                    ))
                  ) : (
                    <div className="empty-editor-text">Select a critical file node from index listings to view details.</div>
                  )}
                </code>
              </pre>
            </div>

            {/* AI Explanation Drawer below the code */}
            <div className="editor-ai-explanation-drawer" style={{ textAlign: 'left' }}>
              <div className="drawer-title" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 'bold' }}>
                <Cpu size={14} className="text-purple" />
                <span>AI Explains This Script</span>
              </div>
              <p className="explanation-paragraph-text" style={{ fontSize: '0.8rem', marginTop: '0.5rem', lineHeight: '1.4' }}>
                {selectedFile?.explanation || "Select a primary file node below to analyze details."}
              </p>
            </div>
          </div>
        </div>

        {/* Column 3: Context Tabs (Overview, Architecture, Issues, Modules) */}
        <div className="workspace-column details-column glass-card" style={{ textAlign: 'left' }}>
          {/* Tab buttons switcher */}
          <div style={{ display: 'flex', gap: '0.4rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1rem', overflowX: 'auto' }}>
            {['overview', 'architecture', 'issues', 'modules'].map(tab => (
              <button 
                key={tab}
                className={`tab-btn-mini ${activeTab === tab ? 'active' : ''}`}
                onClick={() => setActiveTab(tab)}
                style={{ fontSize: '0.72rem', padding: '0.35rem 0.5rem', textTransform: 'uppercase', borderRadius: '4px', background: activeTab === tab ? 'var(--accent-purple)' : 'transparent', color: activeTab === tab ? 'white' : 'var(--text-secondary)', border: 'none', cursor: 'pointer' }}
              >
                {tab}
              </button>
            ))}
          </div>

          {activeTab === 'overview' && (
            <div className="detail-tab-content tab-overview-panel">
              <h3>Hybrid Project Overview</h3>
              <div className="overview-summary-text">{activeProject.description}</div>

              {/* Programmatic Stats Block */}
              <div className="programmatic-metrics-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', margin: '1rem 0' }}>
                <div className="p-metric-card" style={{ background: 'rgba(255,255,255,0.03)', padding: '0.5rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', display: 'block' }}>Total Files</span>
                  <strong style={{ fontSize: '1.25rem', color: '#fff' }}>{activeProject.metrics?.totalFiles || 0}</strong>
                </div>
                <div className="p-metric-card" style={{ background: 'rgba(255,255,255,0.03)', padding: '0.5rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', display: 'block' }}>Lines of Code</span>
                  <strong style={{ fontSize: '1.25rem', color: 'var(--accent-purple-light)' }}>{activeProject.metrics?.linesOfCode || 0}</strong>
                </div>
                <div className="p-metric-card" style={{ background: 'rgba(255,255,255,0.03)', padding: '0.5rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', display: 'block' }}>Routes Scan</span>
                  <strong style={{ fontSize: '1.25rem', color: 'var(--accent-cyan)' }}>{activeProject.metrics?.apiEndpointsCount || 0} Paths</strong>
                </div>
                <div className="p-metric-card" style={{ background: 'rgba(255,255,255,0.03)', padding: '0.5rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', display: 'block' }}>Code Issues</span>
                  <strong style={{ fontSize: '1.25rem', color: activeProject.codeIssues?.length > 0 ? '#f87171' : 'var(--accent-green)' }}>
                    {activeProject.codeIssues?.length || 0}
                  </strong>
                </div>
              </div>

              {activeProject.endpointRoutes?.length > 0 && (
                <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                  <h4 style={{ fontSize: '0.85rem' }}>Detected Routing Paths:</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', maxHeight: '140px', overflowY: 'auto', marginTop: '0.4rem' }}>
                    {activeProject.endpointRoutes.slice(0, 8).map((route, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', padding: '0.2rem 0.4rem', background: 'rgba(255,255,255,0.03)', borderRadius: '4px' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>[{route.method}] {route.path}</span>
                        <span style={{ color: 'var(--text-muted)' }}>{route.type}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="stack-listing-section" style={{ marginTop: '1rem' }}>
                <h4>Detected Languages & Stacks</h4>
                <div className="tech-badge-wrap-row">
                  {activeProject.techStack.map((tech, idx) => (
                    <span key={idx} className="tech-chip">{tech}</span>
                  ))}
                </div>
              </div>

              <div className="important-indices-section" style={{ marginTop: '1rem' }}>
                <h4>Primary Files (Critical Nodes)</h4>
                <div className="indices-files-list">
                  {activeProject.importantFiles.map((file, idx) => (
                    <div 
                      key={idx} 
                      className={`indices-file-row ${selectedFile?.name === file.name ? 'active' : ''}`}
                      onClick={() => setSelectedFile(file)}
                    >
                      <FileCode size={14} />
                      <div className="file-row-details">
                        <span className="file-row-name">{file.name.split('/').pop()}</span>
                        <span className="file-row-purpose">{file.purpose}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'architecture' && (
            <div className="detail-tab-content tab-architecture-panel">
              <h3>System Data Flow</h3>
              <p className="arch-guidelines-desc">Dynamic layout mapping file connections and database interfaces.</p>
              
              {renderDynamicArchitecture()}

              {/* Dynamic Imports Relationship List */}
              {renderDynamicImportGraph()}
            </div>
          )}

          {activeTab === 'issues' && (
            <div className="detail-tab-content tab-issues-panel">
              <h3>Static Diagnostics</h3>
              <p className="arch-guidelines-desc">Warnings and vulnerabilities identified by static code analysis.</p>

              {activeProject.codeIssues?.length === 0 ? (
                <div className="no-issues-banner" style={{ border: '1px solid var(--accent-green)', color: 'var(--accent-green-light)', background: 'rgba(16,185,129,0.05)', padding: '1rem', borderRadius: '6px', textAlign: 'center', marginTop: '1rem' }}>
                  <CheckCircle2 size={24} style={{ margin: '0 auto 0.5rem auto' }} />
                  <strong>0 issues detected by the current static analysis checks.</strong>
                  <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', margin: '0.25rem 0 0 0' }}>Clean structural code configurations.</p>
                </div>
              ) : (
                <div className="issues-listing-wrapper" style={{ maxHeight: '340px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.50rem', marginTop: '1rem' }}>
                  {activeProject.codeIssues.map((issue, idx) => {
                    const isHigh = issue.severity === 'High';
                    const isMed = issue.severity === 'Medium';
                    const color = isHigh ? '#f87171' : isMed ? '#fbbf24' : '#67e8f9';
                    const bg = isHigh ? 'rgba(239,68,68,0.05)' : isMed ? 'rgba(245,158,11,0.05)' : 'rgba(6,182,212,0.05)';
                    
                    return (
                      <div key={idx} className="issue-card-item" style={{ border: `1px solid ${color}`, background: bg, padding: '0.5rem', borderRadius: '6px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                          <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            {isHigh ? <AlertOctagon size={10} /> : <AlertTriangle size={10} />}
                            {issue.issueType}
                          </span>
                          <span style={{ fontSize: '0.65rem', background: 'rgba(255,255,255,0.08)', padding: '0.1rem 0.3rem', borderRadius: '3px' }}>
                            Line {issue.line}
                          </span>
                        </div>
                        <p style={{ fontSize: '0.75rem', color: '#fff', margin: '0 0 0.25rem 0' }}>{issue.message}</p>
                        <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', display: 'inline-block' }}>
                          File: {issue.filePath.split('/').pop()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'modules' && (
            <div className="detail-tab-content tab-modules-panel">
              <h3>Scanned Module Breakdown</h3>
              <p className="arch-guidelines-desc">Core architectural boundaries detected dynamically (Section 15).</p>

              <div className="modules-stack-accordions" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
                {activeProject.modules.map((mod, index) => (
                  <div key={index} className="module-accordion-box glass-card border-purple" style={{ padding: '0.75rem 1rem' }}>
                    <div className="module-acc-title-row" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                      <Layers size={14} className="text-purple" />
                      <h5 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{mod.name}</h5>
                    </div>
                    <p className="module-acc-desc" style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0 0 0.75rem 0', lineHeight: '1.3' }}>{mod.purpose}</p>
                    
                    <div className="module-acc-meta-details" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {/* Separate tech chips (Section 15) */}
                      <div className="meta-block">
                        <strong style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Technologies:</strong>
                        <div className="meta-chips-wrap" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.2rem' }}>
                          {mod.techs.map((t, idx) => (
                            <span key={idx} className="tech-chip-mini" style={{ background: 'rgba(109,40,217,0.08)', color: 'var(--accent-purple-light)', border: '1px solid rgba(109,40,217,0.2)', fontSize: '0.7rem', padding: '0.15rem 0.35rem', borderRadius: '4px' }}>
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="meta-block">
                        <strong style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Key Files:</strong>
                        <div className="meta-files-list" style={{ marginTop: '0.2rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                          {mod.files.map((f, idx) => (
                            <div key={idx} className="meta-file-line" style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              📁 {f.split('/').pop()}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
