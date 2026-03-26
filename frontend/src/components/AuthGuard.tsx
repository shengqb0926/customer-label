import { Navigate } from 'react-router-dom';
import { useUserStore } from '@/stores/userStore';
import type { UserRole } from '@/types';

interface AuthGuardProps {
  children: React.ReactNode;
  roles?: UserRole[];
}

export function AuthGuard({ children, roles }: AuthGuardProps) {
  const { user, hasRole, restoreState } = useUserStore();

  // 尝试从 localStorage 恢复状态
  if (!user) {
    const restored = restoreState();
    if (!restored) {
      return <Navigate to="/login" replace />;
    }
  }

  // 需要特定角色权限
  if (roles && !hasRole(roles)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
