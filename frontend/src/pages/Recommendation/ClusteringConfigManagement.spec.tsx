import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ClusteringConfigManagement from './ClusteringConfigManagement';

const createQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

vi.mock('@/services/clustering', () => ({
  ClusteringService: {
    getConfigs: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    activate: vi.fn(),
    deactivate: vi.fn(),
    run: vi.fn(),
  },
}));

describe('ClusteringConfigManagement', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createQueryClient();
  });

  const renderComponent = (ui: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>{ui}</BrowserRouter>
      </QueryClientProvider>
    );
  };

  it('应该渲染聚类配置管理页面标题', () => {
    renderComponent(<ClusteringConfigManagement />);
    expect(screen.getByText(/聚类配置管理/i)).toBeInTheDocument();
  });

  it('应该显示加载状态', () => {
    renderComponent(<ClusteringConfigManagement />);
    expect(screen.getByText(/加载中/i)).toBeInTheDocument();
  });

  it('应该显示配置列表表格', () => {
    renderComponent(<ClusteringConfigManagement />);
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('应该显示新建配置按钮', () => {
    renderComponent(<ClusteringConfigManagement />);
    const addButton = screen.getByText(/新建配置/i);
    expect(addButton).toBeInTheDocument();
  });

  it('应该显示批量操作按钮', () => {
    renderComponent(<ClusteringConfigManagement />);
    expect(screen.getByText(/批量运行/i)).toBeInTheDocument();
    expect(screen.getByText(/批量激活/i)).toBeInTheDocument();
    expect(screen.getByText(/批量停用/i)).toBeInTheDocument();
    expect(screen.getByText(/批量删除/i)).toBeInTheDocument();
  });
});
