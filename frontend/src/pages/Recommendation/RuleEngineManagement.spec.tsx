import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import RuleEngineManagement from './RuleEngineManagement';

const createQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

vi.mock('@/services/rule', () => ({
  RuleService: {
    getAll: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    activate: vi.fn(),
    deactivate: vi.fn(),
    test: vi.fn(),
  },
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

describe('RuleEngineManagement', () => {
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

  it('应该渲染规则管理页面标题', () => {
    renderComponent(<RuleEngineManagement />);
    expect(screen.getByText(/规则引擎管理/i)).toBeInTheDocument();
  });

  it('应该显示加载状态', () => {
    renderComponent(<RuleEngineManagement />);
    expect(screen.getByText(/加载中/i)).toBeInTheDocument();
  });

  it('应该显示规则列表表格', () => {
    renderComponent(<RuleEngineManagement />);
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('应该显示新建规则按钮', () => {
    renderComponent(<RuleEngineManagement />);
    const addButton = screen.getByText(/新建规则/i);
    expect(addButton).toBeInTheDocument();
  });

  it('应该显示批量操作按钮', () => {
    renderComponent(<RuleEngineManagement />);
    expect(screen.getByText(/批量激活/i)).toBeInTheDocument();
    expect(screen.getByText(/批量停用/i)).toBeInTheDocument();
    expect(screen.getByText(/批量删除/i)).toBeInTheDocument();
  });
});
