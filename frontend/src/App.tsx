import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import UserManagement from '@/pages/UserManagement';
import BasicLayout from '@/layouts/BasicLayout';
import { AuthGuard } from '@/components/AuthGuard';

// 占位页面 - 后续会被实际页面替换
const Recommendations = () => <div>推荐结果页面</div>;
const Rules = () => <div>规则管理页面</div>;
const Clustering = () => <div>聚类配置页面</div>;

function App() {
  return (
    <ConfigProvider locale={zhCN}>
      <BrowserRouter>
        <Routes>
          {/* 登录页 */}
          <Route path="/login" element={<Login />} />
          
          {/* 主应用路由 */}
          <Route
            path="/"
            element={
              <AuthGuard>
                <BasicLayout />
              </AuthGuard>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="recommendations" element={<Recommendations />} />
            
            {/* 需要分析师或管理员权限 */}
            <Route
              path="rules"
              element={
                <AuthGuard roles={['admin', 'analyst']}>
                  <Rules />
                </AuthGuard>
              }
            />
            <Route
              path="clustering"
              element={
                <AuthGuard roles={['admin', 'analyst']}>
                  <Clustering />
                </AuthGuard>
              }
            />
            
            {/* 仅管理员权限 */}
            <Route
              path="users"
              element={
                <AuthGuard roles={['admin']}>
                  <UserManagement />
                </AuthGuard>
              }
            />
          </Route>
          
          {/* 未匹配路由重定向 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  );
}

export default App;
