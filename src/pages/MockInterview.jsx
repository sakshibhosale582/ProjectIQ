import React, { useContext, useState, useEffect } from 'react';
import { AppContext } from '../context/AppContext';
import { handleApiResponse, getNetworkErrorMessage } from '../utils/apiHelper';
import { 
  Mic, Brain, Play, Timer, Sparkles, Send, Award, FileText, Calendar, 
  RotateCcw, CheckCircle2, AlertTriangle, Lightbulb, HelpCircle, ChevronDown, 
  ChevronUp, ArrowRight, Code, ShieldCheck, Database, Layers
} from 'lucide-react';
import './MockInterview.css';

export default function MockInterview() {
  const { activeProject, API_BASE, setUser } = useContext(AppContext);
  
  const [interviewState, setInterviewState] = useState('config'); // config, loading, active, results, loading-questions
  const [difficulty, setDifficulty] = useState('Medium');
  const [mode, setMode] = useState('Full'); // Quick (10), Full (15), Deep (20)
  const [targetRole, setTargetRole] = useState('Software Engineer');
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [timeLeft, setTimeLeft] = useState(90);
  const [transcripts, setTranscripts] = useState([]);
  const [evaluation, setEvaluation] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [interviewError, setInterviewError] = useState('');
  
  // History state
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [expandedHistoryId, setExpandedHistoryId] = useState(null);

  // Fetch Interview History list
  const fetchHistory = async () => {
    if (!activeProject) return;
    setLoadingHistory(true);
    try {
      const token = localStorage.getItem('projectiq_token');
      const projectId = activeProject._id || activeProject.id;
      const res = await fetch(`${API_BASE}/prepare/${projectId}/interview/history`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (err) {
      console.error('[Mock Interview History Error]:', getNetworkErrorMessage(err));
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (activeProject && interviewState === 'config') {
      fetchHistory();
    }
  }, [activeProject, interviewState]);

  // Countdown timer hook - per-question
  useEffect(() => {
    if (interviewState !== 'active') return;
    
    if (timeLeft === 0) {
      handleNextQuestion('Timer expired. No answer submitted.');
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, interviewState]);

  const handleStart = async () => {
    if (!activeProject) return;
    setInterviewState('loading-questions');
    setInterviewError('');
    try {
      const token = localStorage.getItem('projectiq_token');
      const projectId = activeProject._id || activeProject.id;
      const res = await fetch(
        `${API_BASE}/prepare/${projectId}/interview/questions?difficulty=${difficulty}&mode=${mode}&targetRole=${encodeURIComponent(targetRole)}`, 
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      const data = await handleApiResponse(res, 'Failed to generate interview questions. Please try again.');
      
      setQuestions(data);
      setInterviewState('active');
      setTimeLeft(90);
      setCurrentIdx(0);
      setTranscripts([]);
      setEvaluation(null);
    } catch (err) {
      console.error('[Mock Interview Start Error]:', err);
      setInterviewError(getNetworkErrorMessage(err, 'Could not start interview panel. Please check your connection and try again.'));
      setInterviewState('config');
    }
  };

  const handleNextQuestion = async (submittedAnswer) => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    const currentItem = questions[currentIdx];
    const currentQText = typeof currentItem === 'object' ? currentItem.question : (currentItem || '');
    const currentCategory = typeof currentItem === 'object' ? currentItem.category : 'Technical Round';

    const record = {
      question: currentQText,
      category: currentCategory,
      answer: submittedAnswer !== undefined ? submittedAnswer : (userAnswer || 'No response.')
    };
    
    const updatedTranscripts = [...transcripts, record];
    setTranscripts(updatedTranscripts);
    setUserAnswer('');
    
    if (currentIdx + 1 < questions.length) {
      setCurrentIdx(currentIdx + 1);
      setTimeLeft(90);
      setIsSubmitting(false);
    } else {
      await evaluateInterview(updatedTranscripts);
      setIsSubmitting(false);
    }
  };

  const evaluateInterview = async (finalTranscripts) => {
    if (!activeProject) return;
    setInterviewState('loading');
    
    try {
      const token = localStorage.getItem('projectiq_token');
      const projectId = activeProject._id || activeProject.id;

      const res = await fetch(`${API_BASE}/prepare/${projectId}/interview/evaluate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          transcripts: finalTranscripts,
          questions: finalTranscripts.map(t => t.question),
          answers: finalTranscripts.map(t => t.answer),
          targetRole
        })
      });

      const data = await handleApiResponse(res, 'Failed to evaluate interview answers. Please try again.');
      setEvaluation(data.interview);
      setInterviewState('results');
      
      if (data.user) {
        setUser(prev => ({ ...prev, ...data.user }));
      }
    } catch (e) {
      console.error('[Mock Interview Evaluation Error]:', e);
      setInterviewState('config');
      setInterviewError(getNetworkErrorMessage(e, 'Could not submit interview answers for evaluation. Please check your connection and try again.'));
    }
  };

  const RadialScoreRing = ({ score, label }) => {
    const strokeDash = (score / 100) * 100;
    return (
      <div className="summary-score-mini">
        <svg viewBox="0 0 36 36" className="score-svg-ring">
          <path className="ring-bg-track" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
          <path className="ring-fill-pct" strokeDasharray={`${strokeDash}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
        </svg>
        <span className="inner-percent">{score}</span>
        <span className="ring-label-desc">{label}</span>
      </div>
    );
  };

  const formatDate = (isoString) => {
    const d = new Date(isoString);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  };

  const getStatusClass = (correctness = '') => {
    const lower = correctness.toLowerCase();
    if (lower.includes('strong') || lower.includes('9') || lower.includes('85')) return 'strong';
    if (lower.includes('good') || lower.includes('8') || lower.includes('75')) return 'good';
    if (lower.includes('adequate') || lower.includes('6') || lower.includes('50')) return 'adequate';
    return 'incomplete';
  };

  if (!activeProject) {
    return (
      <div className="interview-page-container" style={{ padding: '2rem' }}>
        <div className="glass-card" style={{ padding: '3rem 2rem' }}>
          <h3>No analyzed project found</h3>
          <p>Please upload a ZIP file first before entering Technical Mock panels.</p>
        </div>
      </div>
    );
  }

  const overallAverage = evaluation ? evaluation.finalScore : 0;
  const numRounds = mode === 'Quick' ? 10 : mode === 'Full' ? 15 : 20;

  const currentQItem = questions[currentIdx] || {};
  const currentQText = typeof currentQItem === 'object' ? currentQItem.question : currentQItem;
  const currentQCategory = typeof currentQItem === 'object' ? currentQItem.category : 'Technical Round';

  return (
    <div className="interview-page-container">
      <div className="interview-view-header">
        <div className="header-text">
          <h1>AI Technical Mock Panel</h1>
          <p>Practice realistic, timed technical interview rounds strongly grounded in your uploaded project ({activeProject.name}).</p>
        </div>
      </div>

      <div className="interview-workspace-box">
        
        {/* Setup Configuration */}
        {interviewState === 'config' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', width: '100%', textAlign: 'left' }}>
            <div className="glass-card interview-setup-card glow-purple" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <Mic size={48} className="text-purple animate-pulse" />
                <div>
                  <h2 style={{ margin: 0 }}>Configure Interview Panel</h2>
                  <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-secondary)' }}>
                    Questions are generated directly from your project's files, routes, architecture, and database.
                  </p>
                </div>
              </div>

              {interviewError && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ff6b6b', background: 'rgba(255, 107, 107, 0.12)', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(255, 107, 107, 0.25)', fontSize: '0.9rem' }}>
                  <AlertTriangle size={18} />
                  <span>{interviewError}</span>
                </div>
              )}

              <div className="form-group" style={{ marginTop: '0.5rem' }}>
                <label className="form-label">Target Technical Role</label>
                <select 
                  className="form-input" 
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  style={{ width: '100%', background: 'var(--bg-input)' }}
                >
                  <option value="Software Engineer">Software Engineer</option>
                  <option value="Frontend Developer">Frontend Developer</option>
                  <option value="Backend Developer">Backend Developer</option>
                  <option value="Full Stack Developer">Full Stack Developer</option>
                  <option value="Data Engineer">Data Engineer</option>
                  <option value="DevOps Engineer">DevOps Engineer</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Interview Mode</label>
                <select 
                  className="form-input" 
                  value={mode}
                  onChange={(e) => setMode(e.target.value)}
                  style={{ width: '100%', background: 'var(--bg-input)' }}
                >
                  <option value="Quick">Quick Interview (10 Questions)</option>
                  <option value="Full">Full Interview (15 Questions) — Standard</option>
                  <option value="Deep">Deep Interview (20 Questions)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Question Complexity</label>
                <div className="difficulty-selection-row">
                  {['Easy', 'Medium', 'Hard'].map((diff) => (
                    <button 
                      key={diff} 
                      className={`diff-select-btn ${difficulty === diff ? 'active' : ''} ${diff.toLowerCase()}`}
                      onClick={() => setDifficulty(diff)}
                    >
                      {diff}
                    </button>
                  ))}
                </div>
              </div>

              {/* Project Grounding Pills */}
              <div style={{ background: 'rgba(109, 40, 217, 0.04)', border: '1px solid rgba(109, 40, 217, 0.15)', borderRadius: '8px', padding: '0.85rem 1rem', width: '100%' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--accent-purple)', display: 'block', marginBottom: '0.35rem' }}>
                  Covered Project Domains:
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                  <span className="category-pill">Project Overview</span>
                  <span className="category-pill">Tech Stack ({activeProject.techStack?.slice(0, 2).join(', ')})</span>
                  <span className="category-pill">Code & Files</span>
                  <span className="category-pill">Architecture</span>
                  <span className="category-pill">Database ({activeProject.databaseInfo?.dbType || 'Persistence'})</span>
                  <span className="category-pill">API Endpoints</span>
                  <span className="category-pill">Security & Auth</span>
                  <span className="category-pill">Scalability</span>
                  <span className="category-pill">Code Issues</span>
                </div>
              </div>

              <div className="quiz-setup-stats" style={{ marginTop: '0.5rem' }}>
                <div className="setup-stat">
                  <span>Questions</span>
                  <strong>{numRounds} Rounds</strong>
                </div>
                <div className="setup-stat">
                  <span>Pass Criteria</span>
                  <strong>50% Average</strong>
                </div>
              </div>

              <button className="btn-primary start-quiz-btn" onClick={handleStart} style={{ marginTop: '0.5rem' }}>
                <Play size={16} /> Enter Panel
              </button>
            </div>

            {/* Performance History Section */}
            <div className="glass-card interview-history-card">
              <div className="card-top-header" style={{ marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                  Past Interview Scorecards
                </h3>
              </div>

              {loadingHistory ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                  Loading scorecards...
                </div>
              ) : history.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  No previous scorecards logged. Complete your first session above!
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {history.map((item) => {
                    const isExpanded = expandedHistoryId === item._id;
                    return (
                      <div 
                        key={item._id} 
                        className="completed-success-banner" 
                        style={{ 
                          flexDirection: 'column', 
                          alignItems: 'flex-start', 
                          padding: '1.25rem', 
                          border: '1px solid var(--border-color)',
                          background: 'var(--bg-card)',
                          gap: '0.75rem',
                          borderRadius: '8px'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <Calendar size={14} className="text-purple" />
                            <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                              {formatDate(item.createdAt)}
                            </span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              ({item.questions?.length || 0} Questions)
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span className="xp-badge" style={{ background: item.finalScore >= 50 ? 'rgba(5, 150, 105, 0.08)' : 'rgba(239, 68, 68, 0.08)', color: item.finalScore >= 50 ? 'var(--accent-green)' : 'var(--text-muted)' }}>
                              Score: {item.finalScore}%
                            </span>
                            {item.questionEvaluations && item.questionEvaluations.length > 0 && (
                              <button 
                                onClick={() => setExpandedHistoryId(isExpanded ? null : item._id)}
                                className="btn btn-secondary"
                                style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                              >
                                {isExpanded ? 'Hide Details' : 'View Answers'}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Weak Areas */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', width: '100%', textAlign: 'left' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                            Weak Areas:
                          </span>
                          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                            {(item.weakAreas || []).slice(0, 3).map((w, idx) => (
                              <span key={idx} className="tech-chip">{w}</span>
                            ))}
                            {(!item.weakAreas || item.weakAreas.length === 0) && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>None flagged.</span>}
                          </div>
                        </div>

                        {/* Expanded Past Question Evaluations */}
                        {isExpanded && item.questionEvaluations && (
                          <div style={{ width: '100%', marginTop: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-primary)' }}>Question Breakdown:</span>
                            {item.questionEvaluations.map((qe, qIdx) => (
                              <div key={qIdx} style={{ background: 'var(--bg-deep)', border: '1px solid var(--border-color)', padding: '0.75rem', borderRadius: '6px', fontSize: '0.8rem' }}>
                                <div style={{ fontWeight: '600', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                                  Q{qIdx + 1}: {qe.question}
                                </div>
                                <div style={{ color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                                  <strong>Your Answer:</strong> {qe.answer}
                                </div>
                                <div style={{ color: 'var(--accent-purple)' }}>
                                  <strong>Status:</strong> {qe.correctness}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Loading Questions State */}
        {interviewState === 'loading-questions' && (
          <div className="glass-card interview-setup-card" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
            <div className="typing-dots-animation" style={{ display: 'flex', gap: '0.35rem', justifyContent: 'center', marginBottom: '1rem' }}>
              <span className="dot animate-pulse"></span>
              <span className="dot animate-pulse" style={{ animationDelay: '0.2s' }}></span>
              <span className="dot animate-pulse" style={{ animationDelay: '0.4s' }}></span>
            </div>
            <h3>Generating project-specific interview questions...</h3>
            <p>AI Architect is scanning repository files, endpoints, database schemas, and architectural boundaries for {activeProject.name}.</p>
          </div>
        )}

        {/* Loading Evaluation State */}
        {interviewState === 'loading' && (
          <div className="glass-card interview-setup-card" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
            <div className="typing-dots-animation" style={{ display: 'flex', gap: '0.35rem', justifyContent: 'center', marginBottom: '1rem' }}>
              <span className="dot animate-pulse"></span>
              <span className="dot animate-pulse" style={{ animationDelay: '0.2s' }}></span>
              <span className="dot animate-pulse" style={{ animationDelay: '0.4s' }}></span>
            </div>
            <h3>Evaluating interview responses...</h3>
            <p>Grading each answer for correctness, missing details, positive highlights, and generating optimal model answers.</p>
          </div>
        )}

        {/* Active Interview Round */}
        {interviewState === 'active' && questions[currentIdx] && (
          <div className="glass-card active-interview-card glow-purple" style={{ textAlign: 'left' }}>
            <div className="interview-top-meta-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span className="question-counter">Round {currentIdx + 1} of {questions.length}</span>
                <span className="category-pill">{currentQCategory}</span>
              </div>
              <div className="countdown-timer-box" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Timer size={14} className={timeLeft < 20 ? 'text-red animate-pulse' : 'text-cyan'} />
                <span className={timeLeft < 20 ? 'text-red font-bold' : 'text-cyan'}>{timeLeft}s Left</span>
              </div>
            </div>

            <div className="readiness-progress-bar-bg" style={{ height: '6px', margin: '0.5rem 0 1.5rem 0' }}>
              <div className="readiness-progress-fill purple" style={{ width: `${((currentIdx + 1) / questions.length) * 100}%`, height: '100%' }}></div>
            </div>

            <div className="interviewer-narrative-bubble">
              <div className="interviewer-avatar">
                <Brain size={18} />
              </div>
              <div className="interviewer-dialogue">
                <h5>AI Lead Technical Architect ({targetRole})</h5>
                <p>"{currentQText}"</p>
              </div>
            </div>

            <div className="interview-user-response-textarea" style={{ marginTop: '1.5rem' }}>
              <label className="form-label">Type Your Technical Response:</label>
              <textarea 
                className="form-input response-textarea" 
                rows="6"
                placeholder={`Explain how your project (${activeProject.name}) handles this. Reference relevant files, methods, error handling, or architectural decisions...`}
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                disabled={isSubmitting}
              ></textarea>
            </div>

            <div className="interview-action-footer" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button 
                className="btn-primary submit-ans-btn" 
                onClick={() => handleNextQuestion(userAnswer)}
                disabled={!userAnswer.trim() || isSubmitting}
              >
                {currentIdx + 1 === questions.length ? 'Submit Final Interview' : 'Submit Technical Answer'} <Send size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Results & Question-by-Question Evaluation */}
        {interviewState === 'results' && evaluation && (
          <div className="glass-card interview-results-card glow-green" style={{ textAlign: 'left' }}>
            <div className="results-badge-row" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <Award size={36} className="text-green animate-pulse" />
              <h3 style={{ margin: 0 }}>Evaluation Verdict: {overallAverage >= 50 ? 'PASS' : 'FAIL'}</h3>
            </div>

            <p className="results-intro-desc">
              Your overall average of **{overallAverage}%** represents your candidate readiness for the role **{targetRole}** on project **{activeProject.name}**. Review the question-by-question breakdown below to inspect missing points and recommended model answers.
            </p>

            <div className="diagnostics-metrics-grid">
              <RadialScoreRing score={evaluation.evaluation?.communication ?? evaluation.score?.communication ?? 0} label="Communication" />
              <RadialScoreRing score={evaluation.evaluation?.technicalDepth ?? evaluation.score?.technicalDepth ?? 0} label="Technical Depth" />
              <RadialScoreRing score={evaluation.evaluation?.projectKnowledge ?? evaluation.score?.projectKnowledge ?? 0} label="Project Knowledge" />
            </div>

            {/* Explainable Score Analysis */}
            {evaluation.explanationSummary && (
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.6rem', margin: '1.5rem 0' }}>
                <h4 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '0.95rem', fontWeight: 'bold' }}>Explainable Score Analysis:</h4>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}><strong>Strength:</strong> {evaluation.explanationSummary.strength}</p>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}><strong>Weakness:</strong> {evaluation.explanationSummary.weakness}</p>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}><strong>Evidence:</strong> {evaluation.explanationSummary.evidence}</p>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}><strong>Recommendation:</strong> {evaluation.explanationSummary.recommendation}</p>
              </div>
            )}

            {/* High-Level Feedback & Weak Areas */}
            <div className="feedback-details-box">
              <div className="feedback-bullet-group">
                <h5><Sparkles size={14} className="text-purple animate-pulse" /> Diagnostic Feedback</h5>
                <ul>
                  {(evaluation.recommendations || evaluation.feedback || []).map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
              </div>

              <div className="weak-areas-group">
                <h5><FileText size={14} className="text-cyan" /> Weak areas identified</h5>
                <div className="weak-topics-pills">
                  {(evaluation.weakAreas || []).map((w, i) => (
                    <span key={i} className="tech-chip" style={{ background: 'rgba(239, 68, 68, 0.05)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>{w}</span>
                  ))}
                  {(evaluation.weakAreas || []).length === 0 && <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>None flagged. Excellent technical coverage!</span>}
                </div>
              </div>
            </div>

            {/* Detailed Question-by-Question Evaluation Breakdown */}
            {evaluation.questionEvaluations && evaluation.questionEvaluations.length > 0 && (
              <div className="evaluations-section" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem', marginTop: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <HelpCircle size={20} className="text-purple" />
                  <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-primary)', fontWeight: '800' }}>
                    Detailed Per-Answer Evaluation ({evaluation.questionEvaluations.length} Questions)
                  </h3>
                </div>
                <p style={{ margin: '0 0 1rem 0', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                  Detailed breakdown of what you explained well, missing technical nuances, and senior-level model answers.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {evaluation.questionEvaluations.map((evalItem, qIndex) => {
                    const statusClass = getStatusClass(evalItem.correctness);
                    return (
                      <div key={qIndex} className="eval-card">
                        <div className="eval-card-header">
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', maxWidth: '80%' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span style={{ fontSize: '0.72rem', background: 'var(--bg-deep)', border: '1px solid var(--border-color)', color: 'var(--text-muted)', padding: '0.15rem 0.45rem', borderRadius: '4px', fontWeight: '700' }}>
                                Round 0{qIndex + 1}
                              </span>
                              <span className="category-pill">{evalItem.category || 'Technical'}</span>
                            </div>
                            <h4 className="eval-q-title">"{evalItem.question}"</h4>
                          </div>

                          <span className={`eval-status-badge ${statusClass}`}>
                            {evalItem.correctness || 'Evaluated'}
                          </span>
                        </div>

                        {/* Candidate's Answer */}
                        <div>
                          <strong style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.35rem' }}>
                            Your Submitted Answer:
                          </strong>
                          <div className="eval-user-answer-box">
                            {evalItem.answer || 'No response.'}
                          </div>
                        </div>

                        {/* 3-Part Feedback Grid */}
                        <div className="eval-points-grid">
                          {/* Explained Well */}
                          <div className="eval-point-box well">
                            <strong><CheckCircle2 size={13} /> Explained Well</strong>
                            <p>{evalItem.explainedWell || 'Addressed the core subject of the question.'}</p>
                          </div>

                          {/* Missing Points */}
                          <div className="eval-point-box missing">
                            <strong><AlertTriangle size={13} /> Missing Points</strong>
                            <p>{evalItem.missingPoints || 'Could expand further on runtime trade-offs and edge cases.'}</p>
                          </div>

                          {/* What Could Be Improved */}
                          <div className="eval-point-box improve">
                            <strong><Lightbulb size={13} /> What Could Be Improved</strong>
                            <p>{evalItem.couldImprove || 'Structure the response with clear problem, solution, and architectural impact steps.'}</p>
                          </div>
                        </div>

                        {/* Recommended Model Answer */}
                        {evalItem.sampleAnswer && (
                          <div className="eval-sample-answer-box">
                            <strong><Sparkles size={14} /> Recommended Model Answer:</strong>
                            <p>{evalItem.sampleAnswer}</p>
                          </div>
                        )}

                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="results-action-row" style={{ display: 'flex', justifyContent: 'center', marginTop: '1.5rem' }}>
              <button className="btn-primary" onClick={() => setInterviewState('config')}>
                <RotateCcw size={16} /> Practice Another Interview
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
