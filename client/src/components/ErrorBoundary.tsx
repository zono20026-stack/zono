import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorMessage: '',
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ZONO ErrorBoundary Caught]:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '70vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          textAlign: 'center'
        }}>
          <div style={{
            background: 'var(--surface-white)',
            border: '2px solid var(--border-orange)',
            borderRadius: 'var(--radius-lg)',
            padding: '36px 24px',
            maxWidth: '460px',
            width: '100%',
            boxShadow: 'var(--shadow-lg)'
          }}>
            <img
              src="/assets/zono_logo.jpeg"
              alt="ZONO"
              style={{ width: '64px', height: '64px', borderRadius: '50%', margin: '0 auto 16px', border: '2px solid var(--primary-orange)' }}
            />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary-orange)', marginBottom: '8px' }}>
              ZONO Delivery Services
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '20px', fontWeight: 600 }}>
              حدث خطأ غير متوقع أثناء عرض هذه الشاشة، يرجى إعادة التحميل أو العودة للرئيسية.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => {
                  this.setState({ hasError: false });
                  window.location.reload();
                }}
                className="btn btn-primary"
                style={{ padding: '8px 20px', fontSize: '0.9rem' }}
              >
                🔄 إعادة تحميل الشاشة
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
