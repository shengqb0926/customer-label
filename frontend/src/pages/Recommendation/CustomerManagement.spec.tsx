import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CustomerManagement } from './CustomerManagement';

// Mock Ant Design components
vi.mock('antd', () => ({
  Table: ({ dataSource, columns, loading, pagination }: any) => (
    <div data-testid="table">
      {loading ? 'Loading...' : `Table with ${dataSource?.length || 0} items`}
    </div>
  ),
  Button: ({ children, onClick, type }: any) => (
    <button data-testid={`button-${type || 'default'}`} onClick={onClick}>
      {children}
    </button>
  ),
  Input: ({ value, onChange, placeholder }: any) => (
    <input
      data-testid="input"
      value={value || ''}
      onChange={onChange}
      placeholder={placeholder}
    />
  ),
  Select: ({ children, value, onChange }: any) => (
    <select data-testid="select" value={value} onChange={onChange}>
      {children}
    </select>
  ),
  Option: ({ children, value }: any) => (
    <option value={value}>{children}</option>
  ),
  Modal: ({ title, open, onOk, onCancel, children }: any) => (
    open && (
      <div data-testid="modal">
        <h2>{title}</h2>
        {children}
        <button onClick={onOk}>OK</button>
        <button onClick={onCancel}>Cancel</button>
      </div>
    )
  ),
  Form: ({ children }: any) => <form>{children}</form>,
  FormItem: ({ label, children }: any) => (
    <div>
      <label>{label}</label>
      {children}
    </div>
  ),
  message: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
  Spin: ({ spinning, children }: any) => (
    <div data-testid="spin">{spinning ? 'Loading...' : children}</div>
  ),
}));

// Mock services
const mockFetchCustomers = vi.fn();
const mockCreateCustomer = vi.fn();
const mockUpdateCustomer = vi.fn();
const mockDeleteCustomer = vi.fn();

vi.mock('@/services/customer', () => ({
  customerApi: {
    getCustomers: (...args: any[]) => mockFetchCustomers(...args),
    createCustomer: (...args: any[]) => mockCreateCustomer(...args),
    updateCustomer: (...args: any[]) => mockUpdateCustomer(...args),
    deleteCustomer: (...args: any[]) => mockDeleteCustomer(...args),
  },
}));

describe('CustomerManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchCustomers.mockResolvedValue({
      data: [],
      total: 0,
    });
  });

  it('should render component', () => {
    render(
      <MemoryRouter>
        <CustomerManagement />
      </MemoryRouter>
    );

    expect(screen.getByTestId('table')).toBeInTheDocument();
  });

  it('should fetch customers on mount', async () => {
    mockFetchCustomers.mockResolvedValue({
      data: [
        { id: 1, name: '客户 1', email: 'c1@example.com' },
        { id: 2, name: '客户 2', email: 'c2@example.com' },
      ],
      total: 2,
    });

    render(
      <MemoryRouter>
        <CustomerManagement />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(mockFetchCustomers).toHaveBeenCalled();
    });
  });

  it('should handle search input change', async () => {
    render(
      <MemoryRouter>
        <CustomerManagement />
      </MemoryRouter>
    );

    const input = screen.getByTestId('input');
    fireEvent.change(input, { target: { value: '测试' } });

    expect(input).toHaveValue('测试');
  });

  it('should show loading state when fetching', async () => {
    mockFetchCustomers.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    );

    render(
      <MemoryRouter>
        <CustomerManagement />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('spin')).toHaveTextContent('Loading...');
    });
  });

  it('should display customer count in table', async () => {
    mockFetchCustomers.mockResolvedValue({
      data: Array(5).fill({ id: 1, name: '客户' }),
      total: 5,
    });

    render(
      <MemoryRouter>
        <CustomerManagement />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('table')).toHaveTextContent('5 items');
    });
  });
});
