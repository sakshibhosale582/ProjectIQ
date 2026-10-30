import React, { useContext, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AppProvider, AppContext } from './context/AppContext';
import ErrorBoundary from './components/ErrorBoundary';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import Dashboard from './pages/Dashboard';
import UploadProject from './pages/UploadProject';
import AnalysisOverview from './pages/AnalysisOverview';
import AnalysisArchitecture from './pages/AnalysisArchitecture';
import AnalysisModules from './pages/AnalysisModules';
import AnalysisIssues from './pages/AnalysisIssues';
import AnalysisFiles from './pages/AnalysisFiles';
import AIChat from './pages/AIChat';
import LearningPath from './pages/LearningPath';
import QuizViva from './pages/QuizViva';
import MockInterview from './pages/MockInterview';
import Profile from './pages/Profile';
import PDFReport from './pages/PDFReport';
import './App.css';

// Guard for protected routes
function RouteGuard({ children }) {
  const { isAuthenticated, isAuthChecking } = useContext(AppContext);
  if (isAuthChecking) return null;
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

// Sub-component to manage sidebar layouts conditionally
function AppLayout() {
  const { isAuthenticated, isAuthChecking } = useContext(AppContext);
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Show loading spinner while checking initial auth token
  if (isAuthChecking) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--bg-deep, #07070c)',
        color: 'var(--text-primary, #ffffff)'
      }}>
        <div className="typing-dots-animation">
          <span></span>
          <span></span>
          <span></span>
        </div>
        <p style={{ marginTop: '1rem', color: 'var(--text-secondary, #a1a1aa)', fontSize: '0.9rem' }}>
          Initializing workspace...
        </p>
      </div>
    );
  }

  // Hide sidebar on landing, login and register screens
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register' || location.pathname === '/';
  const showSidebar = isAuthenticated && !isAuthPage;

  return (
    <div className={showSidebar ? "app-container" : ""}>
      {showSidebar && (
        <Sidebar 
          collapsed={collapsed} 
          setCollapsed={setCollapsed} 
          mobileOpen={mobileOpen} 
          setMobileOpen={setMobileOpen} 
        />
      )}
      <main className={showSidebar ? `main-content ${collapsed ? 'collapsed' : ''}` : ""}>
        {showSidebar && (
          <Navbar 
            isMobileMenuOpen={mobileOpen}
            onToggleMobileMenu={() => setMobileOpen(!mobileOpen)}
          />
        )}
        <div className={showSidebar ? "page-content-wrapper" : ""}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
            <Route path="/register" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <RegisterPage />} />
            <Route path="/dashboard" element={<RouteGuard><Dashboard /></RouteGuard>} />
            <Route path="/upload" element={<RouteGuard><UploadProject /></RouteGuard>} />
            <Route path="/analysis" element={<Navigate to="/analysis/overview" replace />} />
            <Route path="/analysis/overview" element={<RouteGuard><AnalysisOverview /></RouteGuard>} />
            <Route path="/analysis/architecture" element={<RouteGuard><AnalysisArchitecture /></RouteGuard>} />
            <Route path="/analysis/modules" element={<RouteGuard><AnalysisModules /></RouteGuard>} />
            <Route path="/analysis/issues" element={<RouteGuard><AnalysisIssues /></RouteGuard>} />
            <Route path="/analysis/files" element={<RouteGuard><AnalysisFiles /></RouteGuard>} />
            <Route path="/chat" element={<RouteGuard><AIChat /></RouteGuard>} />
            <Route path="/learning-path" element={<RouteGuard><LearningPath /></RouteGuard>} />
            <Route path="/quiz" element={<RouteGuard><QuizViva /></RouteGuard>} />
            <Route path="/mock-interview" element={<RouteGuard><MockInterview /></RouteGuard>} />
            <Route path="/profile" element={<RouteGuard><Profile /></RouteGuard>} />
            <Route path="/report" element={<RouteGuard><PDFReport /></RouteGuard>} />
            <Route path="*" element={<Navigate to={isAuthenticated ? "/dashboard" : "/"} replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <Router>
          <AppLayout />
        </Router>
      </AppProvider>
    </ErrorBoundary>
  );
}
