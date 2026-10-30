import React, { useContext } from 'react';
import { NavLink } from 'react-router-dom';
import { AppContext } from '../context/AppContext';
import { FileSearch, Share2, Layers, AlertTriangle, Folder } from 'lucide-react';
import './AnalysisNav.css';

export default function AnalysisNav({ title, subtitle }) {
  const { projects, activeProject, setActiveProject } = useContext(AppContext);

  return (
    <div className="analysis-header-container">
      <div className="analysis-top-bar">
        <div className="header-text">
          <h1>{title || 'Workspace Diagnostics'}</h1>
          <p>{subtitle || 'Inspect detected code flows, static diagnostic warnings, and package structures.'}</p>
        </div>

        {projects.length > 0 && activeProject && (
          <div className="project-dropdown-selector">
            <label>Selected Project:</label>
            <select 
              className="form-input" 
              value={activeProject._id || activeProject.id}
              onChange={(e) => setActiveProject(projects.find(p => (p._id || p.id) === e.target.value))}
            >
              {projects.map(p => (
                <option key={p._id || p.id} value={p._id || p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Dedicated 5-Page Analysis Navigation Bar */}
      <div className="analysis-nav-tabs">
        <NavLink 
          to="/analysis/overview" 
          className={({ isActive }) => `analysis-nav-pill ${isActive ? 'active' : ''}`}
        >
          <FileSearch size={16} />
          <span>Overview</span>
        </NavLink>

        <NavLink 
          to="/analysis/architecture" 
          className={({ isActive }) => `analysis-nav-pill ${isActive ? 'active' : ''}`}
        >
          <Share2 size={16} />
          <span>Architecture</span>
        </NavLink>

        <NavLink 
          to="/analysis/modules" 
          className={({ isActive }) => `analysis-nav-pill ${isActive ? 'active' : ''}`}
        >
          <Layers size={16} />
          <span>Modules</span>
        </NavLink>

        <NavLink 
          to="/analysis/issues" 
          className={({ isActive }) => `analysis-nav-pill ${isActive ? 'active' : ''}`}
        >
          {/* Simple wording: Shows both security audit and code quality issues */}
          <AlertTriangle size={16} />
          <span>Security & Issues</span>
          {((activeProject?.codeIssues?.length || 0) + (activeProject?.securityFindings?.length || 0)) > 0 && (
            <span className="issues-count-pill">
              {(activeProject?.codeIssues?.length || 0) + (activeProject?.securityFindings?.length || 0)}
            </span>
          )}
        </NavLink>

        <NavLink 
          to="/analysis/files" 
          className={({ isActive }) => `analysis-nav-pill ${isActive ? 'active' : ''}`}
        >
          <Folder size={16} />
          <span>File Inspector</span>
        </NavLink>
      </div>
    </div>
  );
}
