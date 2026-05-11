import { Component } from "react";

export default class ErrorBoundary extends Component {
  state = { err: null };

  static getDerivedStateFromError(err) {
    return { err };
  }

  componentDidCatch(err, info) {
    console.error(err, info);
  }

  render() {
    if (this.state.err) {
      return (
        <div className="shell err-screen">
          <h1>Lỗi</h1>
          <p>{String(this.state.err.message || this.state.err)}</p>
          <button
            type="button"
            className="btn p"
            onClick={() => window.location.reload()}
          >
            Tải lại
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
