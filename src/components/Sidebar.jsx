import React, { useContext } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { AppContext } from '../context/AppContext';
import { 
  LayoutDashboard, UploadCloud, GitBranch, 
  ClipboardCheck, Mic, FileSearch, MessageSquareCode, 
  FileText, User, LogOut, ChevronLeft, ChevronRight, Sun, Moon
} from 'lucide-react';
import './Sidebar.css';

// simple wording: sidebar navigation with collapse and mobile drawer support
export default function Sidebar({ collapsed, setCollapsed, mobileOpen = false, setMobileOpen = () => {} }) {
  const { user, logout, theme, toggleTheme } = useContext(AppContext);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleNavClick = () => {
    if (setMobileOpen) setMobileOpen(false);
  };

  return (
    <>
      {mobileOpen && (
        <div 
          className="sidebar-overlay" 
          onClick={() => setMobileOpen(false)} 
          aria-label="Close menu overlay"
        />
      )}
      <aside className={`sidebar-container ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
      <div className="sidebar-header">
        <div className="logo-container" onClick={() => navigate('/')}>
          <div className="logo-icon">IQ</div>
          {!collapsed && <span className="logo-text">Project<span className="text-purple">IQ</span></span>}
        </div>
        <button 
          className="collapse-toggle" 
          onClick={() => setCollapsed(!collapsed)}
          aria-label="Toggle Sidebar"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* User Profile Widget */}
      <div className="sidebar-profile-widget">
        <div className="avatar-section">
          <div className="user-avatar">
            {(user?.name || 'Developer').split(' ').filter(Boolean).map(n => n[0]).join('') || 'D'}
          </div>
          {!collapsed && (
            <div className="user-info-text">
              <div className="user-name">{user?.name || 'Developer'}</div>
              {user?.email && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user.email}</div>}
            </div>
          )}
        </div>
      </div>

      <nav className="sidebar-nav">
        {/* Workspace Category */}
        <div className="nav-category">
          {!collapsed && <span className="category-label">Workspace</span>}
          <NavLink to="/dashboard" onClick={handleNavClick} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <LayoutDashboard size={18} />
            {!collapsed && <span>Dashboard</span>}
          </NavLink>
          <NavLink to="/upload" onClick={handleNavClick} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <UploadCloud size={18} />
            {!collapsed && <span>Upload Project</span>}
          </NavLink>
        </div>

        {/* Learn Category */}
        <div className="nav-category">
          {!collapsed && <span className="category-label">Learn</span>}
          <NavLink to="/learning-path" onClick={handleNavClick} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <GitBranch size={18} />
            {!collapsed && <span>Learning Path</span>}
          </NavLink>
          <NavLink to="/quiz" onClick={handleNavClick} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <ClipboardCheck size={18} />
            {!collapsed && <span>Quiz & Viva</span>}
          </NavLink>
          <NavLink to="/mock-interview" onClick={handleNavClick} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Mic size={18} />
            {!collapsed && <span>Mock Interview</span>}
          </NavLink>
        </div>

        {/* AI Intelligence Category */}
        <div className="nav-category">
          {!collapsed && <span className="category-label">AI Insights</span>}
          <NavLink 
            to="/analysis/overview" 
            onClick={handleNavClick}
            className={`nav-item ${location.pathname.startsWith('/analysis') ? 'active' : ''}`}
          >
            <FileSearch size={18} />
            {!collapsed && <span>Project Analysis</span>}
          </NavLink>
          <NavLink to="/chat" onClick={handleNavClick} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <MessageSquareCode size={18} />
            {!collapsed && <span>AI Project Mentor</span>}
          </NavLink>
        </div>

        {/* Reports & Metrics */}
        <div className="nav-category">
          {!collapsed && <span className="category-label">Performance</span>}
          <NavLink to="/report" onClick={handleNavClick} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <FileText size={18} />
            {!collapsed && <span>PDF Summary</span>}
          </NavLink>
          <NavLink to="/profile" onClick={handleNavClick} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <User size={18} />
            {!collapsed && <span>My Profile</span>}
          </NavLink>
        </div>
      </nav>

      {/* Sidebar Footer */}
      <div className="sidebar-footer">
        <button className="nav-item footer-item theme-toggle-btn" onClick={toggleTheme} style={{ background: 'transparent', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left' }}>
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          {!collapsed && <span>{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>}
        </button>
        <button className="nav-item footer-item logout-btn" onClick={handleLogout}>
          <LogOut size={18} />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
    </>
  );
}
