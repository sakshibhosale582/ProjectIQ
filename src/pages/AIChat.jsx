import React, { useContext, useState, useRef, useEffect } from 'react';
import { AppContext } from '../context/AppContext';
import { handleApiResponse, getNetworkErrorMessage } from '../utils/apiHelper';
import ReactMarkdown from 'react-markdown';
import { Send, Bot, User, Sparkles, Loader2, AlertTriangle, RefreshCw } from 'lucide-react';
import './AIChat.css';

export default function AIChat() {
  const { activeProject, API_BASE } = useContext(AppContext);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef(null);
  const MAX_QUESTION_LENGTH = 2000;

  // Indexing lifecycle of the active project: pending -> indexing -> ready | failed | skipped
  const [indexing, setIndexing] = useState(null);
  const projectIdForStatus = activeProject?._id || activeProject?.id;

  useEffect(() => {
    if (!projectIdForStatus) return undefined;
    let cancelled = false;
    let timer = null;
    const poll = async () => {
      try {
        const token = localStorage.getItem('projectiq_token');
        const res = await fetch(`${API_BASE}/projects/${projectIdForStatus}/status`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        setIndexing(data.indexing);
        if (['pending', 'indexing'].includes(data.indexing?.status)) timer = setTimeout(poll, 3000);
      } catch (err) {
        console.error('Failed to read indexing status:', err);
      }
    };
    poll();
    return () => { cancelled = true; if (timer) clearTimeout(timer); };
  }, [projectIdForStatus]);

  const handleReindex = async () => {
    try {
      const token = localStorage.getItem('projectiq_token');
      const res = await fetch(`${API_BASE}/projects/${projectIdForStatus}/reindex`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } });
      await handleApiResponse(res, 'Could not start re-indexing.');
      setIndexing({ status: 'indexing', total: 0, done: 0, error: '' });
    } catch (err) {
      setIndexing(prev => ({ ...(prev || {}), error: getNetworkErrorMessage(err, 'Could not start re-indexing.') }));
    }
  };

  const chatReady = !indexing || indexing.status === 'ready';

  // simple wording: curated quick prompts for codebase exploration and interview prep
  const suggestedPrompts = [
    'How does this project work?',
    'Explain the architecture flow',
    'Explain the authentication flow',
    'Why is this code structured this way?',
    'Ask me viva interview questions'
  ];

  // Load chat history from backend on boot (Phase 11 integration)
  useEffect(() => {
    const loadChatHistory = async () => {
      if (!activeProject) return;
      
      const token = localStorage.getItem('projectiq_token');
      const projectId = activeProject._id || activeProject.id;
      
      try {
        const res = await fetch(`${API_BASE}/projects/${projectId}/chat`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (res.ok) {
          const data = await res.json();
          if (data.messages && data.messages.length > 0) {
            // Map saved messages to view formats
            const mapped = data.messages.map((m, idx) => ({
              id: `msg-hist-${idx}`,
              sender: m.sender,
              text: m.text,
              timestamp: m.timestamp ? new Date(m.timestamp) : new Date()
            }));
            setMessages(mapped);
          } else {
            // Fallback to default greeting
            setMessages([
              {
                id: 'welcome-msg',
                sender: 'bot',
                text: `I analyzed your project structure for **${activeProject.name}**. I mapped the files, identified a **${activeProject.techStack.join(' + ')}** tech stack, and analyzed security patterns. Ask me anything about your implementation!`,
                timestamp: new Date()
              }
            ]);
          }
        }
      } catch (err) {
        console.error('Failed to load chat history:', err);
      }
    };
    loadChatHistory();
  }, [activeProject]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSendMessage = async (text) => {
    if (!text.trim() || text.length > MAX_QUESTION_LENGTH || !chatReady) return;

    const userMsg = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: text,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);

    try {
      const token = localStorage.getItem('projectiq_token');
      const projectId = activeProject._id || activeProject.id;
      
      const res = await fetch(`${API_BASE}/projects/${projectId}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ question: text.trim() })
      });

      const data = await handleApiResponse(res, 'The AI Mentor could not process your query at this time.');
      
      const botMsg = {
        id: `msg-${Date.now() + 1}`,
        sender: 'bot',
        text: data.text || 'I could not compile a response.',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, botMsg]);
    } catch (err) {
      console.error('[AI Chat Error]:', err);
      const friendlyError = getNetworkErrorMessage(err, 'The AI Mentor service is temporarily unavailable. Please try again in a moment.');
      setMessages(prev => [...prev, {
        id: `msg-err-${Date.now()}`,
        sender: 'bot',
        text: `⚠️ ${friendlyError}`,
        timestamp: new Date()
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="chat-page-container">
      <div className="chat-view-header">
        <div className="header-text">
          <div className="chat-header-row">
            <h1>AI Project Mentor</h1>
            {activeProject && (
              <span className="status-badge info">
                {activeProject.name}
              </span>
            )}
          </div>
          <p>Ask technical questions about your codebase, architecture patterns, and viva interview explanations.</p>
        </div>
      </div>

      {indexing && indexing.status !== 'ready' && (
        <div role="status" className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', fontSize: '0.85rem', flexShrink: 0 }}>
          {['pending', 'indexing'].includes(indexing.status) && (
            <><Loader2 size={16} /> Indexing your project for AI search{indexing.total ? ` (${indexing.done}/${indexing.total} code chunks)` : '...'}. Chat unlocks when it is ready.</>
          )}
          {indexing.status === 'failed' && (
            <><AlertTriangle size={16} color="#f59e0b" /> Indexing failed{indexing.error ? `: ${indexing.error}` : '.'}
              <button className="btn btn-secondary" onClick={handleReindex} style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.4rem' }}><RefreshCw size={13} /> Re-index</button></>
          )}
          {indexing.status === 'skipped' && (
            <><AlertTriangle size={16} color="#f59e0b" /> AI chat is unavailable: {indexing.error || 'the server has no Gemini API key configured.'}</>
          )}
        </div>
      )}

      {indexing && indexing.status === 'ready' && indexing.mode === 'keyword' && (
        <div role="note" className="glass-card" style={{ padding: '0.5rem 1rem', fontSize: '0.78rem', color: 'var(--text-muted)', flexShrink: 0 }}>
          Using keyword code search because the Gemini embedding quota is not available on this API key. The mentor still answers from your code.
        </div>
      )}

      <div className="chat-workspace-grid glass-card">
        <div className="chat-messages-scroller">
          {messages.map((msg) => (
            <div key={msg.id} className={`chat-message-bubble ${msg.sender}-style`}>
              <div className="bubble-avatar">
                {msg.sender === 'bot' ? <Bot size={16} /> : <User size={16} />}
              </div>
              <div className="bubble-content-text">
                <div className="sender-meta-row">
                  <span className="sender-name">{msg.sender === 'bot' ? 'IQ Mentor' : 'You'}</span>
                  <span className="msg-time">
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="parsed-markdown-content">
                  {/* Markdown is rendered as React elements (raw HTML is never injected), so AI output cannot run scripts */}
                  <ReactMarkdown
                    components={{
                      a: ({ node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" />,
                      pre: ({ node, ...props }) => <pre {...props} style={{ overflowX: 'auto', background: 'rgba(0,0,0,0.35)', padding: '0.75rem', borderRadius: '8px', fontSize: '0.8rem' }} />
                    }}
                  >
                    {msg.text}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="chat-message-bubble bot-style typing-indicator-bubble">
              <div className="bubble-avatar">
                <Bot size={16} />
              </div>
              <div className="typing-dots-animation">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          )}
          <div ref={chatEndRef}></div>
        </div>

        <div className="chat-controls-footer">
          {messages.length === 1 && (
            <div className="suggested-chips-container">
              <div className="chips-title"><Sparkles size={12} className="text-purple" /> Suggested Prompts:</div>
              <div className="chips-flex-row">
                {suggestedPrompts.map((prompt, idx) => (
                  <button 
                    key={idx} 
                    className="suggested-prompt-chip"
                    onClick={() => handleSendMessage(prompt)}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          <form 
            className="chat-input-form-row" 
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage(inputValue);
            }}
          >
            <input 
              type="text" 
              className="form-input chat-text-input" 
              placeholder={chatReady ? 'Ask your mentor about dependencies, files, schemas...' : 'Waiting for indexing to finish...'}
              value={inputValue}
              maxLength={MAX_QUESTION_LENGTH}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={isTyping || !chatReady}
            />
            <button type="submit" className="btn-primary chat-submit-btn" disabled={isTyping || !chatReady || !inputValue.trim()}>
              <Send size={16} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
