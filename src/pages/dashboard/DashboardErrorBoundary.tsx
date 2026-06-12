import React from 'react';
import { AlertCircleIcon } from 'lucide-react';

interface DashboardErrorBoundaryProps {
  children: React.ReactNode;
}

interface DashboardErrorBoundaryState {
  error: Error | null;
}

/**
 * Prevents a Dashboard render failure from blanking the whole Electron shell.
 * Logs the component stack for production diagnosis.
 */
export class DashboardErrorBoundary extends React.Component<
  DashboardErrorBoundaryProps,
  DashboardErrorBoundaryState
> {
  state: DashboardErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): DashboardErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('[Dashboard] render error caught by boundary', {
      error,
      componentStack: info.componentStack,
    });
  }

  private handleRetry = (): void => {
    this.setState({ error: null });
  };

  render(): React.ReactNode {
    if (this.state.error) {
      return (
        <div className="mx-auto max-w-2xl pt-10">
          <div className="rounded-xl border border-danger-200 bg-danger-50 p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <AlertCircleIcon
                className="mt-0.5 h-6 w-6 shrink-0 text-danger-600"
                aria-hidden
              />
              <div className="min-w-0">
                <h1 className="text-lg font-semibold text-danger-900">
                  Dashboard could not load
                </h1>
                <p className="mt-2 text-sm text-danger-800">
                  Some imported backup data could not be displayed. Other pages
                  should still work. Check the developer console for details
                  tagged <code className="font-mono">[Dashboard]</code>.
                </p>
                <p className="mt-3 break-words font-mono text-xs text-danger-700">
                  {this.state.error.message}
                </p>
                <button
                  type="button"
                  onClick={this.handleRetry}
                  className="mt-4 rounded-md bg-white px-3 py-2 text-sm font-semibold text-danger-900 shadow-sm ring-1 ring-inset ring-danger-300 hover:bg-danger-100"
                >
                  Try again
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
