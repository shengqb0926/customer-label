import { useState } from 'react';
import { Form, Input, Button, Card, message, Typography } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { login } from '@/services/auth';
import { useUserStore } from '@/stores/userStore';
import type { LoginRequest } from '@/types';
import './index.css';

const { Title } = Typography;

export default function Login() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const setUser = useUserStore((state) => state.setUser);
  const setToken = useUserStore((state) => state.setToken);

  const onFinish = async (values: LoginRequest) => {
    setLoading(true);
    try {
      const response = await login(values);
      
      // 保存用户信息和 token
      setUser(response.user);
      setToken(response.access_token);
      
      message.success('登录成功！');
      navigate('/');
    } catch (error: any) {
      message.error(error.message || '登录失败，请检查用户名和密码');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <Card className="login-card" hoverable>
        <div className="login-header">
          <Title level={2} style={{ margin: 0 }}>客户标签智能推荐系统</Title>
          <p style={{ color: '#999', marginTop: 8 }}>请输入账号密码登录</p>
        </div>
        
        <Form
          name="login"
          initialValues={{ remember: true }}
          onFinish={onFinish}
          autoComplete="off"
          size="large"
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input 
              prefix={<UserOutlined />} 
              placeholder="用户名"
              autoComplete="username"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="密码"
              autoComplete="current-password"
            />
          </Form.Item>

          <Form.Item>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={loading}
              block
              size="large"
            >
              登录
            </Button>
          </Form.Item>
          
          <div className="login-tips">
            <p style={{ fontSize: 12, color: '#999', margin: 0 }}>默认账号：</p>
            <p style={{ fontSize: 12, color: '#666', margin: '4px 0' }}>管理员：admin / admin123</p>
            <p style={{ fontSize: 12, color: '#666', margin: '4px 0' }}>分析师：analyst / analyst123</p>
            <p style={{ fontSize: 12, color: '#666', margin: '4px 0' }}>普通用户：user / user123</p>
          </div>
        </Form>
      </Card>
    </div>
  );
}
