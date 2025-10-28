import { Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { MetaProvider } from "@solidjs/meta";
import { Suspense } from "solid-js";
import { AuthProvider } from "./lib/auth-context";
import Nav from "./components/Nav";
import ErrorNotification from "./components/Error";
import { ConfirmModalProvider } from "./components/ConfirmModal";
import { ToastProvider } from "./components/Toast";
import "./app.css";

export default function App() {
  return (
    <Router
      root={props => (
        <MetaProvider>
          <AuthProvider>
            <ToastProvider>
              <ConfirmModalProvider>
                <Suspense>
                  <Nav />
                  {props.children}
                  <ErrorNotification />
                </Suspense>
              </ConfirmModalProvider>
            </ToastProvider>
          </AuthProvider>
        </MetaProvider>
      )}
    >
      <FileRoutes />
    </Router>
  );
}
