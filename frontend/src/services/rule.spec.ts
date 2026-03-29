import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RuleService } from './rule';
import api from './api';

vi.mock('./api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('RuleService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAll', () => {
    it('应该获取所有规则列表', async () => {
      const mockRules = [
        { id: 1, name: '规则 1', enabled: true },
        { id: 2, name: '规则 2', enabled: false },
      ];
      vi.mocked(api.get).mockResolvedValue({ data: mockRules });

      const result = await RuleService.getAll();

      expect(result).toEqual(mockRules);
      expect(api.get).toHaveBeenCalledWith('/rules');
    });

    it('应该处理空列表', async () => {
      vi.mocked(api.get).mockResolvedValue({ data: [] });

      const result = await RuleService.getAll();

      expect(result).toEqual([]);
      expect(api.get).toHaveBeenCalledWith('/rules');
    });

    it('应该在 API 错误时抛出异常', async () => {
      vi.mocked(api.get).mockRejectedValue(new Error('Network Error'));

      await expect(RuleService.getAll()).rejects.toThrow('Network Error');
    });
  });

  describe('getById', () => {
    it('应该根据 ID 获取规则', async () => {
      const mockRule = { id: 1, name: '规则 1', enabled: true };
      vi.mocked(api.get).mockResolvedValue({ data: mockRule });

      const result = await RuleService.getById(1);

      expect(result).toEqual(mockRule);
      expect(api.get).toHaveBeenCalledWith('/rules/1');
    });

    it('应该在规则不存在时抛出异常', async () => {
      vi.mocked(api.get).mockRejectedValue(new Error('Not Found'));

      await expect(RuleService.getById(999)).rejects.toThrow('Not Found');
    });
  });

  describe('create', () => {
    it('应该创建新规则', async () => {
      const newRule = { name: '新规则', condition: '资产 > 100 万' };
      const createdRule = { ...newRule, id: 1 };
      vi.mocked(api.post).mockResolvedValue({ data: createdRule });

      const result = await RuleService.create(newRule);

      expect(result).toEqual(createdRule);
      expect(api.post).toHaveBeenCalledWith('/rules', newRule);
    });
  });

  describe('update', () => {
    it('应该更新现有规则', async () => {
      const updatedRule = { id: 1, name: '更新后的规则', enabled: true };
      vi.mocked(api.put).mockResolvedValue({ data: updatedRule });

      const result = await RuleService.update(1, updatedRule);

      expect(result).toEqual(updatedRule);
      expect(api.put).toHaveBeenCalledWith('/rules/1', updatedRule);
    });
  });

  describe('delete', () => {
    it('应该删除规则', async () => {
      vi.mocked(api.delete).mockResolvedValue({});

      await RuleService.delete(1);

      expect(api.delete).toHaveBeenCalledWith('/rules/1');
    });
  });

  describe('activate', () => {
    it('应该激活规则', async () => {
      vi.mocked(api.post).mockResolvedValue({ data: { success: true } });

      await RuleService.activate(1);

      expect(api.post).toHaveBeenCalledWith('/rules/1/activate');
    });
  });

  describe('deactivate', () => {
    it('应该停用规则', async () => {
      vi.mocked(api.post).mockResolvedValue({ data: { success: true } });

      await RuleService.deactivate(1);

      expect(api.post).toHaveBeenCalledWith('/rules/1/deactivate');
    });
  });
});
