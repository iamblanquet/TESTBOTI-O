import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

/**
 * Error Boundary para capturar errores de React y mostrar una UI de fallback
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error capturado por ErrorBoundary:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });

    // Aquí podrías enviar el error a un servicio de logging
    // Por ejemplo: logErrorToService(error, errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
    
    // Intentar recargar la página después de limpiar el estado
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-6 border-2 border-rose-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <h1 className="font-bold text-lg text-slate-900">
                  Algo salió mal
                </h1>
                <p className="text-sm text-slate-600">
                  La aplicación encontró un error inesperado
                </p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-lg p-4 mb-4 border border-slate-200">
              <p className="text-xs font-mono text-slate-700 break-all">
                {this.state.error?.toString()}
              </p>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
              <details className="mb-4">
                <summary className="text-xs text-slate-600 cursor-pointer hover:text-slate-900 mb-2">
                  Ver detalles técnicos
                </summary>
                <div className="bg-slate-900 rounded-lg p-3 overflow-auto max-h-60">
                  <pre className="text-[10px] text-slate-300 whitespace-pre-wrap">
                    {this.state.errorInfo.componentStack}
                  </pre>
                </div>
              </details>
            )}

            <div className="flex gap-2">
              <button
                onClick={this.handleReset}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition"
              >
                <RefreshCw className="w-4 h-4" />
                Reintentar
              </button>
            </div>

            <p className="text-xs text-slate-500 text-center mt-4">
              Si el problema persiste, contacta al administrador del sistema
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
