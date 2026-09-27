import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ErrorDisplay } from './ErrorDisplay';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <ErrorDisplay
          statusCode={500}
          nepaliTitle="कम्पोनेन्टमा अनपेक्षित त्रुटि देखापर्यो"
          title="Component Runtime Exception"
          nepaliMessage="यो पृष्ठ प्रदर्शन गर्दा ब्राउजरमा समस्या देखापर्यो। तपाईंको अघिल्लो डाटा वा इनपुटहरू सुरक्षित छन्। कृपया पृष्ठ ताजा गर्नुहोस् वा पुनः प्रयास गर्नुहोस्।"
          message="A runtime error interrupted rendering this component. You can retry or head back to the dashboard."
          errorDetails={this.state.error?.message || 'Unknown runtime error'}
          errorStack={this.state.error?.stack || this.state.errorInfo?.componentStack || ''}
          onRetry={this.handleReset}
        />
      );
    }

    return this.props.children;
  }
}
