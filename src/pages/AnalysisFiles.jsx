import React, { useContext, useState, useEffect } from 'react';
import { AppContext } from '../context/AppContext';
import AnalysisNav from '../components/AnalysisNav';
import { 
  Folder, File, FileCode, Cpu, Code, Search, 
  ChevronRight, ChevronDown, Sparkles, BookOpen, Layers, HelpCircle, RefreshCw
} from 'lucide-react';
import './ProjectAnalysis.css';

export default function AnalysisFiles() {
  const { projects, activeProject, API_BASE } = useContext(AppContext);
  const [selectedFile, setSelectedFile] = useState(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [explaining, setExplaining] = useState(false);
  const [explanationData, setExplanationData] = useState(null);
  const [activeExplainTab, setActiveExplainTab] = useState('summary');
  const [explainError, setExplainError] = useState('');

  // Selected file change hone par explanation reset karo
  useEffect(() => {
    setExplanationData(null);
    setExplainError('');
  }, [selectedFile?.name]);

  // AI Project Explainer call
  const handleExplain = async (actionType = 'explain', scopeType = 'file') => {
    if (!activeProject || !selectedFile) return;
    setExplaining(true);
    setExplainError('');
    const token = localStorage.getItem('projectiq_token');
    const projectId = activeProject._id || activeProject.id;

    try {
      const res = await fetch(`${API_BASE}/projects/${projectId}/explain`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          // The server reads the full stored source of this file; no snippet needs to be sent
          filePath: selectedFile.name,
          scope: scopeType,
          action: actionType
        })
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setExplanationData(data.explanation);
        if (data.aiAvailable === false) setExplainError('AI explanation is unavailable on the server; showing static facts only.');
      } else {
        setExplainError(data.message || 'Could not generate an explanation. Please try again.');
      }
    } catch (err) {
      console.error('Failed to get AI explanation:', err);
      setExplainError('Could not reach the server. Please check your connection.');
    } finally {
      setExplaining(false);
    }
  };

  // Loads the real stored source of any file from the repository tree
  const loadFileContent = async (fullPath) => {
    const token = localStorage.getItem('projectiq_token');
    const projectId = activeProject._id || activeProject.id;
    setSelectedFile({ name: fullPath, purpose: 'Project source file', code: null, loading: true });
    try {
      const res = await fetch(`${API_BASE}/projects/${projectId}/file?path=${encodeURIComponent(fullPath)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json().catch(() => ({}));
      setSelectedFile(prev => (prev && prev.name === fullPath)
        ? (res.ok
          ? { name: fullPath, purpose: `${data.language || 'Source'} file · ${data.lineCount} lines`, code: data.content }
          : { name: fullPath, purpose: 'Project source file', code: null, loadError: data.message || 'Content is not available for this file.' })
        : prev);
    } catch (err) {
      setSelectedFile(prev => (prev && prev.name === fullPath) ? { name: fullPath, purpose: 'Project source file', code: null, loadError: 'Could not load the file. Please check your connection.' } : prev);
    }
  };

  // Default select first primary file
  useEffect(() => {
    if (activeProject && activeProject.importantFiles && activeProject.importantFiles.length > 0) {
      setSelectedFile(activeProject.importantFiles[0]);
    } else {
      setSelectedFile(null);
    }
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

  // A node is visible if it (or any descendant) matches the search text
  const nodeMatches = (node, q) => {
    if (!node) return false;
    if (q === '') return true;
    if ((node.name || '').toLowerCase().includes(q)) return true;
    return (node.children || []).some(c => nodeMatches(c, q));
  };

  // Recursive Directory Tree Builder. `parentPath` rebuilds each file's real archive path.
  const renderTree = (node, depth = 0, parentPath = '') => {
    if (!node) return null;
    if (Array.isArray(node)) {
      return node.map((child, idx) => (
        <React.Fragment key={child.name || idx}>
          {renderTree(child, depth, parentPath)}
        </React.Fragment>
      ));
    }
    const q = searchFilter.trim().toLowerCase();
    if (!nodeMatches(node, q)) return null;

    const isFile = node.type === 'file';
    const fullPath = node.synthetic ? '' : (parentPath ? `${parentPath}/${node.name}` : node.name);
    const matchedImportantFile = isFile && activeProject.importantFiles
      ? activeProject.importantFiles.find(f => f.name === fullPath)
      : null;
    const isSelected = isFile && selectedFile && selectedFile.name === fullPath;

    return (
      <div key={fullPath || node.name} style={{ marginLeft: node.synthetic ? 0 : `${depth * 14}px` }}>
        {!node.synthetic && (
          <div 
            className={`tree-node-row ${isSelected ? 'active-tree-node' : ''}`}
            onClick={() => {
              if (!isFile) return;
              if (matchedImportantFile) setSelectedFile(matchedImportantFile);
              else loadFileContent(fullPath);
            }}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.45rem', 
              cursor: isFile ? 'pointer' : 'default', 
              padding: '0.35rem 0.5rem', 
              borderRadius: '4px',
              background: isSelected ? 'rgba(109, 40, 217, 0.1)' : 'transparent',
              color: isSelected ? 'var(--accent-purple)' : isFile ? 'var(--text-secondary)' : 'var(--text-primary)',
              fontWeight: isSelected ? '700' : 'normal'
            }}
          >
            {isFile ? (
              <FileCode size={13} className={isSelected ? 'text-purple' : 'text-cyan'} />
            ) : (
              <Folder size={13} className="text-purple" />
            )}
            <span style={{ fontSize: '0.82rem', fontFamily: isFile ? 'var(--font-mono)' : 'inherit' }}>
              {node.name}
            </span>
          </div>
        )}
        {node.children && node.children.map(child => renderTree(child, node.synthetic ? depth : depth + 1, fullPath))}
      </div>
    );
  };

  const fileName = selectedFile?.name ? selectedFile.name.split('/').pop() : 'No file selected';

  return (
    <div className="analysis-page-container">
      <AnalysisNav 
        title="Project File Explorer & Inspector" 
        subtitle="Browse full repository file trees, inspect source codes with line numbers, and view AI file explanations."
      />

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '1.5rem', textAlign: 'left', alignItems: 'start' }}>
        
        {/* Left Column: File Explorer Tree & Quick Picker */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Quick Primary Files Picker */}
          <div className="glass-card" style={{ padding: '1.25rem' }}>
            <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.88rem', color: 'var(--text-primary)', fontWeight: '700', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Sparkles size={14} className="text-purple" /> Critical Entry Files
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', maxHeight: '180px', overflowY: 'auto' }}>
              {activeProject.importantFiles?.map((file, idx) => {
                const isCur = selectedFile?.name === file.name;
                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedFile(file)}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.5rem', 
                      background: isCur ? 'rgba(109, 40, 217, 0.15)' : 'var(--bg-card)', 
                      border: isCur ? '1px solid var(--accent-purple)' : '1px solid var(--border-color)', 
                      padding: '0.45rem 0.65rem', 
                      borderRadius: '5px', 
                      textAlign: 'left', 
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      color: isCur ? 'var(--accent-purple)' : 'var(--text-primary)',
                      fontWeight: isCur ? '700' : '500'
                    }}
                  >
                    <FileCode size={13} className={isCur ? 'text-purple' : 'text-cyan'} />
                    <span style={{ fontFamily: 'var(--font-mono)' }}>{file.name.split('/').pop()}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Full Repository Directory Tree */}
          <div className="glass-card" style={{ padding: '1.25rem' }}>
            <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.88rem', color: 'var(--text-primary)', fontWeight: '700', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Folder size={14} className="text-purple" /> Full Repository Tree
            </h4>

            <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
              <Search size={13} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Search files..."
                className="form-input"
                style={{ width: '100%', paddingLeft: '1.75rem', fontSize: '0.8rem' }}
              />
            </div>

            <div className="directory-scroller" style={{ maxHeight: '420px', overflowY: 'auto' }}>
              {renderTree(activeProject.folderStructure)}
            </div>
          </div>

        </div>

        {/* Right Column: Code Viewer & AI Script Explanation Drawer */}
        <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', minHeight: '640px' }}>
          
          {/* Header with Active File Info */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileCode size={18} className="text-cyan" />
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)', fontWeight: '800' }}>
                  {fileName}
                </h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {selectedFile?.purpose || 'Scanned source script'}
                </span>
              </div>
            </div>

            <span className="node-mini-pill" style={{ background: 'var(--bg-deep)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
              {selectedFile?.code ? selectedFile.code.split('\n').length : 0} Lines
            </span>
          </div>

          {/* Code Viewer Box */}
          <div className="editor-textarea-wrapper" style={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
            <div className="editor-textarea-preview" style={{ flexGrow: 1, minHeight: '340px', background: '#0f172a', borderRadius: '8px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
              <pre className="line-numbers-pre" style={{ margin: 0, padding: '1rem', overflowX: 'auto', maxHeight: '450px' }}>
                <code>
                  {selectedFile?.loading ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>Loading file...</div>
                  ) : selectedFile?.loadError ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: '#fbbf24' }}>{selectedFile.loadError}</div>
                  ) : selectedFile?.code ? (
                    selectedFile.code.split('\n').map((line, idx) => (
                      <div key={idx} className="code-line-row" style={{ display: 'flex', gap: '1rem', fontSize: '0.84rem', lineHeight: '1.6' }}>
                        <span className="line-num" style={{ color: '#64748b', minWidth: '28px', textAlign: 'right', userSelect: 'none' }}>{idx + 1}</span>
                        <span className="line-text" style={{ color: '#f8fafc', fontFamily: 'var(--font-mono)' }}>{line}</span>
                      </div>
                    ))
                  ) : (
                    <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                      Select a file from the repository tree on the left to inspect code.
                    </div>
                  )}
                </code>
              </pre>
            </div>
          </div>

          {/* AI Project Explainer Drawer */}
          <div className="editor-ai-explanation-drawer" style={{ background: 'rgba(109, 40, 217, 0.04)', border: '1px solid rgba(109, 40, 217, 0.2)', borderRadius: '8px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.6rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Cpu size={18} className="text-purple" />
                <strong style={{ fontSize: '0.95rem', color: 'var(--accent-purple)' }}>AI Project Explainer</strong>
              </div>

              {/* Action Buttons to trigger grounded AI Explanation */}
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                <button 
                  className="btn btn-secondary" 
                  onClick={() => handleExplain('explain', 'file')}
                  disabled={explaining || !selectedFile}
                  style={{ padding: '0.3rem 0.65rem', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <Sparkles size={12} className="text-purple" />
                  {explaining ? 'Analyzing...' : 'Deep AI Explanation'}
                </button>
                <button 
                  className="btn btn-secondary" 
                  onClick={() => handleExplain('how-it-works', 'function')}
                  disabled={explaining || !selectedFile}
                  style={{ padding: '0.3rem 0.65rem', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <Layers size={12} className="text-cyan" />
                  How It Works
                </button>
              </div>
            </div>

            {/* Explaining loading spinner */}
            {explaining && (
              <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <div className="typing-dots-animation" style={{ display: 'flex', gap: '0.3rem', justifyContent: 'center', marginBottom: '0.5rem' }}>
                  <span className="dot animate-pulse"></span>
                  <span className="dot animate-pulse" style={{ animationDelay: '0.2s' }}></span>
                  <span className="dot animate-pulse" style={{ animationDelay: '0.4s' }}></span>
                </div>
                <span style={{ fontSize: '0.82rem' }}>AI is analyzing {fileName} against repository dependencies & architecture...</span>
              </div>
            )}

            {/* Deep Grounded AI Explainer Result */}
            {!explaining && explanationData && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {/* Tabs */}
                <div style={{ display: 'flex', gap: '0.35rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.4rem', overflowX: 'auto' }}>
                  {[
                    { id: 'summary', label: '1. What It Does' },
                    { id: 'howItWorks', label: '2. How It Works' },
                    { id: 'whyUsed', label: '3. Why It Is Used' },
                    { id: 'dependencies', label: '4. Dependencies' },
                    { id: 'projectContext', label: '5. Project Context' }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveExplainTab(tab.id)}
                      style={{
                        background: activeExplainTab === tab.id ? 'var(--accent-purple)' : 'transparent',
                        color: activeExplainTab === tab.id ? '#ffffff' : 'var(--text-secondary)',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '0.25rem 0.6rem',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Tab content */}
                <div style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: '1.6', background: 'var(--bg-card)', padding: '0.75rem 1rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                  {activeExplainTab === 'summary' && (
                    <p style={{ margin: 0 }}><strong style={{ color: 'var(--text-primary)' }}>Overview:</strong> {explanationData.summary}</p>
                  )}
                  {activeExplainTab === 'howItWorks' && (
                    <p style={{ margin: 0 }}><strong style={{ color: 'var(--text-primary)' }}>Execution Flow:</strong> {explanationData.howItWorks}</p>
                  )}
                  {activeExplainTab === 'whyUsed' && (
                    <p style={{ margin: 0 }}><strong style={{ color: 'var(--text-primary)' }}>Architectural Rationale:</strong> {explanationData.whyUsed}</p>
                  )}
                  {activeExplainTab === 'dependencies' && (
                    <p style={{ margin: 0 }}><strong style={{ color: 'var(--text-primary)' }}>Inter-Module Connections:</strong> {explanationData.dependencies}</p>
                  )}
                  {activeExplainTab === 'projectContext' && (
                    <p style={{ margin: 0 }}><strong style={{ color: 'var(--text-primary)' }}>Application Role:</strong> {explanationData.projectContext}</p>
                  )}
                </div>
              </div>
            )}

            {/* Default Static Overview when no dynamic AI requested yet */}
            {explainError && (
              <div role="alert" style={{ color: '#fbbf24', fontSize: '0.82rem', padding: '0.5rem 0' }}>{explainError}</div>
            )}
            {!explaining && !explanationData && (
              <div>
                <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                  {selectedFile?.explanation || selectedFile?.purpose || "This file defines core components and routines for the project runtime."}
                </p>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Click "Deep AI Explanation" above to inspect execution mechanics, dependencies, and architectural rationale.
                </span>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
