import React, { createContext, useState, useEffect, useCallback } from 'react';
import { handleApiResponse, getNetworkErrorMessage } from '../utils/apiHelper';

export const AppContext = createContext();

// Backend API Base URL loaded from environment variable
export const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '') || '/api';

export const AppProvider = ({ children }) => {
  // Theme state (light / dark) saved in localStorage
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('projectiq_theme') || 'light';
  });

  useEffect(() => {
    localStorage.setItem('projectiq_theme', theme);
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('theme-dark');
      root.classList.remove('theme-light');
    } else {
      root.classList.add('theme-light');
      root.classList.remove('theme-dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  // User state holding profile from database
  const [user, setUser] = useState({
    name: 'Developer Profile',
    email: ''
  });

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [projects, setProjects] = useState([]);
  const [activeProject, setActiveProjectState] = useState(null);
  const [isProjectsLoading, setIsProjectsLoading] = useState(false);

  // Real project roadmap state fetched from backend database
  const [roadmap, setRoadmap] = useState([]);
  const [isRoadmapLoading, setIsRoadmapLoading] = useState(false);

  // Helper to change active project and save selection to localStorage
  const setActiveProject = (projectObj) => {
    setActiveProjectState(projectObj);
    if (projectObj) {
      const pid = projectObj._id || projectObj.id;
      localStorage.setItem('projectiq_active_project_id', pid);
    } else {
      localStorage.removeItem('projectiq_active_project_id');
    }
  };

  // Fetch persistent learning roadmap from backend database
  const fetchRoadmap = useCallback(async (projectId) => {
    if (!projectId) {
      setRoadmap([]);
      return;
    }

    const token = localStorage.getItem('projectiq_token');
    if (!token) return;

    setIsRoadmapLoading(true);
    try {
      const res = await fetch(`${API_BASE}/prepare/${projectId}/roadmap`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRoadmap(data);
      }
    } catch (err) {
      console.error('[Fetch Roadmap Error]:', getNetworkErrorMessage(err));
    } finally {
      setIsRoadmapLoading(false);
    }
  }, []);

  // Fetch projects list from backend and restore previously active project
  const loadProjects = useCallback(async (token) => {
    setIsProjectsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/projects`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setProjects(data);

        if (data.length > 0) {
          // Check if user previously had an active project selected
          const savedProjectId = localStorage.getItem('projectiq_active_project_id');
          const matchingProject = savedProjectId ? data.find(p => (p._id || p.id) === savedProjectId) : null;
          const targetProject = matchingProject || data[0];

          setActiveProjectState(targetProject);
          localStorage.setItem('projectiq_active_project_id', targetProject._id || targetProject.id);
        } else {
          setActiveProjectState(null);
          localStorage.removeItem('projectiq_active_project_id');
        }
      }
    } catch (err) {
      console.error('[Load Projects Error]:', getNetworkErrorMessage(err));
    } finally {
      setIsProjectsLoading(false);
    }
  }, []);

  // Automatically fetch real roadmap whenever active project changes
  useEffect(() => {
    if (activeProject) {
      const projectId = activeProject._id || activeProject.id;
      fetchRoadmap(projectId);
    } else {
      setRoadmap([]);
    }
  }, [activeProject?._id, activeProject?.id, fetchRoadmap]);

  // Check login state on initial page boot
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('projectiq_token');
      if (token) {
        try {
          const res = await fetch(`${API_BASE}/auth/profile`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            setUser(data);
            setIsAuthenticated(true);
            await loadProjects(token);
          } else {
            logout();
          }
        } catch (e) {
          console.error('[Auth Check Error]:', getNetworkErrorMessage(e));
          setIsAuthenticated(false);
        }
      }
      setIsAuthChecking(false);
    };
    checkAuth();
  }, [loadProjects]);

  // User login action
  const login = async (email, password) => {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      const data = await handleApiResponse(res, 'Authentication failed. Please check your credentials.');
      localStorage.setItem('projectiq_token', data.token);
      setUser(data.user);
      setIsAuthenticated(true);
      await loadProjects(data.token);
      return { success: true };
    } catch (e) {
      console.error('[Login Error]:', e);
      return { success: false, message: getNetworkErrorMessage(e, 'Authentication failed. Please verify your credentials.') };
    }
  };

  // User registration action
  const register = async (name, email, password) => {
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });

      const data = await handleApiResponse(res, 'Registration failed. Please try again.');
      localStorage.setItem('projectiq_token', data.token);
      setUser(data.user);
      setIsAuthenticated(true);
      await loadProjects(data.token);
      return { success: true };
    } catch (e) {
      console.error('[Register Error]:', e);
      return { success: false, message: getNetworkErrorMessage(e, 'Registration failed. Please check your network connection.') };
    }
  };

  // User logout action: resets all state cleanly
  const logout = () => {
    localStorage.removeItem('projectiq_token');
    localStorage.removeItem('projectiq_active_project_id');
    setIsAuthenticated(false);
    setUser({
      name: 'Developer Profile',
      email: ''
    });
    setProjects([]);
    setActiveProjectState(null);
    setRoadmap([]);
  };

  // Completes a roadmap module via backend database and synchronizes all views
  const completeRoadmapModule = async (moduleId) => {
    if (!activeProject) return null;
    const token = localStorage.getItem('projectiq_token');
    if (!token) return null;

    const projectId = activeProject._id || activeProject.id;
    try {
      const res = await fetch(`${API_BASE}/prepare/${projectId}/roadmap/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ moduleId })
      });

      if (res.ok) {
        const data = await res.json();
        // Update user state directly from database response
        if (data.user) {
          setUser(prev => ({ ...prev, ...data.user }));
        }
        // Update synchronized roadmap state
        if (data.roadmap) {
          setRoadmap(data.roadmap);
        }
        return data;
      }
    } catch (err) {
      console.error('[Complete Module Error]:', getNetworkErrorMessage(err));
    }
    return null;
  };

  // Adds a newly uploaded project and marks it as active
  const addProject = (projectObj) => {
    setProjects(prev => [projectObj, ...prev]);
    setActiveProject(projectObj);
  };

  return (
    <AppContext.Provider value={{
      user,
      setUser,
      isAuthenticated,
      isAuthChecking,
      projects,
      setProjects,
      activeProject,
      setActiveProject,
      isProjectsLoading,
      loadProjects,
      roadmap,
      setRoadmap,
      isRoadmapLoading,
      fetchRoadmap,
      completeRoadmapModule,
      addProject,
      login,
      register,
      logout,
      theme,
      toggleTheme,
      API_BASE
    }}>
      {children}
    </AppContext.Provider>
  );
};
