import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import UserManagement from '@/pages/UserManagement';
import BasicLayout from '@/layouts/BasicLayout';
import { AuthGuard } from '@/components/AuthGuard';
import RuleManagement from '@/pages/RuleManagement';
import RuleList from '@/pages/RuleManagement/RuleList';
import RuleTester from '@/pages/RuleManagement/RuleTester';
import RecommendationList from '@/pages/Recommendation/RecommendationList';
import ClusteringConfigManagement from '@/pages/Recommendation/ClusteringConfigManagement';
import AssociationConfigManagement from '@/pages/Recommendation/AssociationConfigManagement';
import EngineExecutionMonitor from '@/pages/Recommendation/EngineExecutionMonitor';
import CustomerManagement from '@/pages/Customer';
import { UserRole } from '@/types';

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
            
            {/* 引擎执行监控 - 所有登录用户可访问 */}
            <Route
              path="engine-monitor"
              element={
                <AuthGuard>
                  <EngineExecutionMonitor />
                </AuthGuard>
              }
            />
            
            {/* 规则管理 - 需要分析师或管理员权限 */}
            <Route
              path="rules"
              element={
                <AuthGuard roles={[UserRole.ADMIN, UserRole.ANALYST]}>
                  <RuleManagement />
                </AuthGuard>
              }
            />
            
            {/* 规则列表（兼容旧路由） */}
            <Route
              path="rules/list"
              element={
                <AuthGuard roles={[UserRole.ADMIN, UserRole.ANALYST]}>
                  <RuleList />
                </AuthGuard>
              }
            />
            
            {/* 规则测试工具（独立路由，兼容旧版） */}
            <Route
              path="rules/test"
              element={
                <AuthGuard roles={[UserRole.ADMIN, UserRole.ANALYST]}>
                  <RuleTester />
                </AuthGuard>
              }
            />
            
            {/* 聚类配置管理 - 需要分析师或管理员权限 */}
            <Route
              path="clustering-configs"
              element={
                <AuthGuard roles={[UserRole.ADMIN, UserRole.ANALYST]}>
                  <ClusteringConfigManagement />
                </AuthGuard>
              }
            />
            
            {/* 关联规则配置管理 - 需要分析师或管理员权限 */}
            <Route
              path="association-configs"
              element={
                <AuthGuard roles={[UserRole.ADMIN, UserRole.ANALYST}>
                  <AssociationConfigManagement />
                </AuthGuard>
              }
            />
            
            {/* 客户管理 - 所有登录用户可访问 */}
            <Route
              path="customers"
              element={
                <AuthGuard>
                  <CustomerManagement />
                </AuthGuard>
              }
            />
            
            {/* 仅管理员权限 */}
            <Route
              path="users"
              element={
                <AuthGuard roles={[UserRole.ADMIN]}>
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