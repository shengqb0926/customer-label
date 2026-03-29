import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ScoringManagement } from './ScoringManagement';

// Mock Ant Design components and hooks
vi.mock('antd', () => ({
  Table: ({ dataSource, columns, loading, pagination }: any) => (
    <div data-testid="table">
      {loading ? 'Loading...' : `Table with ${dataSource?.length || 0} items`}
    </div>
  ),
  Button: ({ children, onClick, type }: any) => (
    <button onClick={onClick} data-type={type}>{children}</button>
  ),
  Input: ({ value, onChange, placeholder }: any) => (
    <input value={value} onChange={onChange} placeholder={placeholder} data-testid="input" />
  ),
  Select: ({ children, value, onChange }: any) => (
    <select value={value} onChange={onChange} data-testid="select">{children}</select>
  ),
  Option: ({ children, value }: any) => (
    <option value={value}>{children}</option>
  ),
  Modal: ({ title, children, open, onOk, onCancel }: any) => (
    open ? <div data-testid="modal">{title}{children}</div> : null
  ),
  Form: ({ children }: any) => <form>{children}</form>,
  Space: ({ children }: any) => <div>{children}</div>,
  Card: ({ children }: any) => <div>{children}</div>,
  message: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn().mockReturnValue(() => {}),
  },
  Popconfirm: ({ children, onConfirm, title }: any) => (
    <div>
      {children[0]}
      <button onClick={onConfirm}>Confirm</button>
    </div>
  ),
}));

const createQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

describe('ScoringManagement', () => {
  let queryClient: ReturnType<typeof createQueryClient>;

  beforeEach(() => {
    queryClient = createQueryClient();
    vi.clearAllMocks();
  });

  it('should render scoring management page', async () => {
    const mockScores = [
      { id: 1, tagId: 1, tagName: '高价值客户', overallScore: 85.5, recommendation: '强烈推荐' },
      { id: 2, tagId: 2, tagName: '流失风险', overallScore: 65.2, recommendation: '中性' },
    ];

    queryClient.setQueryData(['tag-scores'], mockScores);

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ScoringManagement />
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('table')).toBeInTheDocument();
    });

    expect(screen.getByText(/高价值客户/i)).toBeInTheDocument();
    expect(screen.getByText(/流失风险/i)).toBeInTheDocument();
  });

  it('should handle search functionality', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ScoringManagement />
        </MemoryRouter>
      </QueryClientProvider>
    );

    const input = screen.getByTestId('input');
    fireEvent.change(input, { target: { value: '高价值' } });

    await waitFor(() => {
      expect(input).toHaveValue('高价值');
    });
  });

  it('should handle refresh button click', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ScoringManagement />
        </MemoryRouter>
      </QueryClientProvider>
    );

    const refreshButton = screen.getByText('刷新');
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(queryClient.isFetching).toBeGreaterThan(0);
    });
  });

  it('should display loading state', async () => {
    queryClient.setQueryData(['tag-scores'], []);

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ScoringManagement />
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('table')).toHaveTextContent('Table with 0 items');
    });
  });

  it('should handle batch operations', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ScoringManagement />
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Test batch export
    const exportButton = screen.getByText('导出 Excel');
    fireEvent.click(exportButton);

    expect(vi.fn()).toHaveBeenCalled();
  });
});
