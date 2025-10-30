import { Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { MetaProvider } from "@solidjs/meta";
import { Suspense, SuspenseList } from "solid-js";
import { AuthProvider } from "./lib/auth-context";
import { BreadcrumbProvider } from "./lib/breadcrumb-context";
import { ThemeProvider } from "./lib/theme-context";
import Nav from "./components/Nav";
import ErrorNotification from "./components/Error";
import { ConfirmModalProvider } from "./components/ConfirmModal";
import { ToastProvider } from "./components/Toast";
import { SkeletonNav } from "./components/Skeletons";
import "./app.css";

export default function App() {
  return (
    <Router
      root={props => (
        <MetaProvider>
          <AuthProvider>
            <ThemeProvider>
              <BreadcrumbProvider>
                <ToastProvider>
                  <ConfirmModalProvider>
                    <SuspenseList revealOrder="forwards" tail="collapsed">
                      <Suspense fallback={<SkeletonNav />}>
                        <Nav />
                      </Suspense>
                      <Suspense>
                        {props.children}
                      </Suspense>
                    </SuspenseList>
                    <ErrorNotification />
                  </ConfirmModalProvider>
                </ToastProvider>
              </BreadcrumbProvider>
            </ThemeProvider>
          </AuthProvider>
        </MetaProvider>
      )}
    >
      <FileRoutes />
    </Router>
  );
}
