import React, { useContext, useState, useEffect } from 'react';
import { AppContext } from '../context/AppContext';
import { 
  CheckCircle2, Circle, Lock, Play, BookOpen, Clock, 
  ChevronRight, ChevronLeft, HelpCircle, Code, Check, X, Sparkles, FileCode, Layers, ArrowRight
} from 'lucide-react';
import './LearningPath.css';

export default function LearningPath() {
  const { activeProject, roadmap, isRoadmapLoading, completeRoadmapModule } = useContext(AppContext);
  const [selectedModuleId, setSelectedModuleId] = useState(null);
  const [activeSectionIdx, setActiveSectionIdx] = useState(0);
  const [quizSelection, setQuizSelection] = useState({}); // { [moduleId]: selectedOptionIndex }
  const [isCompleting, setIsCompleting] = useState(false);

  // Keep selected module reactive to latest roadmap data
  useEffect(() => {
    if (roadmap && roadmap.length > 0) {
      setSelectedModuleId(prev => {
        if (prev && roadmap.some(m => m.id === prev)) return prev;
        const inProg = roadmap.find(m => m.status === 'in-progress');
        return inProg ? inProg.id : roadmap[0].id;
      });
    } else {
      setSelectedModuleId(null);
    }
  }, [roadmap]);

  // Reset section index when changing modules
  const handleSelectModule = (mod) => {
    if (mod.status === 'locked') return;
    setSelectedModuleId(mod.id);
    setActiveSectionIdx(0);
  };

  const selectedModule = (roadmap && roadmap.find(m => m.id === selectedModuleId)) || (roadmap && roadmap[0]) || null;

  const handleQuizAnswer = (optionIdx) => {
    if (!selectedModule) return;
    setQuizSelection(prev => ({
      ...prev,
      [selectedModule.id]: optionIdx
    }));
  };

  const handleCompleteModule = async (moduleId) => {
    if (!activeProject || isCompleting) return;
    setIsCompleting(true);
    try {
      await completeRoadmapModule(moduleId);
    } catch (err) {
      console.error('Failed to update module completion:', err);
    } finally {
      setIsCompleting(false);
    }
  };

  if (!activeProject) {
    return (
      <div className="learning-path-container">
        <div className="empty-state-box glass-card glow-purple" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <Layers size={48} className="text-purple animate-pulse" />
          <h2 style={{ marginTop: '1rem' }}>No Active Project Selected</h2>
          <p style={{ maxWidth: '450px', margin: '0.5rem auto 1.5rem', color: 'var(--text-secondary)' }}>
            Upload or select a codebase from your dashboard to view its tailored, multi-section learning roadmap.
          </p>
        </div>
      </div>
    );
  }

  if (isRoadmapLoading && (!roadmap || roadmap.length === 0)) {
    return (
      <div className="learning-path-container">
        <div className="roadmap-loading-state glass-card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <Sparkles size={32} className="text-purple animate-pulse" />
          <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>Generating evidence-based curriculum...</p>
        </div>
      </div>
    );
  }

  const sections = selectedModule?.sections || [];
  const totalSections = sections.length;
  const currentSection = sections[activeSectionIdx] || sections[0] || null;
  const isModuleCompleted = selectedModule?.status === 'completed';
  const selectedQuizAnswer = selectedModule ? quizSelection[selectedModule.id] : undefined;
  const isQuizAnswered = selectedQuizAnswer !== undefined;
  const isQuizCorrect = currentSection?.quiz && isQuizAnswered && selectedQuizAnswer === currentSection.quiz.correctIndex;
  const isLastSection = activeSectionIdx === totalSections - 1;
  const canComplete = isModuleCompleted || (isLastSection && (currentSection?.quiz ? isQuizCorrect : true));

  return (
    <div className="learning-path-container">
      {/* Page Header */}
      <div className="learning-path-header">
        <div>
          <span className="page-subtitle-badge">Interactive Curriculum</span>
          <h1>{activeProject.name} — Learning Path</h1>
          <p>Master the architectural layers, patterns, and interview talking points of this codebase.</p>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="learning-path-grid">
        
        {/* Left Column: Vertical Roadmap Node Navigation */}
        <div className="roadmap-sidebar-column">
          <div className="roadmap-nodes-card glass-card">
            <div className="card-top-header" style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
              <h3 style={{ fontSize: '1rem', color: 'var(--text-primary)', margin: 0, fontWeight: '700' }}>
                Course Modules ({roadmap.length})
              </h3>
            </div>

            <div className="nodes-vertical-list">
              {roadmap.map((module, idx) => {
                const isSelected = selectedModule && selectedModule.id === module.id;
                const isCompleted = module.status === 'completed';
                const isInProgress = module.status === 'in-progress';
                const isLocked = module.status === 'locked';

                return (
                  <div
                    key={module.id}
                    className={`roadmap-node-card ${module.status} ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleSelectModule(module)}
                    style={{ cursor: isLocked ? 'not-allowed' : 'pointer' }}
                  >
                    <div className="node-status-icon-wrap">
                      {isCompleted ? (
                        <CheckCircle2 size={18} className="text-green" />
                      ) : isInProgress ? (
                        <div className="in-progress-pulse-ring"></div>
                      ) : (
                        <Lock size={14} className="text-muted" />
                      )}
                    </div>

                    <div className="node-summary-details">
                      <span className="node-idx">Step 0{idx + 1}</span>
                      <h4 className="node-title">{module.name}</h4>
                      <div className="node-chips-row">
                        <span className="node-mini-pill time"><Clock size={10} /> {module.duration}</span>
                      </div>
                    </div>
                    
                    {!isLocked && <ChevronRight size={16} className="node-chevron" />}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Multi-Section Interactive Learning Viewer */}
        <div className="node-details-column glass-card border-purple">
          {selectedModule ? (
            <div className="module-detail-panel">
              
              {/* Header Block with Metadata & Section Progress */}
              <div className="detail-header-block">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span className={`difficulty-indicator-pill ${selectedModule.difficulty.toLowerCase()}`} style={{ margin: 0 }}>
                      {selectedModule.difficulty}
                    </span>
                  </div>

                  <div className="section-progress-counter" style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: '600' }}>
                    Section {activeSectionIdx + 1} of {totalSections || 1}
                  </div>
                </div>

                <h2>{selectedModule.name}</h2>
                <p style={{ margin: '0.25rem 0 1rem 0' }}>Realistic duration: ~{selectedModule.duration} structured walkthrough.</p>

                {/* Top Progress Bar */}
                <div className="progress-bar-bg" style={{ height: '6px', borderRadius: '3px' }}>
                  <div 
                    className="progress-bar-fill purple" 
                    style={{ width: `${((activeSectionIdx + 1) / (totalSections || 1)) * 100}%` }}
                  ></div>
                </div>

                  {/* Section Stepper Navigation Pills */}
                  <div className="section-stepper-row" style={{ display: 'flex', gap: '0.4rem', marginTop: '1rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
                    {sections.map((sec, sIdx) => {
                      const isCurrent = activeSectionIdx === sIdx;
                      const isVisited = sIdx < activeSectionIdx || isModuleCompleted;
                      return (
                        <button
                          key={sIdx}
                          onClick={() => setActiveSectionIdx(sIdx)}
                          className={`section-step-pill ${isCurrent ? 'active' : ''} ${isVisited ? 'visited' : ''}`}
                        >
                          <span className="step-num">{sIdx + 1}</span>
                          <span className="step-text">{sec.title.split('. ')[1] || sec.title}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Main Active Section Content */}
                {currentSection ? (
                  <div className="section-content-container" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', textAlign: 'left' }}>
                    <div className="section-title-wrapper">
                      <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-primary)', fontWeight: '700' }}>
                        {currentSection.title}
                      </h3>
                      {currentSection.subtitle && (
                        <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--accent-purple-light)' }}>
                          {currentSection.subtitle}
                        </p>
                      )}
                    </div>

                    {/* Section Body Text */}
                    {currentSection.content && (
                      <div className="section-prose-text" style={{ fontSize: '0.92rem', lineHeight: '1.6', color: 'var(--text-secondary)' }}>
                        {currentSection.content}
                      </div>
                    )}

                    {/* Key Takeaways Card */}
                    {currentSection.keyTakeaways && currentSection.keyTakeaways.length > 0 && (
                      <div className="key-takeaways-box" style={{ background: 'rgba(109, 40, 217, 0.04)', border: '1px solid rgba(109, 40, 217, 0.15)', borderRadius: '8px', padding: '1rem' }}>
                        <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.88rem', color: 'var(--accent-purple-light)', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: '700' }}>
                          <Sparkles size={14} /> Key Architecture Takeaways:
                        </h4>
                        <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                          {currentSection.keyTakeaways.map((point, i) => (
                            <li key={i}>{point}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Step-by-Step Breakdown */}
                    {currentSection.steps && currentSection.steps.length > 0 && (
                      <div className="steps-breakdown-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                        {currentSection.steps.map((st, i) => (
                          <div key={i} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.75rem 1rem', fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', gap: '0.6rem', alignItems: 'flex-start' }}>
                            <span style={{ background: 'var(--accent-purple)', color: 'white', fontSize: '0.7rem', fontWeight: 'bold', width: '18px', height: '18px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
                              {i + 1}
                            </span>
                            <span>{st}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Files & Tech Stack Chips (Implementation Section) */}
                    {(currentSection.files || currentSection.techStack || currentSection.details) && (
                      <div className="implementation-details-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {currentSection.files && currentSection.files.length > 0 && (
                          <div>
                            <span style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Project Files Involved:</span>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.3rem' }}>
                              {currentSection.files.map((file, i) => (
                                <span key={i} className="tech-chip" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.78rem' }}>
                                  <FileCode size={12} className="text-cyan" /> {file}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {currentSection.techStack && currentSection.techStack.length > 0 && (
                          <div>
                            <span style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Relevant Tech Stack:</span>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.3rem' }}>
                              {currentSection.techStack.map((t, i) => (
                                <span key={i} className="tech-chip" style={{ background: 'rgba(8, 145, 178, 0.08)', color: 'var(--accent-cyan)', borderColor: 'rgba(8, 145, 178, 0.2)', fontSize: '0.78rem' }}>
                                  {t}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {currentSection.details && currentSection.details.length > 0 && (
                          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                            {currentSection.details.map((d, i) => (
                              <div key={i} style={{ whiteSpace: 'pre-wrap', marginTop: '0.25rem' }}>• {d}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Code Snippet Walkthrough */}
                    {currentSection.codeSnippet && (
                      <div className="code-walkthrough-box" style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)', background: '#0f172a' }}>
                        <div style={{ background: '#1e293b', padding: '0.4rem 0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: '#94a3b8', borderBottom: '1px solid #334155' }}>
                          <Code size={12} /> <span>Code Excerpt / Pattern</span>
                        </div>
                        <pre style={{ margin: 0, padding: '1rem', fontSize: '0.82rem', color: '#f8fafc', overflowX: 'auto', fontFamily: 'var(--font-mono)' }}>
                          <code>{currentSection.codeSnippet}</code>
                        </pre>
                      </div>
                    )}

                    {/* Execution Flow Diagram */}
                    {currentSection.flow && currentSection.flow.length > 0 && (
                      <div className="execution-flow-box" style={{ background: 'rgba(0,0,0,0.02)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem' }}>
                        <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: '700' }}>
                          Execution / Data Pipeline Flow:
                        </h4>
                        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                          {currentSection.flow.map((step, i) => (
                            <React.Fragment key={i}>
                              <span style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', padding: '0.35rem 0.65rem', borderRadius: '5px', fontSize: '0.78rem', color: 'var(--text-primary)', fontWeight: '600' }}>
                                {step}
                              </span>
                              {i < currentSection.flow.length - 1 && (
                                <ArrowRight size={14} className="text-muted" style={{ flexShrink: 0 }} />
                              )}
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Interview Q&A Cards */}
                    {currentSection.qaList && currentSection.qaList.length > 0 && (
                      <div className="interview-qa-container" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                        {currentSection.qaList.map((qa, i) => (
                          <div key={i} className="interview-qa-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem', textAlign: 'left' }}>
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
                              <HelpCircle size={16} className="text-purple" style={{ marginTop: '2px', flexShrink: 0 }} />
                              <h5 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: '700' }}>
                                Q: {qa.question}
                              </h5>
                            </div>
                            <p style={{ margin: 0, paddingLeft: '1.5rem', fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                              <strong>Model Answer:</strong> {qa.answer}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Knowledge Check Quiz Card */}
                    {currentSection.quiz && (
                      <div className="knowledge-check-card" style={{ background: 'var(--bg-card)', border: '1.5px solid var(--accent-purple)', borderRadius: '8px', padding: '1.25rem', textAlign: 'left' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                          <HelpCircle size={18} className="text-purple" />
                          <h4 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-primary)', fontWeight: '700' }}>
                            Knowledge Check
                          </h4>
                        </div>
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: '600', marginBottom: '1rem' }}>
                          {currentSection.quiz.question}
                        </p>

                        <div className="quiz-options-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {currentSection.quiz.options.map((opt, oIdx) => {
                            const isSelected = selectedQuizAnswer === oIdx;
                            const isCorrectOpt = oIdx === currentSection.quiz.correctIndex;
                            let btnStyle = { background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' };
                            
                            if (isQuizAnswered) {
                              if (isCorrectOpt) {
                                btnStyle = { background: 'rgba(5, 150, 105, 0.08)', border: '1px solid var(--accent-green)', color: 'var(--accent-green)' };
                              } else if (isSelected && !isCorrectOpt) {
                                btnStyle = { background: 'rgba(239, 68, 68, 0.08)', border: '1px solid #ef4444', color: '#dc2626' };
                              }
                            } else if (isSelected) {
                              btnStyle = { background: 'rgba(109, 40, 217, 0.08)', border: '1px solid var(--accent-purple)', color: 'var(--accent-purple)' };
                            }

                            return (
                              <button
                                key={oIdx}
                                onClick={() => {
                                  if (!isModuleCompleted) {
                                    setQuizSelection(prev => ({ ...prev, [selectedModule.id]: oIdx }));
                                  }
                                }}
                                className="quiz-option-btn"
                                style={{ ...btnStyle, padding: '0.75rem 1rem', borderRadius: '6px', textAlign: 'left', fontSize: '0.85rem', cursor: isModuleCompleted ? 'default' : 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                              >
                                <span>{opt}</span>
                                {isQuizAnswered && isCorrectOpt && <Check size={16} className="text-green" />}
                                {isQuizAnswered && isSelected && !isCorrectOpt && <X size={16} style={{ color: '#ef4444' }} />}
                              </button>
                            );
                          })}
                        </div>

                        {isQuizAnswered && (
                          <div style={{ marginTop: '1rem', padding: '0.75rem', borderRadius: '6px', background: isQuizCorrect ? 'rgba(5, 150, 105, 0.05)' : 'rgba(239, 68, 68, 0.05)', border: `1px solid ${isQuizCorrect ? 'rgba(5, 150, 105, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`, fontSize: '0.82rem', color: isQuizCorrect ? 'var(--accent-green)' : '#dc2626' }}>
                            <strong>{isQuizCorrect ? '✓ Correct Answer!' : '✗ Not quite.'}</strong> {currentSection.quiz.explanation}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="empty-detail-state">
                    <BookOpen size={36} className="text-muted" />
                    <p>Select a section from the stepper above to view curriculum content.</p>
                  </div>
                )}

                {/* Section Navigation & Module Completion Footer */}
                <div className="module-completions-footer-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: '1rem' }}>
                    <button
                      className="btn-secondary"
                      onClick={() => setActiveSectionIdx(prev => Math.max(0, prev - 1))}
                      disabled={activeSectionIdx === 0}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', opacity: activeSectionIdx === 0 ? 0.5 : 1 }}
                    >
                      <ChevronLeft size={16} /> Previous Section
                    </button>

                    {isLastSection ? (
                      isModuleCompleted ? (
                        <div className="completed-success-banner" style={{ margin: 0, padding: '0.6rem 1.25rem' }}>
                          <CheckCircle2 size={16} /> Module Completed
                        </div>
                      ) : (
                        <button
                          className="btn-primary start-study-btn glow-purple"
                          onClick={() => handleCompleteModule(selectedModule.id)}
                          disabled={!canComplete || isCompleting}
                          style={{ maxWidth: '280px', opacity: canComplete ? 1 : 0.6 }}
                          title={!canComplete ? 'Answer the knowledge check correctly to complete' : ''}
                        >
                          {isCompleting ? 'Completing...' : 'Complete Module'} <Play size={14} />
                        </button>
                      )
                    ) : (
                      <button
                        className="btn-primary"
                        onClick={() => setActiveSectionIdx(prev => Math.min(totalSections - 1, prev + 1))}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                      >
                        Next Section <ChevronRight size={16} />
                      </button>
                    )}
                  </div>
                </div>

              </div>
            ) : (
              <div className="empty-detail-state">
                <BookOpen size={36} className="text-muted" />
                <p>Select a learning node on the roadmap timeline to view details.</p>
              </div>
            )}
          </div>
        </div>
    </div>
  );
}
