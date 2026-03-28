import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import UserManagement from '@/pages/UserManagement';
import BasicLayout from '@/layouts/BasicLayout';
import { AuthGuard } from '@/components/AuthGuard';
import RuleList from '@/pages/RuleManagement/RuleList';
import RuleTester from '@/pages/RuleManagement/RuleTester';
import RecommendationList from '@/pages/Recommendation/RecommendationList';

// 占位页面 - 后续完善
const Clustering = () => <div>聚类配置页面（开发中）</div>;

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
            
            {/* 推荐结果管理 */}
            <Route path="recommendations" element={<RecommendationList />} />
            
            {/* 规则管理 - 需要分析师或管理员权限 */}
            <Route
              path="rules"
              element={
                <AuthGuard roles={['admin', 'analyst']}>
                  <RuleList />
                </AuthGuard>
              }
            />
            
            {/* 规则测试工具 */}
            <Route
              path="rules/test"
              element={
                <AuthGuard roles={['admin', 'analyst']}>
                  <RuleTester />
                </AuthGuard>
              }
            />
            
            {/* 聚类配置 - 需要分析师或管理员权限 */}
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
