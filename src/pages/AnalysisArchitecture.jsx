import React, { useContext, useState, useEffect } from 'react';
import { AppContext } from '../context/AppContext';
import AnalysisNav from '../components/AnalysisNav';
import { 
  Share2, ZoomIn, ZoomOut, RotateCcw, Layers, ArrowRight, Activity, GitFork,
  Info, X, ChevronRight, FileCode, CheckCircle2
} from 'lucide-react';
import './ProjectAnalysis.css';

export default function AnalysisArchitecture() {
  const { projects, activeProject } = useContext(AppContext);

  // Zoom & Pan states for the Import Graph SVG
  const [scale, setScale] = useState(1);
  const [translateX, setTranslateX] = useState(0);
  const [translateY, setTranslateY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Simple wording: Selected node state for Component Details Drawer (Feature 4)
  const [selectedNode, setSelectedNode] = useState(null);

  useEffect(() => {
    setScale(1);
    setTranslateX(0);
    setTranslateY(0);
    setSelectedNode(null);
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

  // Simple wording: Resolves component details for the selected architecture node (Feature 4)
  const getSelectedComponentDetails = (nodeName) => {
    if (!nodeName) return null;

    const lower = nodeName.toLowerCase();
    const isFile = nodeName.includes('/') || nodeName.includes('.');
    const baseName = nodeName.split('/').pop();

    // Determine type & architectural role
    let type = 'System Component';
    let role = 'Participates in core system operations and data flow.';
    let relatedFiles = [];

    // Check if it matches an identified module
    const matchedModule = (activeProject.modules || []).find(
      m => m.name.toLowerCase() === lower || (m.files || []).some(f => f.toLowerCase().includes(lower))
    );

    if (matchedModule) {
      type = matchedModule.type || 'Functional Module';
      role = matchedModule.description || `Handles ${matchedModule.name} business logic.`;
      relatedFiles = matchedModule.files || [];
    } else if (isFile) {
      if (lower.includes('route') || lower.includes('controller') || lower.includes('api')) {
        type = 'Backend API / Controller';
        role = 'Accepts incoming HTTP requests, validates input parameters, and coordinates service responses.';
      } else if (lower.includes('model') || lower.includes('schema') || lower.includes('db') || lower.includes('entity')) {
        type = 'Database Persistence / Entity';
        role = 'Defines data structures, schemas, and handles database persistence logic.';
      } else if (lower.includes('component') || lower.includes('page') || lower.includes('view') || lower.endsWith('.jsx') || lower.endsWith('.tsx') || lower.endsWith('.vue')) {
        type = 'Frontend UI View / Component';
        role = 'Renders interactive user interface elements and dispatches user actions.';
      } else if (lower.includes('middleware') || lower.includes('auth') || lower.includes('guard')) {
        type = 'Security & Middleware';
        role = 'Enforces authentication, request authorization, and security policy checks.';
      } else if (lower.includes('util') || lower.includes('helper') || lower.includes('service')) {
        type = 'Core Utility / Service';
        role = 'Provides reusable helper routines, business calculations, or shared integration clients.';
      } else {
        type = 'Source Code Module';
        role = 'Executes application logic within the system dependency tree.';
      }
      relatedFiles = [nodeName];
    } else {
      if (lower.includes('client') || lower.includes('ui') || lower.includes('browser') || lower.includes('frontend')) {
        type = 'Frontend Client Layer';
        role = 'Initiates user interactions and handles client-side HTTP communication.';
      } else if (lower.includes('server') || lower.includes('backend') || lower.includes('api') || lower.includes('gateway')) {
        type = 'Server Application Gateway';
        role = 'Processes HTTP network requests, dispatches routes, and manages business workflows.';
      } else if (lower.includes('database') || lower.includes('mongo') || lower.includes('postgres') || lower.includes('sql')) {
        type = 'Database Storage Layer';
        role = 'Persists operational state, records, and provides indexed data query capabilities.';
      }
    }

    // Find outgoing dependencies
    const outgoing = (activeProject.dependencyGraph || [])
      .filter(e => e.from === nodeName || e.from.endsWith('/' + baseName))
      .map(e => e.to);

    // Find incoming dependencies
    const incoming = (activeProject.dependencyGraph || [])
      .filter(e => e.to === nodeName || e.to.endsWith('/' + baseName))
      .map(e => e.from);

    // Check architecture flow edges
    const flowOutgoing = (activeProject.architectureFlow || [])
      .filter(e => e.from.toLowerCase() === lower)
      .map(e => `${e.to} (${e.relationType})`);

    const flowIncoming = (activeProject.architectureFlow || [])
      .filter(e => e.to.toLowerCase() === lower)
      .map(e => `${e.from} (${e.relationType})`);

    return {
      name: baseName,
      fullName: nodeName,
      type,
      role,
      relatedFiles: Array.from(new Set(relatedFiles)),
      outgoing: Array.from(new Set([...outgoing, ...flowOutgoing])),
      incoming: Array.from(new Set([...incoming, ...flowIncoming]))
    };
  };

  // Dynamic Dependency Imports Graph Builder
  const renderDynamicImportGraph = () => {
    const fullGraph = activeProject.dependencyGraph || [];
    if (fullGraph.length === 0) {
      return (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          No file dependency imports detected in codebase scripts.
        </div>
      );
    }
    // Keep the canvas readable: draw only the most connected files when the repository is large
    const MAX_GRAPH_NODES = 40;
    const degree = {};
    fullGraph.forEach(e => { degree[e.from] = (degree[e.from] || 0) + 1; degree[e.to] = (degree[e.to] || 0) + 1; });
    const allNodes = Object.keys(degree);
    const keep = new Set(allNodes.sort((a, b) => degree[b] - degree[a]).slice(0, MAX_GRAPH_NODES));
    const graph = allNodes.length > MAX_GRAPH_NODES ? fullGraph.filter(e => keep.has(e.from) && keep.has(e.to)) : fullGraph;

    const distinctNodes = Array.from(new Set(graph.flatMap(edge => [edge.from, edge.to])));
    const colWidth = 280;
    const rowHeight = 80;
    const numCols = Math.min(3, Math.max(2, Math.ceil(distinctNodes.length / 5)));
    const nodeCoords = {};

    distinctNodes.forEach((node, idx) => {
      const col = idx % numCols;
      const row = Math.floor(idx / numCols);
      nodeCoords[node] = {
        x: col * colWidth + 60,
        y: row * rowHeight + 40
      };
    });

    const canvasWidth = numCols * colWidth + 120;
    const canvasHeight = Math.ceil(distinctNodes.length / numCols) * rowHeight + 80;

    return (
      <div 
        className="graph-canvas-container" 
        style={{ 
          border: '1px solid var(--border-color)', 
          background: '#0d1117', 
          borderRadius: '8px', 
          overflow: 'hidden', 
          position: 'relative', 
          height: '450px',
          cursor: isDragging ? 'grabbing' : 'grab'
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Controls Overlay */}
        <div style={{ position: 'absolute', right: '12px', top: '12px', display: 'flex', gap: '0.4rem', zIndex: 10 }}>
          <button className="btn btn-secondary" onClick={handleZoomIn} style={{ padding: '0.4rem' }} title="Zoom In"><ZoomIn size={15} /></button>
          <button className="btn btn-secondary" onClick={handleZoomOut} style={{ padding: '0.4rem' }} title="Zoom Out"><ZoomOut size={15} /></button>
          <button className="btn btn-secondary" onClick={handleResetZoom} style={{ padding: '0.4rem' }} title="Reset View"><RotateCcw size={15} /></button>
        </div>

        <svg 
          width="100%" 
          height="100%" 
          viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
          style={{ userSelect: 'none' }}
        >
          <defs>
            <marker id="arrow-marker" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#a78bfa" />
            </marker>
          </defs>

          <g transform={`translate(${translateX}, ${translateY}) scale(${scale})`}>
            {graph.map((edge, i) => {
              const fromCoord = nodeCoords[edge.from];
              const toCoord = nodeCoords[edge.to];
              if (!fromCoord || !toCoord) return null;

              return (
                <line 
                  key={`line-${i}`}
                  x1={fromCoord.x + 80} 
                  y1={fromCoord.y + 18}
                  x2={toCoord.x} 
                  y2={toCoord.y + 18}
                  stroke="var(--accent-purple)"
                  strokeWidth="1.5"
                  markerEnd="url(#arrow-marker)"
                  strokeDasharray="4,2"
                />
              );
            })}

            {distinctNodes.map((node) => {
              const coord = nodeCoords[node];
              const fileName = node.split('/').pop();
              const isSelected = selectedNode === node;
              return (
                <g 
                  key={node} 
                  className="arch-node-group"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedNode(prev => prev === node ? null : node);
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  <rect 
                    x={coord.x} 
                    y={coord.y} 
                    width="160" 
                    height="36" 
                    rx="6" 
                    fill={isSelected ? '#1e293b' : '#161b22'} 
                    stroke={isSelected ? '#38bdf8' : 'var(--accent-purple-light)'} 
                    strokeWidth={isSelected ? '2.5' : '1.2'} 
                  />
                  <text 
                    x={coord.x + 80} 
                    y={coord.y + 22} 
                    textAnchor="middle" 
                    fill={isSelected ? '#38bdf8' : '#f0f6fc'} 
                    fontSize="11" 
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

  // Render System Flow Diagram
  // ---- Real architecture (derived from the scanned repository) ----
  const arch = activeProject.architecture || null;
  const KIND_LABEL = { imports: 'imports', http: 'HTTP calls', persists: 'persists data', calls: 'external calls' };

  const renderRealArchitecture = () => {
    const nameOf = (key) => {
      if (key === 'database') return (arch.database && arch.database.name) || 'Database';
      if (String(key).startsWith('external:')) return String(key).slice(9);
      const layer = (arch.layers || []).find(l => l.key === key);
      return layer ? layer.name : key;
    };
    const outgoing = (key) => (arch.edges || []).filter(e => e.from === key);
    const chip = (text, color = 'var(--accent-purple)') => (
      <span style={{ fontSize: '0.72rem', padding: '0.15rem 0.5rem', borderRadius: '999px', border: `1px solid ${color}`, color, whiteSpace: 'nowrap' }}>{text}</span>
    );

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Detected architecture</div>
          <h3 style={{ margin: '0.25rem 0 0.5rem 0', color: 'var(--text-primary)' }}>{arch.type}</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.75rem' }}>
            {(arch.patterns || []).map(pt => <React.Fragment key={pt}>{chip(pt, 'var(--accent-cyan)')}</React.Fragment>)}
          </div>
          <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{arch.summary}</p>
        </div>

        {(arch.technologies || []).length > 0 && (
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.4rem' }}>Detected technologies</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {arch.technologies.map(t => <React.Fragment key={t}>{chip(t)}</React.Fragment>)}
            </div>
          </div>
        )}

        {(arch.entryPoints || []).length > 0 && (
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            <strong>Entry points: </strong>{arch.entryPoints.map(f => <code key={f} style={{ marginRight: '0.6rem' }}>{f}</code>)}
          </div>
        )}

        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Layers and how they connect</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {(arch.layers || []).map((layer, i) => {
            const out = outgoing(layer.key);
            return (
              <div key={layer.key}>
                <div style={{ border: '1px solid var(--border-color)', borderLeft: '4px solid var(--accent-purple)', borderRadius: '8px', padding: '0.85rem 1rem', background: 'var(--bg-card)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <strong style={{ color: 'var(--text-primary)' }}>{layer.name}</strong>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{layer.fileCount} file{layer.fileCount === 1 ? '' : 's'}</span>
                  </div>
                  {layer.purpose && <p style={{ margin: '0.3rem 0 0.5rem 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{layer.purpose}</p>}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                    {(layer.files || []).slice(0, 6).map(f => (
                      <code key={f} style={{ fontSize: '0.72rem', background: 'var(--bg-deep)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>{f.split('/').pop()}</code>
                    ))}
                    {layer.fileCount > 6 && <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>+{layer.fileCount - 6} more</span>}
                  </div>
                </div>
                {out.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', padding: '0.4rem 0 0.1rem 1rem', alignItems: 'center' }}>
                    <ArrowRight size={13} className="text-cyan" />
                    {out.map((e, k) => (
                      <React.Fragment key={k}>{chip(`${nameOf(e.to)} · ${KIND_LABEL[e.kind] || e.kind} (${e.count})`, 'var(--accent-cyan)')}</React.Fragment>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {arch.database && (
            <div style={{ border: '1px solid var(--border-color)', borderLeft: '4px solid var(--accent-green)', borderRadius: '8px', padding: '0.85rem 1rem', background: 'var(--bg-card)' }}>
              <strong style={{ color: 'var(--text-primary)' }}>{arch.database.name}</strong>
              {(arch.database.collections || []).length > 0 && (
                <p style={{ margin: '0.3rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Entities: {arch.database.collections.join(', ')}</p>
              )}
            </div>
          )}
          {(arch.externalServices || []).map(svc => (
            <div key={svc.name} style={{ border: '1px solid var(--border-color)', borderLeft: '4px solid var(--accent-cyan)', borderRadius: '8px', padding: '0.85rem 1rem', background: 'var(--bg-card)' }}>
              <strong style={{ color: 'var(--text-primary)' }}>{svc.name}</strong>
              <p style={{ margin: '0.3rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Used by: {svc.usedBy.join(', ')}</p>
            </div>
          ))}
        </div>
        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Generated from static analysis of the uploaded files: layers come from detected modules; arrows only exist where real imports, HTTP calls or driver usage were found.
        </p>
      </div>
    );
  };

  const renderDynamicArchitecture = () => {
    const flow = activeProject.architectureFlow || [];
    if (flow.length === 0) {
      return (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
          No system architecture data flow generated.
        </div>
      );
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div className="svg-flow-diagram-container" style={{ padding: '1.5rem', border: '1px solid var(--border-color)', borderRadius: '8px', background: '#0d1117' }}>
          <svg viewBox="0 0 360 270" style={{ width: '100%', maxHeight: '300px' }}>
            <defs>
              <filter id="glow-green" x="-10%" y="-10%" width="120%" height="120%">
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
                  <line x1="180" y1={yStart} x2="180" y2={yEnd} stroke="var(--accent-cyan)" strokeWidth="2" strokeDasharray="4,3" />
                  <polygon points={`180,${yEnd} 175,${yEnd - 7} 185,${yEnd - 7}`} fill="var(--accent-cyan)" />
                  <text x="190" y={(yStart + yEnd) / 2 + 4} fill="#94a3b8" fontSize="10" fontFamily="var(--font-mono)">
                    {edge.relationType}
                  </text>
                  
                  <g 
                    className="arch-node-group"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedNode(prev => prev === edge.from ? null : edge.from);
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    <rect 
                      x="50" 
                      y={yStart - 30} 
                      width="260" 
                      height="32" 
                      rx="6" 
                      fill={selectedNode === edge.from ? '#1e293b' : '#161b22'} 
                      stroke={selectedNode === edge.from ? '#38bdf8' : 'var(--accent-purple)'} 
                      strokeWidth={selectedNode === edge.from ? '2.5' : '1.2'} 
                    />
                    <text 
                      x="180" 
                      y={yStart - 10} 
                      textAnchor="middle" 
                      fill={selectedNode === edge.from ? '#38bdf8' : '#ffffff'} 
                      fontSize="11" 
                      fontWeight="bold"
                    >
                      {edge.from.toUpperCase()}
                    </text>
                  </g>

                  {idx === flow.length - 1 && (
                    <g 
                      className="arch-node-group"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedNode(prev => prev === edge.to ? null : edge.to);
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      <rect 
                        x="50" 
                        y={yEnd} 
                        width="260" 
                        height="32" 
                        rx="6" 
                        fill={selectedNode === edge.to ? '#1e293b' : '#161b22'} 
                        stroke={selectedNode === edge.to ? '#38bdf8' : 'var(--accent-green)'} 
                        strokeWidth={selectedNode === edge.to ? '2.5' : '1.2'} 
                      />
                      <text 
                        x="180" 
                        y={yEnd + 20} 
                        textAnchor="middle" 
                        fill={selectedNode === edge.to ? '#38bdf8' : '#ffffff'} 
                        fontSize="11" 
                        fontWeight="bold"
                      >
                        {edge.to.toUpperCase()}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        <div>
          <h4 style={{ fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: '0.5rem', fontWeight: '700' }}>
            Mapped Architecture Evidence:
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {flow.map((edge, i) => (
              <div 
                key={i} 
                style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', gap: '0.6rem', alignItems: 'center', background: 'var(--bg-card)', border: '1px solid var(--border-color)', padding: '0.5rem 0.85rem', borderRadius: '6px' }}
              >
                <span 
                  style={{ 
                    color: selectedNode === edge.from ? '#38bdf8' : 'var(--accent-purple)', 
                    fontWeight: 'bold', 
                    cursor: 'pointer',
                    textDecoration: selectedNode === edge.from ? 'underline' : 'none'
                  }}
                  onClick={() => setSelectedNode(prev => prev === edge.from ? null : edge.from)}
                  title="Click to inspect this tier"
                >
                  {edge.from}
                </span>
                <span style={{ color: 'var(--accent-cyan)', fontWeight: '600' }}>──[{edge.relationType}]──&gt;</span>
                <span 
                  style={{ 
                    color: selectedNode === edge.to ? '#38bdf8' : 'var(--accent-green)', 
                    fontWeight: 'bold', 
                    cursor: 'pointer',
                    textDecoration: selectedNode === edge.to ? 'underline' : 'none'
                  }}
                  onClick={() => setSelectedNode(prev => prev === edge.to ? null : edge.to)}
                  title="Click to inspect this tier"
                >
                  {edge.to}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Simple wording: Extract details for selected node
  const selectedDetails = getSelectedComponentDetails(selectedNode);

  return (
    <div className="analysis-page-container">
      <AnalysisNav 
        title="System Architecture & Flow Analysis" 
        subtitle="Visual map of data flow pipelines and inter-file dependency import graphs."
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', textAlign: 'left' }}>
        
        {/* 2-Column Grid: System Data Flow & Dependency Import Graph */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))', gap: '1.5rem', alignItems: 'start' }}>
          
          {/* Column 1: Real detected architecture (falls back to legacy flow for old projects) */}
          <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)', fontWeight: '700', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Activity size={16} className="text-cyan" /> {arch ? 'Detected Architecture & Layers' : 'End-to-End System Data Flow'}
            </h3>
            {!arch && (
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                This project was analysed with an older version. Re-upload it to get the detailed architecture view.
              </p>
            )}
            {arch ? renderRealArchitecture() : renderDynamicArchitecture()}
          </div>

          {/* Column 2: Interactive Dependency Imports Graph */}
          <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <GitFork size={16} className="text-purple" /> Inter-File Dependency Imports Graph
              </h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {activeProject.analysis?.dependencyGraphTotal || activeProject.dependencyGraph?.length || 0} Connections
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Interactive pan/zoom graph depicting import linkages between codebase scripts.
            </p>
            {renderDynamicImportGraph()}
            {new Set((activeProject.dependencyGraph || []).flatMap(e => [e.from, e.to])).size > 40 && (
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Showing the 40 most connected files to keep the graph readable ({activeProject.analysis?.dependencyGraphTotal || activeProject.dependencyGraph.length} imports in total).
              </p>
            )}
          </div>

        </div>

        {/* Simple wording: Component Details Drawer (Feature 4) */}
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Info size={18} className="text-cyan" />
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)', fontWeight: '700' }}>
                Component Details {selectedDetails ? `— ${selectedDetails.name}` : ''}
              </h3>
              {selectedDetails && (
                <span className="status-label-glow purple" style={{ fontSize: '0.75rem' }}>
                  {selectedDetails.type}
                </span>
              )}
            </div>
            {selectedNode && (
              <button 
                className="btn btn-secondary" 
                onClick={() => setSelectedNode(null)} 
                style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.78rem', padding: '0.3rem 0.6rem' }}
              >
                <X size={14} /> Clear Selection
              </button>
            )}
          </div>

          {selectedDetails ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
              {/* Architectural Role */}
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Architectural Role
                </h4>
                <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-primary)', lineHeight: '1.5' }}>
                  {selectedDetails.role}
                </p>
                <div style={{ marginTop: '0.75rem', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  <strong>Node Identifier:</strong> <code style={{ fontSize: '0.75rem' }}>{selectedDetails.fullName}</code>
                </div>
              </div>

              {/* Related Files */}
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Related Files ({selectedDetails.relatedFiles.length})
                </h4>
                {selectedDetails.relatedFiles.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', maxHeight: '130px', overflowY: 'auto' }}>
                    {selectedDetails.relatedFiles.map((rf, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        <FileCode size={13} className="text-cyan" style={{ flexShrink: 0 }} />
                        <code style={{ fontSize: '0.76rem', wordBreak: 'break-all' }}>{rf}</code>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>No direct source file mapping recorded.</p>
                )}
              </div>

              {/* Outgoing Calls & Dependencies */}
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Outgoing Calls / Dependencies ({selectedDetails.outgoing.length})
                </h4>
                {selectedDetails.outgoing.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', maxHeight: '130px', overflowY: 'auto' }}>
                    {selectedDetails.outgoing.map((out, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        <ChevronRight size={13} className="text-purple" style={{ flexShrink: 0 }} />
                        <span>{out.split('/').pop()}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>No outgoing dependencies detected from this node.</p>
                )}
              </div>

              {/* Incoming Calls & Dependencies */}
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Incoming Calls / Dependencies ({selectedDetails.incoming.length})
                </h4>
                {selectedDetails.incoming.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', maxHeight: '130px', overflowY: 'auto' }}>
                    {selectedDetails.incoming.map((inc, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        <ArrowRight size={13} className="text-green" style={{ flexShrink: 0 }} />
                        <span>{inc.split('/').pop()}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>No incoming dependencies detected to this node.</p>
                )}
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '1.75rem', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
              💡 <em>Click on any node in the Architecture Flow diagram or Dependency Graph above to inspect its architectural role, related files, and incoming/outgoing dependencies.</em>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
