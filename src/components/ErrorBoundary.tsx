import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "./ui";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("Game error", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="grid min-h-dvh place-items-center bg-ink-950 px-4 text-center text-lilac-200">
          <div className="card max-w-sm p-6">
            <p className="text-3xl" aria-hidden>
              🛡️
            </p>
            <h1 className="mt-2 text-xl font-bold text-white">Có gì đó không ổn</h1>
            <p className="mt-2 text-sm text-lilac-300">
              Game gặp lỗi ngoài ý muốn. Tiến trình đã lưu vẫn còn, hãy tải lại trang để tiếp tục.
            </p>
            <Button className="mt-4 w-full" onClick={() => window.location.reload()}>
              Tải lại trang
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
