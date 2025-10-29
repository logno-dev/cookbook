import { JSX, createEffect } from 'solid-js';
import { useAuth } from '~/lib/auth-context';
import { useNavigate } from '@solidjs/router';

interface ProtectedRouteProps {
  children: JSX.Element;
  fallback?: JSX.Element;
  redirectTo?: string;
}

export default function ProtectedRoute(props: ProtectedRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Non-blocking redirect - let the component render while checking auth
  createEffect(() => {
    if (!authLoading() && !user()) {
      navigate(props.redirectTo || "/login", { replace: true });
    }
  });

  // Show fallback during auth loading or when user is not authenticated
  // This allows for skeleton loading instead of blocking
  if (authLoading() || (!user() && !authLoading())) {
    return props.fallback || props.children;
  }

  return props.children;
}