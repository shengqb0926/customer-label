import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CustomerService } from './customer';
import api from './api';

vi.mock('./api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('CustomerService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAll', () => {
    it('应该获取客户列表（带分页）', async () => {
      const mockResponse = {
        data: [{ id: 1, name: '客户 1' }],
        total: 100,
        page: 1,
        limit: 20,
      };
      vi.mocked(api.get).mockResolvedValue({ data: mockResponse });

      const result = await CustomerService.getAll({ page: 1, limit: 20 });

      expect(result).toEqual(mockResponse);
      expect(api.get).toHaveBeenCalledWith('/customers', {
        params: { page: 1, limit: 20 },
      });
    });

    it('应该支持关键词搜索', async () => {
      vi.mocked(api.get).mockResolvedValue({ data: { data: [], total: 0 } });

      await CustomerService.getAll({ keyword: '测试' });

      expect(api.get).toHaveBeenCalledWith('/customers', {
        params: { keyword: '测试' },
      });
    });
  });

  describe('getById', () => {
    it('应该根据 ID 获取客户详情', async () => {
      const mockCustomer = { id: 1, name: '客户 1', totalAssets: 500000 };
      vi.mocked(api.get).mockResolvedValue({ data: mockCustomer });

      const result = await CustomerService.getById(1);

      expect(result).toEqual(mockCustomer);
      expect(api.get).toHaveBeenCalledWith('/customers/1');
    });
  });

  describe('create', () => {
    it('应该创建新客户', async () => {
      const newCustomer = { name: '新客户', totalAssets: 100000 };
      const created = { ...newCustomer, id: 1 };
      vi.mocked(api.post).mockResolvedValue({ data: created });

      const result = await CustomerService.create(newCustomer);

      expect(result).toEqual(created);
      expect(api.post).toHaveBeenCalledWith('/customers', newCustomer);
    });
  });

  describe('update', () => {
    it('应该更新客户信息', async () => {
      const updated = { id: 1, name: '更新后的名字', totalAssets: 600000 };
      vi.mocked(api.put).mockResolvedValue({ data: updated });

      const result = await CustomerService.update(1, updated);

      expect(result).toEqual(updated);
      expect(api.put).toHaveBeenCalledWith('/customers/1', updated);
    });
  });

  describe('delete', () => {
    it('应该删除客户', async () => {
      vi.mocked(api.delete).mockResolvedValue({});

      await CustomerService.delete(1);

      expect(api.delete).toHaveBeenCalledWith('/customers/1');
    });
  });

  describe('batchCreate', () => {
    it('应该批量创建客户', async () => {
      const customers = [
        { name: '客户 1', totalAssets: 100000 },
        { name: '客户 2', totalAssets: 200000 },
      ];
      vi.mocked(api.post).mockResolvedValue({ data: { success: 2, failed: 0 } });

      const result = await CustomerService.batchCreate(customers);

      expect(result.success).toBe(2);
      expect(api.post).toHaveBeenCalledWith('/customers/batch', customers);
    });
  });
});
