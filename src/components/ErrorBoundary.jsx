import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[React ErrorBoundary caught error]:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          backgroundColor: 'var(--bg-deep, #07070c)',
          color: 'var(--text-primary, #ffffff)',
          textAlign: 'center'
        }}>
          <div style={{
            maxWidth: '500px',
            padding: '2.5rem',
            borderRadius: '16px',
            background: 'var(--bg-card, #13131f)',
            border: '1px solid var(--border-color, rgba(255,255,255,0.1))',
            boxShadow: '0 20px 40px rgba(0,0,0,0.4)'
          }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#f87171' }}>
              Something went wrong
            </h2>
            <p style={{ color: 'var(--text-secondary, #a1a1aa)', fontSize: '0.95rem', marginBottom: '1.5rem', lineHeight: '1.6' }}>
              The application encountered an unexpected render issue. Please click below to refresh the workspace.
            </p>
            <button
              onClick={this.handleReload}
              style={{
                padding: '0.75rem 1.75rem',
                borderRadius: '8px',
                border: 'none',
                background: 'linear-gradient(135deg, #6d28d9, #9333ea)',
                color: '#ffffff',
                fontWeight: '600',
                cursor: 'pointer',
                fontSize: '0.95rem'
              }}
            >
              Refresh Workspace
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
