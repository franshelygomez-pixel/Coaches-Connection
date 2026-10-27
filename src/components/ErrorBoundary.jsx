import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { tieneError: false };
  }

  static getDerivedStateFromError() {
    return { tieneError: true };
  }

  componentDidCatch(error, informacion) {
    console.error("Error no controlado en la interfaz:", error, informacion);
  }

  render() {
    if (this.state.tieneError) {
      return (
        <main className="error-global" role="alert">
          <div className="error-global__card">
            <span className="error-global__marca">Fittrainer</span>
            <h1>No se pudo mostrar esta pantalla</h1>
            <p>Recarga la aplicación. Si el problema continúa, comunícalo al administrador.</p>
            <button type="button" onClick={() => window.location.reload()}>
              Recargar aplicación
            </button>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}
