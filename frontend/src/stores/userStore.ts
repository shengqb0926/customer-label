import { create } from 'zustand';
import { UserRole } from '@/types';
import type { User } from '@/types';

interface UserState {
  user: User | null;
  token: string | null;
  setUser: (user: User) => void;
  setToken: (token: string) => void;
  logout: () => void;
  hasRole: (role: UserRole | UserRole[]) => boolean;
  isAdmin: boolean;
  isAnalyst: boolean;
  restoreState: () => boolean;
}

export const useUserStore = create<UserState>((set, get) => ({
  user: null,
  token: null,
  
  setUser: (user) => {
    localStorage.setItem('user_info', JSON.stringify(user));
    set({ user });
  },
  
  setToken: (token) => {
    localStorage.setItem('access_token', token);
    set({ token });
  },
  
  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_info');
    set({ user: null, token: null });
  },
  
  hasRole: (role) => {
    const { user } = get();
    if (!user) return false;
    
    const roles = Array.isArray(role) ? role : [role];
    return roles.some(r => user.roles.includes(r));
  },
  
  get isAdmin() {
    return get().hasRole(UserRole.ADMIN);
  },
  
  get isAnalyst() {
    return get().hasRole(UserRole.ANALYST);
  },
  
  // 添加恢复状态的方法
  restoreState: () => {
    const token = localStorage.getItem('access_token');
    const userInfo = localStorage.getItem('user_info');
    if (token && userInfo) {
      try {
        const user = JSON.parse(userInfo);
        set({ token, user });
        return true;
      } catch (e) {
        console.error('Failed to restore user state:', e);
      }
    }
    return false;
  },
}));