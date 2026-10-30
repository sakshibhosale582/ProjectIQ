import React, { useContext, useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AppContext } from '../context/AppContext';
import { 
  Bell, Sun, Moon, User, ChevronDown, CheckCircle2, 
  ShieldCheck, Brain, FileText, Menu, X, FolderGit2
} from 'lucide-react';
import './Navbar.css';

// Simple wording: Breadcrumb mappings based on current route
const ROUTE_BREADCRUMBS = {
  '/dashboard': { section: 'Workspace', title: 'Dashboard' },
  '/upload': { section: 'Workspace', title: 'Upload Project' },
  '/analysis/overview': { section: 'Project Analysis', title: 'Overview & Telemetry' },
  '/analysis/architecture': { section: 'Project Analysis', title: 'Architecture Flow' },
  '/analysis/modules': { section: 'Project Analysis', title: 'Modules & Boundaries' },
  '/analysis/issues': { section: 'Project Analysis', title: 'Security & Issues' },
  '/analysis/files': { section: 'Project Analysis', title: 'File Inspector' },
  '/chat': { section: 'AI Insights', title: 'AI Project Mentor' },
  '/learning-path': { section: 'Preparation', title: 'Learning Roadmap' },
  '/quiz': { section: 'Preparation', title: 'Quiz & Viva' },
  '/mock-interview': { section: 'Preparation', title: 'Mock Interview' },
  '/report': { section: 'Performance', title: 'PDF Summary' },
  '/profile': { section: 'Account', title: 'My Profile' }
};

export default function Navbar({ onToggleMobileMenu, isMobileMenuOpen }) {
  const { user, activeProject, projects, setActiveProject, theme, toggleTheme } = useContext(AppContext);
  const location = useLocation();
  const navigate = useNavigate();

  const [showNotifications, setShowNotifications] = useState(false);
  const [showProjectSelector, setShowProjectSelector] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(true);

  const notifRef = useRef(null);
  const projectRef = useRef(null);

  const currentMeta = ROUTE_BREADCRUMBS[location.pathname] || {
    section: 'ProjectIQ',
    title: 'Workspace'
  };

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
      if (projectRef.current && !projectRef.current.contains(e.target)) {
        setShowProjectSelector(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Simple wording: Real system event notifications based on active project
  const systemNotifications = [
    ...(activeProject ? [
      {
        id: 1,
        title: 'Project Analysis Ready',
        desc: `Telemetry and architecture ready for ${activeProject.name}.`,
        time: 'Active Session',
        icon: <CheckCircle2 size={16} className="text-green" />
      },
      {
        id: 2,
        title: 'Security Audit Scanned',
        desc: `${(activeProject.securityFindings || []).length} security rule(s) evaluated.`,
        time: 'Today',
        icon: <ShieldCheck size={16} className="text-cyan" />
      },
      {
        id: 3,
        title: 'AI Code Mentor Available',
        desc: 'Interactive explanation and technical Q&A initialized.',
        time: 'Ready',
        icon: <Brain size={16} className="text-purple" />
      }
    ] : [
      {
        id: 1,
        title: 'Workspace Ready',
        desc: 'Upload a project ZIP to generate full architecture telemetry.',
        time: 'Now',
        icon: <FileText size={16} className="text-purple" />
      }
    ])
  ];

  const handleOpenNotifications = () => {
    setShowNotifications(prev => !prev);
    setUnreadNotifications(false);
  };

  return (
    <header className="app-navbar">
      <div className="navbar-left">
        {/* Mobile Hamburger Toggle */}
        <button 
          className="mobile-menu-btn" 
          onClick={onToggleMobileMenu} 
          aria-label="Toggle navigation menu"
        >
          {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        {/* Dynamic Breadcrumb Context */}
        <div className="navbar-breadcrumbs">
          <span className="breadcrumb-section">{currentMeta.section}</span>
          <span className="breadcrumb-separator">/</span>
          <h1 className="breadcrumb-title">{currentMeta.title}</h1>
        </div>
      </div>

      <div className="navbar-right">
        {/* Active Project Dropdown Pill */}
        {projects.length > 0 && activeProject && (
          <div className="navbar-project-selector" ref={projectRef}>
            <button 
              type="button"
              className="navbar-pill-btn project-pill"
              onClick={() => setShowProjectSelector(prev => !prev)}
              title="Change active project"
            >
              <FolderGit2 size={15} className="text-purple" />
              <span className="project-pill-name">{activeProject.name}</span>
              <ChevronDown size={13} className="text-muted" />
            </button>

            {showProjectSelector && (
              <div className="navbar-dropdown project-dropdown-menu">
                <div className="dropdown-header">Switch Active Project</div>
                <div className="dropdown-list">
                  {projects.map(p => (
                    <button
                      key={p._id || p.id}
                      type="button"
                      className={`dropdown-item ${((p._id || p.id) === (activeProject._id || activeProject.id)) ? 'active' : ''}`}
                      onClick={() => {
                        setActiveProject(p);
                        setShowProjectSelector(false);
                      }}
                    >
                      <span className="dropdown-item-title">{p.name}</span>
                      <span className="dropdown-item-meta">{p.techStack?.slice(0, 2).join(', ')}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* System Notifications Popover */}
        <div className="navbar-notifications" ref={notifRef}>
          <button 
            type="button"
            className="navbar-icon-btn" 
            onClick={handleOpenNotifications}
            aria-label="System notifications"
            title="System notifications"
          >
            <Bell size={18} />
            {unreadNotifications && <span className="notif-unread-dot" />}
          </button>

          {showNotifications && (
            <div className="navbar-dropdown notif-dropdown-menu">
              <div className="dropdown-header flex-between">
                <span>System Notifications</span>
                <span className="notif-count-badge">{systemNotifications.length}</span>
              </div>
              <div className="dropdown-list">
                {systemNotifications.map(n => (
                  <div key={n.id} className="notif-item">
                    <div className="notif-icon-wrap">{n.icon}</div>
                    <div className="notif-text-wrap">
                      <strong className="notif-title">{n.title}</strong>
                      <p className="notif-desc">{n.desc}</p>
                      <span className="notif-time">{n.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Theme Quick Switcher */}
        <button 
          type="button"
          className="navbar-icon-btn"
          onClick={toggleTheme}
          aria-label="Toggle theme mode"
          title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
        >
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </button>

        {/* User Profile Avatar Pill */}
        <div 
          className="navbar-user-pill" 
          onClick={() => navigate('/profile')}
          title="Go to My Profile"
        >
          <div className="navbar-avatar">
            {(user?.name || 'Developer').split(' ').filter(Boolean).map(n => n[0]).join('') || 'D'}
          </div>
          <span className="navbar-user-name">{user?.name?.split(' ')[0] || 'Developer'}</span>
        </div>
      </div>
    </header>
  );
}
