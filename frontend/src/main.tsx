import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { useUserStore } from '@/stores/userStore'

// 在应用启动时恢复用户状态
useUserStore.getState().restoreState()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
