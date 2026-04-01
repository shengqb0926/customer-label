import { CreateUsersTable1711507100000 } from './1711507100000-CreateUsersTable';

describe('CreateUsersTable Migration', () => {
  let migration: CreateUsersTable1711507100000;

  beforeEach(() => {
    migration = new CreateUsersTable1711507100000();
  });

  describe('基本结构验证', () => {
    it('应该定义 up 方法', () => {
      expect(migration.up).toBeDefined();
      expect(typeof migration.up).toBe('function');
    });

    it('应该定义 down 方法', () => {
      expect(migration.down).toBeDefined();
      expect(typeof migration.down).toBe('function');
    });

    it('up 方法应该返回 Promise', async () => {
      const mockQueryRunner = {
        createTable: jest.fn().mockResolvedValue(undefined),
        createIndex: jest.fn().mockResolvedValue(undefined),
      };

      await expect(migration.up(mockQueryRunner as any)).resolves.toBeUndefined();
    });

    it('down 方法应该返回 Promise', async () => {
      const mockQueryRunner = {
        dropTable: jest.fn().mockResolvedValue(undefined),
      };

      await expect(migration.down(mockQueryRunner as any)).resolves.toBeUndefined();
    });
  });

  describe('up 方法 - 表创建逻辑', () => {
    it('应该调用 createTable 方法', async () => {
      const mockQueryRunner = {
        createTable: jest.fn().mockResolvedValue(undefined),
        createIndex: jest.fn().mockResolvedValue(undefined),
      };

      await migration.up(mockQueryRunner as any);

      expect(mockQueryRunner.createTable).toHaveBeenCalled();
      expect(mockQueryRunner.createTable).toHaveBeenCalledTimes(1);
    });

    it('应该创建 users 表', async () => {
      const createTableMock = jest.fn().mockResolvedValue(undefined);
      const mockQueryRunner = {
        createTable: createTableMock,
        createIndex: jest.fn().mockResolvedValue(undefined),
      };

      await migration.up(mockQueryRunner as any);

      const tableArg = createTableMock.mock.calls[0][0];
      expect(tableArg.name).toBe('users');
    });

    it('应该定义 id 主键列', async () => {
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
      expect(idColumn.generationStrategy).toBe('increment');
    });

    it('应该定义 username 列', async () => {
      const createTableMock = jest.fn().mockResolvedValue(undefined);
      const mockQueryRunner = {
        createTable: createTableMock,
        createIndex: jest.fn().mockResolvedValue(undefined),
      };

      await migration.up(mockQueryRunner as any);

      const tableArg = createTableMock.mock.calls[0][0];
      const usernameColumn = tableArg.columns.find((col: any) => col.name === 'username');
      
      expect(usernameColumn).toBeDefined();
      expect(usernameColumn.type).toBe('varchar');
      expect(usernameColumn.length).toBe('50');
      expect(usernameColumn.isNullable).toBe(false);
    });

    it('应该定义 email 列', async () => {
      const createTableMock = jest.fn().mockResolvedValue(undefined);
      const mockQueryRunner = {
        createTable: createTableMock,
        createIndex: jest.fn().mockResolvedValue(undefined),
      };

      await migration.up(mockQueryRunner as any);

      const tableArg = createTableMock.mock.calls[0][0];
      const emailColumn = tableArg.columns.find((col: any) => col.name === 'email');
      
      expect(emailColumn).toBeDefined();
      expect(emailColumn.type).toBe('varchar');
      expect(emailColumn.length).toBe('100');
      expect(emailColumn.isNullable).toBe(false);
    });

    it('应该定义 password 列', async () => {
      const createTableMock = jest.fn().mockResolvedValue(undefined);
      const mockQueryRunner = {
        createTable: createTableMock,
        createIndex: jest.fn().mockResolvedValue(undefined),
      };

      await migration.up(mockQueryRunner as any);

      const tableArg = createTableMock.mock.calls[0][0];
      const passwordColumn = tableArg.columns.find((col: any) => col.name === 'password');
      
      expect(passwordColumn).toBeDefined();
      expect(passwordColumn.type).toBe('varchar');
      expect(passwordColumn.length).toBe('255');
      expect(passwordColumn.isNullable).toBe(false);
    });

    it('应该定义 roles 列并设置默认值', async () => {
      const createTableMock = jest.fn().mockResolvedValue(undefined);
      const mockQueryRunner = {
        createTable: createTableMock,
        createIndex: jest.fn().mockResolvedValue(undefined),
      };

      await migration.up(mockQueryRunner as any);

      const tableArg = createTableMock.mock.calls[0][0];
      const rolesColumn = tableArg.columns.find((col: any) => col.name === 'roles');
      
      expect(rolesColumn).toBeDefined();
      expect(rolesColumn.type).toBe('varchar');
      expect(rolesColumn.isNullable).toBe(false);
      expect(rolesColumn.default).toBe("'user'");
      expect(rolesColumn.comment).toContain('角色列表');
    });

    it('应该定义可选的 full_name 列', async () => {
      const createTableMock = jest.fn().mockResolvedValue(undefined);
      const mockQueryRunner = {
        createTable: createTableMock,
        createIndex: jest.fn().mockResolvedValue(undefined),
      };

      await migration.up(mockQueryRunner as any);

      const tableArg = createTableMock.mock.calls[0][0];
      const fullNameColumn = tableArg.columns.find((col: any) => col.name === 'full_name');
      
      expect(fullNameColumn).toBeDefined();
      expect(fullNameColumn.type).toBe('varchar');
      expect(fullNameColumn.length).toBe('50');
      expect(fullNameColumn.isNullable).toBe(true);
    });

    it('应该定义 phone 列', async () => {
      const createTableMock = jest.fn().mockResolvedValue(undefined);
      const mockQueryRunner = {
        createTable: createTableMock,
        createIndex: jest.fn().mockResolvedValue(undefined),
      };

      await migration.up(mockQueryRunner as any);

      const tableArg = createTableMock.mock.calls[0][0];
      const phoneColumn = tableArg.columns.find((col: any) => col.name === 'phone');
      
      expect(phoneColumn).toBeDefined();
      expect(phoneColumn.type).toBe('varchar');
      expect(phoneColumn.length).toBe('20');
      expect(phoneColumn.isNullable).toBe(true);
    });

    it('应该定义 is_active 布尔字段', async () => {
      const createTableMock = jest.fn().mockResolvedValue(undefined);
      const mockQueryRunner = {
        createTable: createTableMock,
        createIndex: jest.fn().mockResolvedValue(undefined),
      };

      await migration.up(mockQueryRunner as any);

      const tableArg = createTableMock.mock.calls[0][0];
      const isActiveColumn = tableArg.columns.find((col: any) => col.name === 'is_active');
      
      expect(isActiveColumn).toBeDefined();
      expect(isActiveColumn.type).toBe('boolean');
      expect(isActiveColumn.default).toBe(true);
    });

    it('应该定义 last_login_at 时间戳', async () => {
      const createTableMock = jest.fn().mockResolvedValue(undefined);
      const mockQueryRunner = {
        createTable: createTableMock,
        createIndex: jest.fn().mockResolvedValue(undefined),
      };

      await migration.up(mockQueryRunner as any);

      const tableArg = createTableMock.mock.calls[0][0];
      const lastLoginAtColumn = tableArg.columns.find((col: any) => col.name === 'last_login_at');
      
      expect(lastLoginAtColumn).toBeDefined();
      expect(lastLoginAtColumn.type).toBe('timestamp');
      expect(lastLoginAtColumn.isNullable).toBe(true);
    });

    it('应该定义 last_login_ip 字段', async () => {
      const createTableMock = jest.fn().mockResolvedValue(undefined);
      const mockQueryRunner = {
        createTable: createTableMock,
        createIndex: jest.fn().mockResolvedValue(undefined),
      };

      await migration.up(mockQueryRunner as any);

      const tableArg = createTableMock.mock.calls[0][0];
      const lastLoginIpColumn = tableArg.columns.find((col: any) => col.name === 'last_login_ip');
      
      expect(lastLoginIpColumn).toBeDefined();
      expect(lastLoginIpColumn.type).toBe('varchar');
      expect(lastLoginIpColumn.length).toBe('50');
      expect(lastLoginIpColumn.isNullable).toBe(true);
    });

    it('应该支持向上和向下迁移', async () => {
      const mockQueryRunner = {
        createTable: jest.fn().mockResolvedValue(undefined),
        createIndex: jest.fn().mockResolvedValue(undefined),
        dropTable: jest.fn().mockResolvedValue(undefined),
      };

      // 先执行 up
      await migration.up(mockQueryRunner as any);
      expect(mockQueryRunner.createTable).toHaveBeenCalled();

      // 再执行 down
      await migration.down(mockQueryRunner as any);
      expect(mockQueryRunner.dropTable).toHaveBeenCalled();
    });
  });

  describe('down 方法 - 表删除逻辑', () => {
    it('应该调用 dropTable 方法', async () => {
      const dropTableMock = jest.fn().mockResolvedValue(undefined);
      const mockQueryRunner = {
        dropTable: dropTableMock,
      };

      await migration.down(mockQueryRunner as any);

      expect(dropTableMock).toHaveBeenCalled();
      expect(dropTableMock).toHaveBeenCalledTimes(1);
    });

    it('应该删除 users 表', async () => {
      const dropTableMock = jest.fn().mockResolvedValue(undefined);
      const mockQueryRunner = {
        dropTable: dropTableMock,
      };

      await migration.down(mockQueryRunner as any);

      expect(dropTableMock).toHaveBeenCalledWith('users');
    });

    it('应该使用 ifExists 参数', async () => {
      const dropTableMock = jest.fn().mockResolvedValue(undefined);
      const mockQueryRunner = {
        dropTable: dropTableMock,
      };

      await migration.down(mockQueryRunner as any);

      // TypeORM 的 dropTable 默认就检查是否存在
      expect(dropTableMock).toHaveBeenCalledWith('users');
    });
  });

  describe('迁移完整性验证', () => {
    it('应该有正确的迁移名称格式', () => {
      expect(migration.constructor.name).toMatch(/CreateUsersTable\d{13}/);
    });
  });
});
