import { Component, type ErrorInfo, type ReactNode } from "react";

type ErrorBoundaryProps = {
  children: ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
};

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("NoteSense render failure", error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <main className="app-shell error-shell" aria-labelledby="error-title">
          <section className="error-panel" role="alert" aria-live="assertive">
            <p className="eyebrow">Recovery mode</p>
            <h1 id="error-title">Something went wrong</h1>
            <p>Your practice data is still stored in this browser. Reload NoteSense to start a fresh screen.</p>
            <button className="primary-button" type="button" onClick={this.handleReload}>
              Reload NoteSense
            </button>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
