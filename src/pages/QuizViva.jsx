import React, { useContext, useState, useEffect } from 'react';
import { AppContext } from '../context/AppContext';
import { handleApiResponse, getNetworkErrorMessage } from '../utils/apiHelper';
import { useLocation } from 'react-router-dom';
import { 
  ClipboardCheck, Sparkles, CheckCircle2, XCircle, Award, 
  ArrowRight, ArrowLeft, Play, RotateCcw, MessageSquare, Terminal, Send, Calendar
} from 'lucide-react';
import './QuizViva.css';

export default function QuizViva() {
  const { activeProject, API_BASE, setUser } = useContext(AppContext);
  const location = useLocation();
  
  // Tab control: 'quiz' or 'viva'
  const [activeTab, setActiveTab] = useState('quiz'); 

  // General Quiz States
  const [quizState, setQuizState] = useState('config'); // config, loading, active, results
  const [difficulty, setDifficulty] = useState('Medium');
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [userAnswers, setUserAnswers] = useState([]); // holds selected indices for each question
  const [score, setScore] = useState(0);
  const [quizError, setQuizError] = useState('');
  const [explainSummary, setExplainSummary] = useState(null);
  // Server-side grading: the client never receives the answer key before submitting
  const [sessionId, setSessionId] = useState(null);
  const [gradeResults, setGradeResults] = useState([]);
  const [grading, setGrading] = useState(false);

  // Practice Mode (Section 9)
  const [isPracticeMode, setIsPracticeMode] = useState(false);
  const [practiceCategory, setPracticeCategory] = useState('');

  // Quiz History
  const [quizHistory, setQuizHistory] = useState([]);
  const [loadingQuizHistory, setLoadingQuizHistory] = useState(false);

  // Viva States
  const [vivaState, setVivaState] = useState('config'); // config, loading, active, results
  const [vivaQuestions, setVivaQuestions] = useState([]);
  const [vivaIdx, setVivaIdx] = useState(0);
  const [vivaAnswers, setVivaAnswers] = useState([]);
  const [currentVivaAnswer, setCurrentVivaAnswer] = useState('');
  const [vivaEvaluation, setVivaEvaluation] = useState(null);
  const [vivaError, setVivaError] = useState('');

  // Viva History
  const [vivaHistory, setVivaHistory] = useState([]);
  const [loadingVivaHistory, setLoadingVivaHistory] = useState(false);

  // Check state redirect for practice mode
  useEffect(() => {
    if (location.state && location.state.startPracticeMode) {
      setIsPracticeMode(true);
      setPracticeCategory(location.state.practiceCategory);
      setActiveTab('quiz');
      setQuizState('loading');
    }
  }, [location.state]);

  useEffect(() => {
    if (isPracticeMode && quizState === 'loading') {
      fetchPracticeQuestions();
    }
  }, [isPracticeMode, quizState]);

  // ==========================================
  // HISTORY FETCHERS
  // ==========================================
  const fetchQuizHistory = async () => {
    if (!activeProject) return;
    setLoadingQuizHistory(true);
    try {
      const token = localStorage.getItem('projectiq_token');
      const projectId = activeProject._id || activeProject.id;
      const res = await fetch(`${API_BASE}/prepare/${projectId}/quiz/history`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setQuizHistory(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingQuizHistory(false);
    }
  };

  const fetchVivaHistory = async () => {
    if (!activeProject) return;
    setLoadingVivaHistory(true);
    try {
      const token = localStorage.getItem('projectiq_token');
      const projectId = activeProject._id || activeProject.id;
      const res = await fetch(`${API_BASE}/prepare/${projectId}/viva/history`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setVivaHistory(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingVivaHistory(false);
    }
  };

  useEffect(() => {
    if (activeProject && quizState === 'config' && activeTab === 'quiz') {
      fetchQuizHistory();
    }
  }, [activeProject, quizState, activeTab]);

  useEffect(() => {
    if (activeProject && vivaState === 'config' && activeTab === 'viva') {
      fetchVivaHistory();
    }
  }, [activeProject, vivaState, activeTab]);

  // ==========================================
  // PRACTICE QUESTIONS FETCH
  // ==========================================
  const fetchPracticeQuestions = async () => {
    if (!activeProject) return;
    setQuizError('');
    try {
      const token = localStorage.getItem('projectiq_token');
      const projectId = activeProject._id || activeProject.id;
      
      const res = await fetch(`${API_BASE}/prepare/${projectId}/practice?category=${encodeURIComponent(practiceCategory)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await handleApiResponse(res, 'Failed to generate practice questions. Please try again.');
      setQuestions(data.questions);
      setSessionId(data.sessionId);
      setGradeResults([]);
      setCurrentIdx(0);
      setScore(0);
      setUserAnswers(new Array(data.questions.length).fill(null));
      setQuizState('active');
    } catch (err) {
      console.error('[Practice Questions Error]:', err);
      setQuizError(getNetworkErrorMessage(err, 'Could not fetch practice questions. Please check your connection and try again.'));
      setQuizState('config');
      setIsPracticeMode(false);
    }
  };

  // ==========================================
  // QUIZ ENGINE FUNCTIONS
  // ==========================================
  const fetchQuestions = async () => {
    if (!activeProject) return;
    setQuizState('loading');
    setQuizError('');
    setIsPracticeMode(false);
    try {
      const token = localStorage.getItem('projectiq_token');
      const projectId = activeProject._id || activeProject.id;
      
      const res = await fetch(`${API_BASE}/prepare/${projectId}/quiz?difficulty=${difficulty}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await handleApiResponse(res, 'Failed to generate quiz questions. Please try again.');
      setQuestions(data.questions);
      setSessionId(data.sessionId);
      setGradeResults([]);
      setCurrentIdx(0);
      setScore(0);
      setUserAnswers(new Array(data.questions.length).fill(null));
      setQuizState('active');
    } catch (err) {
      console.error('[Quiz Questions Error]:', err);
      setQuizError(getNetworkErrorMessage(err, 'Could not fetch quiz questions. Please check your connection and try again.'));
      setQuizState('config');
    }
  };

  const handleStartQuiz = () => {
    fetchQuestions();
  };

  const handleSelectOption = (optIdx) => {
    const updated = [...userAnswers];
    updated[currentIdx] = optIdx;
    setUserAnswers(updated);
  };

  // Grading happens on the server; we only send the selected option indexes.
  const handleQuizSubmission = async () => {
    if (grading) return;
    setGrading(true);
    setQuizError('');
    try {
      const token = localStorage.getItem('projectiq_token');
      const projectId = activeProject._id || activeProject.id;

      const res = await fetch(`${API_BASE}/prepare/${projectId}/quiz/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ sessionId, answers: userAnswers })
      });
      const data = await handleApiResponse(res, 'Failed to grade the quiz. Please try again.');

      setGradeResults(data.result.results);
      setScore(data.result.score);
      setExplainSummary((data.attempt && data.attempt.explanationSummary) || data.explanationSummary || null);
      if (data.user) {
        setUser(prev => ({ ...prev, ...data.user }));
      }
      setQuizState('results');
      fetchQuizHistory();
    } catch (err) {
      console.error('[Quiz Submit Error]:', err);
      setQuizError(getNetworkErrorMessage(err, 'Could not submit the quiz. Please check your connection and try again.'));
    } finally {
      setGrading(false);
    }
  };

  const restartQuiz = () => {
    setQuizState('config');
    setQuestions([]);
    setSessionId(null);
    setGradeResults([]);
    setUserAnswers([]);
    setIsPracticeMode(false);
    setExplainSummary(null);
  };

  // ==========================================
  // VIVA ENGINE FUNCTIONS
  // ==========================================
  const fetchVivaQuestions = async () => {
    if (!activeProject) return;
    setVivaState('loading');
    setVivaError('');
    try {
      const token = localStorage.getItem('projectiq_token');
      const projectId = activeProject._id || activeProject.id;
      
      const res = await fetch(`${API_BASE}/prepare/${projectId}/viva?difficulty=${difficulty}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await handleApiResponse(res, 'Failed to generate viva questions. Please try again.');
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error('No viva questions could be generated for this project. Please verify the project files and try again.');
      }
      setVivaQuestions(data);
      setVivaIdx(0);
      setVivaAnswers(new Array(data.length).fill(''));
      setCurrentVivaAnswer('');
      setVivaEvaluation(null);
      setVivaState('active');
    } catch (err) {
      console.error('[Viva Questions Error]:', err);
      setVivaError(getNetworkErrorMessage(err, 'Could not fetch viva questions. Please check your connection and try again.'));
      setVivaState('config');
    }
  };

  const handleNextViva = async () => {
    const list = [...vivaAnswers];
    list[vivaIdx] = currentVivaAnswer || 'No response submitted.';
    setVivaAnswers(list);

    if (vivaIdx + 1 < vivaQuestions.length) {
      setVivaIdx(vivaIdx + 1);
      setCurrentVivaAnswer(list[vivaIdx + 1] || '');
    } else {
      setVivaState('loading-evaluation');
      try {
        const token = localStorage.getItem('projectiq_token');
        const projectId = activeProject._id || activeProject.id;

        const res = await fetch(`${API_BASE}/prepare/${projectId}/viva/submit`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            questions: vivaQuestions,
            answers: list
          })
        });

        const data = await handleApiResponse(res, 'Failed to grade viva answers. Please try again.');

        setVivaEvaluation(data.attempt);
        setVivaState('results');

        if (data.user) {
          setUser(prev => ({ ...prev, ...data.user }));
        }
        fetchVivaHistory();
      } catch (err) {
        console.error('[Viva Submission Error]:', err);
        setVivaError(getNetworkErrorMessage(err, 'Evaluation submission failed. Please try again.'));
        setVivaState('active');
      }
    }
  };

  const handlePrevViva = () => {
    if (vivaIdx > 0) {
      const list = [...vivaAnswers];
      list[vivaIdx] = currentVivaAnswer;
      setVivaAnswers(list);
      setVivaIdx(vivaIdx - 1);
      setCurrentVivaAnswer(list[vivaIdx - 1] || '');
    }
  };

  const restartViva = () => {
    setVivaState('config');
    setVivaQuestions([]);
    setVivaAnswers([]);
    setVivaEvaluation(null);
  };

  // Date standardizer helper
  const formatDate = (isoString) => {
    const d = new Date(isoString);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  };

  if (!activeProject) {
    return (
      <div className="quiz-page-container" style={{ padding: '2rem' }}>
        <div className="glass-card" style={{ padding: '3rem 2rem', textAlign: 'center' }}>
          <h3>No analyzed project found</h3>
          <p>Please upload a ZIP file first before initiating Technical Assessments.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="quiz-page-container">
      {/* Header with Sub-Tabs Selection */}
      <div className="quiz-view-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div className="header-text">
          <h1>Viva & Quiz Terminal</h1>
          <p>Evaluate your technical depth with project-specific quizzes and oral vivas generated by AI.</p>
        </div>

        {/* Tab Switcher */}
        {!isPracticeMode && (
          <div className="tab-navigation-buttons" style={{ background: 'var(--bg-deep)', border: '1px solid var(--border-color)', padding: '0.25rem', borderRadius: '10px', display: 'flex' }}>
            <button 
              className={`tab-btn ${activeTab === 'quiz' ? 'active' : ''}`}
              onClick={() => setActiveTab('quiz')}
            >
              <ClipboardCheck size={16} /> MCQ Quiz
            </button>
            <button 
              className={`tab-btn ${activeTab === 'viva' ? 'active' : ''}`}
              onClick={() => setActiveTab('viva')}
            >
              <MessageSquare size={16} /> Oral Viva
            </button>
          </div>
        )}
      </div>

      <div className="quiz-workspace-box">
        {/* ======================================================== */}
        {/* MCQ QUIZ TAB WORKSPACE */}
        {/* ======================================================== */}
        {activeTab === 'quiz' && (
          <>
            {quizState === 'config' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', width: '100%' }}>
                {quizError && (
                  <div role="alert" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', padding: '0.75rem 1rem', borderRadius: '8px', fontSize: '0.85rem' }}>
                    {quizError}
                  </div>
                )}
                <div className="glass-card quiz-setup-card glow-purple">
                  <ClipboardCheck size={48} className="text-purple animate-pulse" />
                  <h2>Scanned Project MCQ Quiz</h2>
                  <p>Test your knowledge on your uploaded repository's detected classes, functions, routes, and dependencies.</p>

                  <div className="form-group" style={{ width: '100%', maxWidth: '400px' }}>
                    <label className="form-label">Select Difficulty</label>
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

                  <div className="quiz-setup-stats">
                    <div className="setup-stat">
                      <span>Questions</span>
                      <strong>10 Questions</strong>
                    </div>
                    <div className="setup-stat">
                      <span>Pass Criteria</span>
                      <strong>80% Score</strong>
                    </div>
                  </div>

                  <button className="btn-primary start-quiz-btn" onClick={handleStartQuiz}>
                    <Play size={16} /> Start Quiz Assessment
                  </button>
                </div>

                {/* Performance History Section */}
                <div className="glass-card quiz-history-card">
                  <div className="card-top-header" style={{ marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                      Past Quiz Logs
                    </h3>
                  </div>

                  {quizHistory.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      No past quizzes logged. Complete your first MCQ Quiz above!
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {quizHistory.map((item) => (
                        <div key={item._id} className="completed-success-banner" style={{ justifyContent: 'space-between', padding: '1rem', border: '1px solid var(--border-color)', background: 'var(--bg-card)' }}>
                          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                            <ClipboardCheck size={16} className="text-purple" />
                            <span style={{ fontSize: '0.88rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                              Difficulty: {item.difficulty || 'Medium'} — {formatDate(item.createdAt)}
                            </span>
                          </div>
                          <span className="xp-badge" style={{ background: 'rgba(109, 40, 217, 0.05)', color: 'var(--accent-purple)' }}>
                            Score: {item.score} / {item.questions?.length ?? 0}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {quizState === 'loading' && (
              <div className="glass-card quiz-setup-card" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
                <div className="typing-dots-animation" style={{ display: 'flex', gap: '0.35rem', justifyContent: 'center', marginBottom: '1rem' }}>
                  <span className="dot animate-pulse"></span>
                  <span className="dot animate-pulse" style={{ animationDelay: '0.2s' }}></span>
                  <span className="dot animate-pulse" style={{ animationDelay: '0.4s' }}></span>
                </div>
                <h3>{isPracticeMode ? `Formulating targeted practice questions: ${practiceCategory}...` : 'Generating dynamic quiz questions...'}</h3>
                <p>AI is reviewing your codebase schema models and dependencies.</p>
              </div>
            )}

            {quizState === 'active' && questions[currentIdx] && (
              <div className="glass-card quiz-board-card" style={{ textAlign: 'left' }}>
                {isPracticeMode && (
                  <div style={{ background: 'rgba(109,40,217,0.05)', padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid rgba(109,40,217,0.15)', color: 'var(--accent-purple-light)', marginBottom: '1rem', fontSize: '0.85rem', fontWeight: 'bold' }}>
                    Practice Mode Target Area: {practiceCategory}
                  </div>
                )}
                
                <div className="quiz-progress-top" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Question {currentIdx + 1} of {questions.length}</span>
                  <span className={`diff-pill ${difficulty.toLowerCase()}`}>{isPracticeMode ? 'Practice' : difficulty}</span>
                </div>

                <div className="readiness-progress-bar-bg" style={{ height: '6px', margin: '0.5rem 0 1.5rem 0' }}>
                  <div className="readiness-progress-fill purple" style={{ width: `${((currentIdx + 1) / questions.length) * 100}%`, height: '100%' }}></div>
                </div>

                <h3 className="quiz-question-text" style={{ fontSize: '1.25rem', marginBottom: '1.5rem', color: 'var(--text-primary)' }}>
                  {questions[currentIdx].question}
                </h3>

                {questions[currentIdx].code && (
                  <div style={{ marginBottom: '1.25rem', border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden' }}>
                    <div style={{ padding: '0.4rem 0.75rem', fontSize: '0.72rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border-color)', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                      {questions[currentIdx].file} — lines {questions[currentIdx].startLine}-{questions[currentIdx].endLine}
                    </div>
                    <pre style={{ margin: 0, padding: '0.75rem', fontSize: '0.78rem', overflowX: 'auto', maxHeight: '260px', overflowY: 'auto', color: 'var(--text-primary)', fontFamily: 'monospace', lineHeight: 1.5 }}>
                      <code>{questions[currentIdx].code}</code>
                    </pre>
                  </div>
                )}

                <div className="quiz-options-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {questions[currentIdx].options.map((opt, idx) => {
                    const isSelected = userAnswers[currentIdx] === idx;
                    return (
                      <button 
                        key={idx} 
                        className={`quiz-option-item ${isSelected ? 'selected' : ''}`}
                        onClick={() => handleSelectOption(idx)}
                        style={{ display: 'flex', alignItems: 'center', gap: '1rem', width: '100%', padding: '1rem', border: isSelected ? '2px solid var(--accent-purple)' : '1px solid var(--border-color)', borderRadius: '8px', background: isSelected ? 'rgba(109, 40, 217, 0.02)' : 'transparent', color: 'var(--text-secondary)' }}
                      >
                        <span className="opt-letter" style={{ background: isSelected ? 'var(--accent-purple)' : 'rgba(255,255,255,0.05)', color: isSelected ? 'white' : 'var(--text-secondary)', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '0.8rem', fontWeight: 'bold' }}>
                          {String.fromCharCode(65 + idx)}
                        </span>
                        <span className="opt-text">{opt}</span>
                      </button>
                    );
                  })}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem' }}>
                  <button 
                    className="btn btn-secondary" 
                    onClick={() => setCurrentIdx(currentIdx - 1)}
                    disabled={currentIdx === 0}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                  >
                    <ArrowLeft size={16} /> Previous
                  </button>

                  {currentIdx + 1 < questions.length ? (
                    <button 
                      className="btn btn-purple" 
                      onClick={() => setCurrentIdx(currentIdx + 1)}
                      disabled={userAnswers[currentIdx] === null}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                      Next <ArrowRight size={16} />
                    </button>
                  ) : (
                    <button 
                      className="btn btn-purple" 
                      onClick={handleQuizSubmission}
                      disabled={userAnswers[currentIdx] === null || grading}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--accent-green)', borderColor: 'var(--accent-green)' }}
                    >
                      {grading ? 'Grading...' : 'Submit Assessment'} <ArrowRight size={16} />
                    </button>
                  )}
                </div>
                {quizError && (
                  <p style={{ color: '#f87171', fontSize: '0.82rem', marginTop: '1rem', textAlign: 'right' }}>{quizError}</p>
                )}
              </div>
            )}

            {quizState === 'results' && (
              <div className="glass-card quiz-results-card glow-green" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', textAlign: 'left', alignItems: 'stretch' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', width: '100%' }}>
                  <Award size={48} className="text-green animate-pulse" />
                  <h2>Assessment Scorecard</h2>
                  <div className="score-ratio-circle" style={{ width: '120px', height: '120px', borderRadius: '50%', border: '4px solid var(--accent-green)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', margin: '1rem 0' }}>
                    <span style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>{score} / {questions.length}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Score</span>
                  </div>
                  
                  <p className="results-summary-text" style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    Correct answers: <span style={{ color: 'var(--accent-green-light)', fontWeight: 'bold' }}>{score}</span> | Wrong answers: <span style={{ color: '#ef4444', fontWeight: 'bold' }}>{questions.length - score}</span>
                  </p>
                </div>

                {explainSummary && (
                  <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <h4 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '0.9rem', fontWeight: 'bold' }}>Explainable Score Analysis:</h4>
                    <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)' }}><strong>Strength:</strong> {explainSummary.strength}</p>
                    <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)' }}><strong>Weakness:</strong> {explainSummary.weakness}</p>
                    <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)' }}><strong>Evidence:</strong> {explainSummary.evidence}</p>
                    <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)' }}><strong>Recommendation:</strong> {explainSummary.recommendation}</p>
                  </div>
                )}

                {/* Question breakdown list (Section 5) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                  <h3 style={{ color: 'var(--text-primary)', fontSize: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Review Questions Breakdown</h3>
                  {questions.map((q, idx) => {
                    const graded = gradeResults[idx] || {};
                    const isCorrect = graded.isCorrect === true;
                    return (
                      <div key={idx} style={{ border: `1px solid ${isCorrect ? 'var(--accent-green)' : '#ef4444'}`, background: isCorrect ? 'rgba(16,185,129,0.02)' : 'rgba(239,68,68,0.02)', padding: '1rem', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <strong style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>Q{idx + 1}: {q.question}</strong>
                          <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', borderRadius: '4px', background: isCorrect ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: isCorrect ? 'var(--accent-green-light)' : '#f87171', fontWeight: 'bold' }}>
                            {isCorrect ? 'Correct' : 'Incorrect'}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span>Your answer: <strong style={{ color: isCorrect ? 'var(--accent-green-light)' : '#f87171' }}>{userAnswers[idx] !== null ? q.options[userAnswers[idx]] : 'Unanswered'}</strong></span>
                          {!isCorrect && graded.correct !== undefined && <span>Correct answer: <strong style={{ color: 'var(--accent-green-light)' }}>{q.options[graded.correct]}</strong></span>}
                          {q.file && <span style={{ fontFamily: 'monospace', color: 'var(--text-muted)' }}>{q.file} (lines {q.startLine}-{q.endLine})</span>}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', borderTop: '1px dotted var(--border-color)', paddingTop: '0.5rem', marginTop: '0.25rem' }}>
                          <strong>Explanation:</strong> {graded.explanation}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="results-action-row" style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1.5rem' }}>
                  <button className="btn-primary" onClick={restartQuiz} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <RotateCcw size={16} /> {isPracticeMode ? 'Close Practice' : 'Restart Quiz'}
                  </button>
                  {!isPracticeMode && (
                    <button className="btn-secondary" onClick={() => setActiveTab('viva')}>
                      Try Oral Viva
                    </button>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* ======================================================== */}
        {/* ORAL VIVA TAB WORKSPACE */}
        {/* ======================================================== */}
        {activeTab === 'viva' && (
          <>
            {vivaState === 'config' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', width: '100%' }}>
                <div className="glass-card quiz-setup-card glow-cyan">
                  <MessageSquare size={48} className="text-cyan animate-pulse" />
                  <h2>Configure Oral Viva Session</h2>
                  <p>AI will ask open-ended conceptual questions about imports, variables, and architectures to evaluate your depth.</p>

                  {vivaError && (
                    <div style={{ color: '#dc2626', background: 'rgba(220,38,38,0.05)', padding: '0.75rem', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '1rem' }}>
                      {vivaError}
                    </div>
                  )}

                  <div className="quiz-setup-stats">
                    <div className="setup-stat">
                      <span>Questions</span>
                      <strong>15 Items</strong>
                    </div>
                    <div className="setup-stat">
                      <span>Pass Criteria</span>
                      <strong>50% Score</strong>
                    </div>
                  </div>

                  <button className="btn-cyan start-quiz-btn" onClick={fetchVivaQuestions}>
                    <Play size={16} /> Initiate Viva Session
                  </button>
                </div>

                {/* Oral Viva Past History Panel */}
                <div className="glass-card quiz-history-card">
                  <div className="card-top-header" style={{ marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-primary)', textAlign: 'left' }}>
                      Past Oral Viva Scorecards
                    </h3>
                  </div>
                  {loadingVivaHistory ? (
                    <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-secondary)' }}>
                      Loading scorecards...
                    </div>
                  ) : vivaHistory.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      No past viva sessions logged. Complete your first session above!
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {vivaHistory.map((item) => (
                        <div key={item._id} className="completed-success-banner" style={{ justifyContent: 'space-between', padding: '1rem', border: '1px solid var(--border-color)', background: 'var(--bg-card)' }}>
                          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                            <MessageSquare size={16} className="text-cyan" />
                            <span style={{ fontSize: '0.88rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                              Viva Session — {formatDate(item.createdAt)}
                            </span>
                          </div>
                          <span className="xp-badge" style={{ background: 'rgba(8, 145, 178, 0.05)', color: 'var(--accent-cyan)' }}>
                            Grade: {item.score}%
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {vivaState === 'loading' && (
              <div className="glass-card quiz-setup-card" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
                <div className="typing-dots-animation" style={{ display: 'flex', gap: '0.35rem', justifyContent: 'center', marginBottom: '1rem' }}>
                  <span className="dot animate-pulse"></span>
                  <span className="dot animate-pulse" style={{ animationDelay: '0.2s' }}></span>
                  <span className="dot animate-pulse" style={{ animationDelay: '0.4s' }}></span>
                </div>
                <h3>Formulating viva questions...</h3>
                <p>AI is inspecting class files and exports definitions.</p>
              </div>
            )}

            {vivaState === 'loading-evaluation' && (
              <div className="glass-card quiz-setup-card" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
                <div className="typing-dots-animation" style={{ display: 'flex', gap: '0.35rem', justifyContent: 'center', marginBottom: '1rem' }}>
                  <span className="dot animate-pulse"></span>
                  <span className="dot animate-pulse" style={{ animationDelay: '0.2s' }}></span>
                  <span className="dot animate-pulse" style={{ animationDelay: '0.4s' }}></span>
                </div>
                <h3>AI Architect is grading your answers...</h3>
                <p>Evaluating logic depth and code comprehension details.</p>
              </div>
            )}

            {vivaState === 'active' && vivaQuestions[vivaIdx] && (
              <div className="glass-card quiz-board-card" style={{ textAlign: 'left' }}>
                <div className="quiz-progress-top">
                  <span>Question {vivaIdx + 1} of {vivaQuestions.length}</span>
                  <span className="diff-pill medium">ORAL VIVA</span>
                </div>

                <div className="readiness-progress-bar-bg" style={{ height: '6px', margin: '0.5rem 0 1.5rem 0' }}>
                  <div className="readiness-progress-fill cyan" style={{ width: `${((vivaIdx + 1) / vivaQuestions.length) * 100}%`, height: '100%' }}></div>
                </div>

                <h3 className="quiz-question-text" style={{ color: 'var(--accent-cyan)' }}>
                  {vivaQuestions[vivaIdx]}
                </h3>

                <div className="interview-user-response-textarea" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1.5rem' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)' }}>
                    Type your detailed technical explanation:
                  </span>
                  <textarea
                    className="response-textarea form-input"
                    rows="6"
                    placeholder="Write how your components route APIs, fetch database records, or configure middlewares..."
                    value={currentVivaAnswer}
                    onChange={(e) => setCurrentVivaAnswer(e.target.value)}
                    style={{ width: '100%', padding: '1rem', background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '10px' }}
                  ></textarea>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem' }}>
                  <button 
                    className="btn btn-secondary"
                    onClick={handlePrevViva}
                    disabled={vivaIdx === 0}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                  >
                    <ArrowLeft size={16} /> Previous
                  </button>

                  <button 
                    className="btn-cyan" 
                    onClick={handleNextViva} 
                    disabled={!currentVivaAnswer.trim()}
                    style={{ borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                  >
                    {vivaIdx + 1 === vivaQuestions.length ? 'Submit All Answers' : 'Next'} <ArrowRight size={16} />
                  </button>
                </div>
                {vivaError && (
                  <div role="alert" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', padding: '0.75rem 1rem', borderRadius: '8px', fontSize: '0.85rem', marginTop: '1rem', textAlign: 'right' }}>
                    {vivaError}
                  </div>
                )}
              </div>
            )}

            {vivaState === 'results' && vivaEvaluation && (
              <div className="glass-card quiz-results-card glow-cyan" style={{ textAlign: 'left', alignItems: 'stretch' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', width: '100%' }}>
                  <Award size={48} className="text-cyan animate-pulse" />
                  <h2>Viva Session Graded</h2>
                  <div className="score-ratio-circle" style={{ borderColor: 'var(--accent-cyan)', background: 'rgba(8,145,178,0.02)' }}>
                    <span className="results-fraction">{vivaEvaluation.score}%</span>
                    <span className="results-label">Grade</span>
                  </div>
                </div>

                {vivaEvaluation.explanationSummary && (
                  <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
                    <h4 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '0.9rem', fontWeight: 'bold' }}>Explainable Score Analysis:</h4>
                    <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)' }}><strong>Strength:</strong> {vivaEvaluation.explanationSummary.strength}</p>
                    <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)' }}><strong>Weakness:</strong> {vivaEvaluation.explanationSummary.weakness}</p>
                    <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)' }}><strong>Evidence:</strong> {vivaEvaluation.explanationSummary.evidence}</p>
                    <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)' }}><strong>Recommendation:</strong> {vivaEvaluation.explanationSummary.recommendation}</p>
                  </div>
                )}

                <div className="viva-feedback-section" style={{ marginTop: '1.5rem', width: '100%' }}>
                  <h4 style={{ fontSize: '0.9rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '0.75rem', fontWeight: '700' }}>
                    AI Architect Feedback Checklist
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {(vivaEvaluation.feedback || []).map((point, idx) => (
                      <div key={idx} className="completed-success-banner" style={{ border: '1px solid rgba(8,145,178,0.15)', color: 'var(--text-secondary)', background: 'rgba(8,145,178,0.02)' }}>
                        <CheckCircle2 size={16} className="text-cyan" style={{ flexShrink: 0 }} />
                        <span>{point}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="results-action-row" style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '2rem' }}>
                  <button className="btn-cyan" onClick={restartViva} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <RotateCcw size={16} /> New Viva Session
                  </button>
                  <button className="btn-secondary" onClick={() => setActiveTab('quiz')}>
                    Back to Quizzes
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
