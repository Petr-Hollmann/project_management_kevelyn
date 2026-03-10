import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { logError } from '@/lib/errorLogger';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, logged: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    this.setState({ error, errorInfo });

    logError(error, {
      componentStack: errorInfo?.componentStack || null,
      errorType: 'boundary',
    }).then(() => this.setState({ logged: true }));
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <Card className="max-w-lg w-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="w-5 h-5" />
                Něco se pokazilo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-slate-700">
                Aplikace narazila na neočekávanou chybu.{' '}
                {this.state.logged
                  ? 'Chyba byla automaticky zaznamenána.'
                  : 'Zkuste stránku obnovit.'}
              </p>
              {this.state.error && (
                <div className="bg-slate-100 p-3 rounded text-xs font-mono text-slate-600 overflow-auto max-h-32">
                  {this.state.error.toString()}
                </div>
              )}
              {this.state.errorInfo?.componentStack && (
                <details className="text-xs text-slate-500">
                  <summary className="cursor-pointer select-none">
                    Zásobník komponent
                  </summary>
                  <pre className="mt-2 overflow-auto max-h-40 bg-slate-50 p-2 rounded text-xs">
                    {this.state.errorInfo.componentStack}
                  </pre>
                </details>
              )}
              <Button onClick={() => window.location.reload()} className="w-full">
                <RefreshCw className="w-4 h-4 mr-2" />
                Obnovit stránku
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
