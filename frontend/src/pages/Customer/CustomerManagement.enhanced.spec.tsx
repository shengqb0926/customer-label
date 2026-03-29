import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CustomerManagement from './CustomerManagement';

const createQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

vi.mock('@/services/customer', () => ({
  CustomerService: {
    getAll: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    batchCreate: vi.fn(),
  },
}));

describe('CustomerManagement - 增强测试', () => {
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

  it('应该渲染客户管理页面标题', () => {
    renderComponent(<CustomerManagement />);
    expect(screen.getByText(/客户管理/i)).toBeInTheDocument();
  });

  it('应该显示搜索框', () => {
    renderComponent(<CustomerManagement />);
    const searchInput = screen.getByPlaceholderText(/请输入关键词/i);
    expect(searchInput).toBeInTheDocument();
  });

  it('应该显示筛选条件', () => {
    renderComponent(<CustomerManagement />);
    expect(screen.getByText(/城市/i)).toBeInTheDocument();
    expect(screen.getByText(/客户等级/i)).toBeInTheDocument();
  });

  it('应该显示新建客户按钮', () => {
    renderComponent(<CustomerManagement />);
    const addButton = screen.getByText(/新建客户/i);
    expect(addButton).toBeInTheDocument();
  });

  it('应该显示批量导入按钮', () => {
    renderComponent(<CustomerManagement />);
    const importButton = screen.getByText(/批量导入/i);
    expect(importButton).toBeInTheDocument();
  });

  it('应该显示分页组件', () => {
    renderComponent(<CustomerManagement />);
    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });
});
