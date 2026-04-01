import { CreateTagRecommendationsTable1711507200000 } from './1711507200000-CreateTagRecommendationsTable';

describe('CreateTagRecommendationsTable Migration', () => {
  let migration: CreateTagRecommendationsTable1711507200000;

  beforeEach(() => {
    migration = new CreateTagRecommendationsTable1711507200000();
  });

  describe('基本结构验证', () => {
    it('应该定义 up 方法', () => {
      expect(migration.up).toBeDefined();
    });

    it('应该定义 down 方法', () => {
      expect(migration.down).toBeDefined();
    });

    it('up 方法应该返回 Promise', async () => {
      const mockQueryRunner = {
        createTable: jest.fn().mockResolvedValue(undefined),
        createIndex: jest.fn().mockResolvedValue(undefined),
      };
      
      await expect(migration.up(mockQueryRunner as any)).resolves.toBeUndefined();
    });

    it('down 方法应该返回 Promise', async () => {
      const mockQueryRunner = { dropTable: jest.fn().mockResolvedValue(undefined) };
      await expect(migration.down(mockQueryRunner as any)).resolves.toBeUndefined();
    });
  });

  describe('up 方法 - 表创建逻辑', () => {
    it('应该调用 createTable 方法创建 tag_recommendations 表', async () => {
      const createTableMock = jest.fn().mockResolvedValue(undefined);
      const mockQueryRunner = {
        createTable: createTableMock,
        createIndex: jest.fn().mockResolvedValue(undefined),
      };
      
      await migration.up(mockQueryRunner as any);

      expect(createTableMock).toHaveBeenCalledTimes(1);
      const tableArg = createTableMock.mock.calls[0][0];
      expect(tableArg.name).toBe('tag_recommendations');
    });

    it('应该定义 id 主键', async () => {
      const createTableMock = jest.fn().mockResolvedValue(undefined);
      const mockQueryRunner = {
        createTable: createTableMock,
        createIndex: jest.fn().mockResolvedValue(undefined),
      };
      
      await migration.up(mockQueryRunner as any);

      const tableArg = createTableMock.mock.calls[0][0];
      const idColumn = tableArg.columns.find((col: any) => col.name === 'id');
      
      expect(idColumn).toBeDefined();
      expect(idColumn.type).toBe('bigint');
      expect(idColumn.isPrimary).toBe(true);
      expect(idColumn.isGenerated).toBe(true);
    });

    it('应该定义 customer_id 字段', async () => {
      const createTableMock = jest.fn().mockResolvedValue(undefined);
      const mockQueryRunner = {
        createTable: createTableMock,
        createIndex: jest.fn().mockResolvedValue(undefined),
      };
      
      await migration.up(mockQueryRunner as any);

      const tableArg = createTableMock.mock.calls[0][0];
      const customerIdColumn = tableArg.columns.find((col: any) => col.name === 'customer_id');
      
      expect(customerIdColumn).toBeDefined();
      expect(customerIdColumn.type).toBe('integer');
      expect(customerIdColumn.isNullable).toBe(false);
    });

    it('应该定义 tag_name 字段', async () => {
      const createTableMock = jest.fn().mockResolvedValue(undefined);
      const mockQueryRunner = {
        createTable: createTableMock,
        createIndex: jest.fn().mockResolvedValue(undefined),
      };
      
      await migration.up(mockQueryRunner as any);

      const tableArg = createTableMock.mock.calls[0][0];
      const tagNameColumn = tableArg.columns.find((col: any) => col.name === 'tag_name');
      
      expect(tagNameColumn).toBeDefined();
      expect(tagNameColumn.type).toBe('varchar');
      expect(tagNameColumn.length).toBe('100');
      expect(tagNameColumn.isNullable).toBe(false);
    });

    it('应该定义 confidence 字段（带精度）', async () => {
      const createTableMock = jest.fn().mockResolvedValue(undefined);
      const mockQueryRunner = {
        createTable: createTableMock,
        createIndex: jest.fn().mockResolvedValue(undefined),
      };
      
      await migration.up(mockQueryRunner as any);

      const tableArg = createTableMock.mock.calls[0][0];
      const confidenceColumn = tableArg.columns.find((col: any) => col.name === 'confidence');
      
      expect(confidenceColumn).toBeDefined();
      expect(confidenceColumn.type).toBe('decimal');
      expect(confidenceColumn.precision).toBe(5);
      expect(confidenceColumn.scale).toBe(4);
    });

    it('应该定义 source 字段', async () => {
      const createTableMock = jest.fn().mockResolvedValue(undefined);
      const mockQueryRunner = {
        createTable: createTableMock,
        createIndex: jest.fn().mockResolvedValue(undefined),
      };
      
      await migration.up(mockQueryRunner as any);

      const tableArg = createTableMock.mock.calls[0][0];
      const sourceColumn = tableArg.columns.find((col: any) => col.name === 'source');
      
      expect(sourceColumn).toBeDefined();
      expect(sourceColumn.type).toBe('varchar');
      expect(sourceColumn.length).toBe('20');
    });

    it('应该定义 is_accepted 布尔字段', async () => {
      const createTableMock = jest.fn().mockResolvedValue(undefined);
      const mockQueryRunner = {
        createTable: createTableMock,
        createIndex: jest.fn().mockResolvedValue(undefined),
      };
      
      await migration.up(mockQueryRunner as any);

      const tableArg = createTableMock.mock.calls[0][0];
      const isAcceptedColumn = tableArg.columns.find((col: any) => col.name === 'is_accepted');
      
      expect(isAcceptedColumn).toBeDefined();
      expect(isAcceptedColumn.type).toBe('boolean');
      expect(isAcceptedColumn.default).toBe(false);
    });

    it('应该定义 created_at 和 updated_at 时间戳', async () => {
      const createTableMock = jest.fn().mockResolvedValue(undefined);
      const mockQueryRunner = {
        createTable: createTableMock,
        createIndex: jest.fn().mockResolvedValue(undefined),
      };
      
      await migration.up(mockQueryRunner as any);

      const tableArg = createTableMock.mock.calls[0][0];
      const createdAtColumn = tableArg.columns.find((col: any) => col.name === 'created_at');
      const updatedAtColumn = tableArg.columns.find((col: any) => col.name === 'updated_at');
      
      expect(createdAtColumn).toBeDefined();
      expect(createdAtColumn.default).toBe('CURRENT_TIMESTAMP');
      expect(updatedAtColumn).toBeDefined();
      expect(updatedAtColumn.default).toBe('CURRENT_TIMESTAMP');
    });

    it('应该创建索引', async () => {
      const createIndexMock = jest.fn().mockResolvedValue(undefined);
      await migration.up({ createTable: jest.fn(), createIndex: createIndexMock } as any);

      expect(createIndexMock).toHaveBeenCalled();
    });
  });

  describe('down 方法 - 表删除逻辑', () => {
    it('应该删除 tag_recommendations 表', async () => {
      const dropTableMock = jest.fn().mockResolvedValue(undefined);
      await migration.down({ dropTable: dropTableMock } as any);

      expect(dropTableMock).toHaveBeenCalledWith('tag_recommendations');
    });
  });
});
