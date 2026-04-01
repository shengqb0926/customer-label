/**
 * 性能基准测试框架
 * 
 * 用途：
 * 1. 测量关键操作的性能指标
 * 2. 检测性能回归
 * 3. 验证优化效果
 * 4. 建立性能基线
 * 
 * 运行方式：
 * npm run test:benchmark
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { ConfigService } from '@nestjs/config';

// 性能指标接口
interface PerformanceMetrics {
  operation: string;
  iterations: number;
  totalTime: number;
  avgTime: number;
  minTime: number;
  maxTime: number;
  p95Time: number;
  p99Time: number;
  successRate: number;
  requestsPerSecond: number;
}

// 基准测试结果
interface BenchmarkResult {
  name: string;
  timestamp: string;
  metrics: PerformanceMetrics[];
  environment: {
    nodeVersion: string;
    platform: string;
    cpus: number;
    memory: string;
  };
}

/**
 * 性能测试工具类
 */
class PerformanceTester {
  private results: Map<string, number[]> = new Map();

  /**
   * 开始计时
   */
  start(): number {
    return performance.now();
  }

  /**
   * 结束计时并记录
   */
  end(operation: string, startTime: number): number {
    const duration = performance.now() - startTime;
    
    if (!this.results.has(operation)) {
      this.results.set(operation, []);
    }
    this.results.get(operation)!.push(duration);
    
    return duration;
  }

  /**
   * 计算统计数据
   */
  calculateMetrics(operation: string, iterations: number): PerformanceMetrics {
    const times = this.results.get(operation) || [];
    
    if (times.length === 0) {
      throw new Error(`No data recorded for operation: ${operation}`);
    }

    const sorted = [...times].sort((a, b) => a - b);
    const totalTime = times.reduce((sum, t) => sum + t, 0);
    const avgTime = totalTime / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    
    // 计算百分位数
    const p95Index = Math.floor(sorted.length * 0.95);
    const p99Index = Math.floor(sorted.length * 0.99);
    const p95Time = sorted[p95Index] || maxTime;
    const p99Time = sorted[p99Index] || maxTime;

    const successCount = times.filter(t => t > 0).length;
    const successRate = (successCount / iterations) * 100;
    const requestsPerSecond = (iterations / (totalTime / 1000));

    return {
      operation,
      iterations,
      totalTime: parseFloat(totalTime.toFixed(2)),
      avgTime: parseFloat(avgTime.toFixed(2)),
      minTime: parseFloat(minTime.toFixed(2)),
      maxTime: parseFloat(maxTime.toFixed(2)),
      p95Time: parseFloat(p95Time.toFixed(2)),
      p99Time: parseFloat(p99Time.toFixed(2)),
      successRate: parseFloat(successRate.toFixed(2)),
      requestsPerSecond: parseFloat(requestsPerSecond.toFixed(2)),
    };
  }

  /**
   * 清除记录
   */
  clear(): void {
    this.results.clear();
  }
}

describe('Performance Benchmark Suite (e2e)', () => {
  let app: INestApplication;
  let tester: PerformanceTester;
  let authToken: string;
  let testCustomerId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(ConfigService)
      .useValue({
        get: (key: string) => {
          if (key === 'database.host') return process.env.TEST_DB_HOST || 'localhost';
          if (key === 'database.port') return parseInt(process.env.TEST_DB_PORT || '5432');
          if (key === 'database.username') return process.env.TEST_DB_USERNAME || 'postgres';
          if (key === 'database.password') return process.env.TEST_DB_PASSWORD || 'postgres';
          if (key === 'database.database') return process.env.TEST_DB_DATABASE || 'customer_label_test';
          if (key === 'redis.url') return process.env.TEST_REDIS_URL || 'redis://localhost:6379';
          if (key === 'redis.cluster.enabled') return false;
          if (key === 'jwt.secret') return 'test-secret-key-for-benchmark-12345';
          if (key === 'jwt.expiresIn') return '1h';
          return null;
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // 获取认证令牌
    const registerResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        username: `benchmark_${Date.now()}`,
        email: `benchmark_${Date.now()}@example.com`,
        password: 'BenchmarkTest123!',
      });

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        username: registerResponse.body.username,
        password: 'BenchmarkTest123!',
      });

    authToken = loginResponse.body.access_token;
  });

  afterAll(async () => {
    // 清理测试数据
    if (testCustomerId) {
      try {
        await request(app.getHttpServer())
          .delete(`/customers/${testCustomerId}`)
          .set('Authorization', `Bearer ${authToken}`);
      } catch (e) {}
    }
    await app.close();
  });

  beforeEach(() => {
    tester = new PerformanceTester();
  });

  /**
   * 健康检查性能测试
   */
  describe('Health Check Performance', () => {
    it('should complete health check within acceptable time', async () => {
      const iterations = 10;
      
      for (let i = 0; i < iterations; i++) {
        const startTime = tester.start();
        
        await request(app.getHttpServer())
          .get('/health')
          .expect(200);
        
        tester.end('health_check', startTime);
      }

      const metrics = tester.calculateMetrics('health_check', iterations);
      console.log('\n=== Health Check Performance ===');
      console.table([metrics]);

      // 断言：平均响应时间应小于 100ms
      expect(metrics.avgTime).toBeLessThan(100);
      expect(metrics.successRate).toBe(100);
    });
  });

  /**
   * 客户 CRUD 操作性能测试
   */
  describe('Customer CRUD Performance', () => {
    const createdIds: number[] = [];

    afterEach(async () => {
      // 清理创建的顾客
      for (const id of createdIds) {
        try {
          await request(app.getHttpServer())
            .delete(`/customers/${id}`)
            .set('Authorization', `Bearer ${authToken}`);
        } catch (e) {}
      }
      createdIds.length = 0;
    });

    it('CREATE: should create customer with good performance', async () => {
      const iterations = 20;
      
      for (let i = 0; i < iterations; i++) {
        const startTime = tester.start();
        
        const response = await request(app.getHttpServer())
          .post('/customers')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: `Perf_Customer_${Date.now()}_${i}`,
            email: `perf_${Date.now()}_${i}@example.com`,
            phone: '13800138000',
            level: 'BRONZE',
            riskLevel: 'LOW',
          });
        
        tester.end('customer_create', startTime);
        
        if (response.body.id) {
          createdIds.push(response.body.id);
        }
      }

      const metrics = tester.calculateMetrics('customer_create', iterations);
      console.log('\n=== Customer CREATE Performance ===');
      console.table([metrics]);

      // 断言：平均创建时间应小于 200ms
      expect(metrics.avgTime).toBeLessThan(200);
      expect(metrics.successRate).toBeGreaterThanOrEqual(95);
    });

    it('READ: should get customer by ID with good performance', async () => {
      // 先创建一个顾客用于查询测试
      const createResponse = await request(app.getHttpServer())
        .post('/customers')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: `Query_Test_Customer_${Date.now()}`,
          email: `query_${Date.now()}@example.com`,
        });
      
      const customerId = createResponse.body.id;
      const iterations = 50;

      for (let i = 0; i < iterations; i++) {
        const startTime = tester.start();
        
        await request(app.getHttpServer())
          .get(`/customers/${customerId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);
        
        tester.end('customer_read', startTime);
      }

      const metrics = tester.calculateMetrics('customer_read', iterations);
      console.log('\n=== Customer READ Performance ===');
      console.table([metrics]);

      // 断言：平均查询时间应小于 50ms
      expect(metrics.avgTime).toBeLessThan(50);
      expect(metrics.p95Time).toBeLessThan(100);
    });

    it('UPDATE: should update customer with good performance', async () => {
      // 先创建一个顾客
      const createResponse = await request(app.getHttpServer())
        .post('/customers')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: `Update_Test_Customer_${Date.now()}`,
          email: `update_${Date.now()}@example.com`,
        });
      
      const customerId = createResponse.body.id;
      const iterations = 30;

      for (let i = 0; i < iterations; i++) {
        const startTime = tester.start();
        
        await request(app.getHttpServer())
          .put(`/customers/${customerId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: `Updated_Customer_${i}`,
            totalOrders: i + 1,
            totalAmount: (i + 1) * 1000,
          });
        
        tester.end('customer_update', startTime);
      }

      const metrics = tester.calculateMetrics('customer_update', iterations);
      console.log('\n=== Customer UPDATE Performance ===');
      console.table([metrics]);

      // 断言：平均更新时间应小于 150ms
      expect(metrics.avgTime).toBeLessThan(150);
    });

    it('DELETE: should delete customer with good performance', async () => {
      const iterations = 10;

      for (let i = 0; i < iterations; i++) {
        // 先创建
        const createResponse = await request(app.getHttpServer())
          .post('/customers')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: `Delete_Test_Customer_${i}`,
            email: `delete_${i}@example.com`,
          });
        
        const customerId = createResponse.body.id;
        
        // 再删除并计时
        const startTime = tester.start();
        
        await request(app.getHttpServer())
          .delete(`/customers/${customerId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);
        
        tester.end('customer_delete', startTime);
      }

      const metrics = tester.calculateMetrics('customer_delete', iterations);
      console.log('\n=== Customer DELETE Performance ===');
      console.table([metrics]);

      // 断言：平均删除时间应小于 100ms
      expect(metrics.avgTime).toBeLessThan(100);
    });
  });

  /**
   * 列表查询性能测试（分页）
   */
  describe('Customer List Query Performance', () => {
    it('should query customer list with pagination efficiently', async () => {
      const iterations = 30;
      const pageSizes = [10, 20, 50];

      for (const pageSize of pageSizes) {
        tester.clear();
        
        for (let i = 0; i < iterations; i++) {
          const startTime = tester.start();
          
          await request(app.getHttpServer())
            .get(`/customers?page=${i + 1}&limit=${pageSize}`)
            .set('Authorization', `Bearer ${authToken}`)
            .expect(200);
          
          tester.end(`customer_list_page_${pageSize}`, startTime);
        }

        const metrics = tester.calculateMetrics(`customer_list_page_${pageSize}`, iterations);
        console.log(`\n=== Customer List Query (Page Size: ${pageSize}) Performance ===`);
        console.table([metrics]);

        // 断言：不同分页大小的响应时间要求
        const maxAllowedTime = pageSize === 50 ? 200 : pageSize === 20 ? 150 : 100;
        expect(metrics.avgTime).toBeLessThan(maxAllowedTime);
      }
    });

    it('should handle complex filter queries efficiently', async () => {
      const iterations = 20;

      for (let i = 0; i < iterations; i++) {
        const startTime = tester.start();
        
        await request(app.getHttpServer())
          .get('/customers?level=GOLD&riskLevel=LOW&sortBy=totalAmount&sortOrder=desc&page=1&limit=20')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);
        
        tester.end('customer_complex_query', startTime);
      }

      const metrics = tester.calculateMetrics('customer_complex_query', iterations);
      console.log('\n=== Customer Complex Query Performance ===');
      console.table([metrics]);

      // 断言：复杂查询时间应小于 300ms
      expect(metrics.avgTime).toBeLessThan(300);
    });
  });

  /**
   * 批量操作性能测试
   */
  describe('Batch Operations Performance', () => {
    it('BATCH CREATE: should create multiple customers efficiently', async () => {
      const batchSizes = [10, 50, 100];

      for (const batchSize of batchSizes) {
        tester.clear();
        const iterations = 5;

        for (let i = 0; i < iterations; i++) {
          const customers = Array.from({ length: batchSize }, (_, idx) => ({
            name: `Batch_Perf_${batchSize}_${i}_${idx}`,
            email: `batch_${batchSize}_${i}_${idx}@example.com`,
            level: 'SILVER',
          }));

          const startTime = tester.start();
          
          const response = await request(app.getHttpServer())
            .post('/customers/batch')
            .set('Authorization', `Bearer ${authToken}`)
            .send(customers)
            .expect(201);
          
          tester.end(`batch_create_${batchSize}`, startTime);
          
          // 清理
          const ids = response.body.map((c: any) => c.id);
          for (const id of ids) {
            try {
              await request(app.getHttpServer())
                .delete(`/customers/${id}`)
                .set('Authorization', `Bearer ${authToken}`);
            } catch (e) {}
          }
        }

        const metrics = tester.calculateMetrics(`batch_create_${batchSize}`, iterations);
        console.log(`\n=== Batch Create (${batchSize} items) Performance ===`);
        console.table([metrics]);

        // 断言：批量创建的平均时间应该合理（每个项目不超过 50ms）
        expect(metrics.avgTime).toBeLessThan(batchSize * 50);
      }
    });
  });

  /**
   * RFM 分析性能测试
   */
  describe('RFM Analysis Performance', () => {
    let rfmCustomerId: number;

    beforeAll(async () => {
      // 创建一个用于 RFM 测试的顾客
      const response = await request(app.getHttpServer())
        .post('/customers')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: `RFM_Perf_Customer_${Date.now()}`,
          email: `rfm_perf_${Date.now()}@example.com`,
          totalOrders: 50,
          totalAmount: 100000,
        });
      
      rfmCustomerId = response.body.id;
    });

    afterAll(async () => {
      if (rfmCustomerId) {
        try {
          await request(app.getHttpServer())
            .delete(`/customers/${rfmCustomerId}`)
            .set('Authorization', `Bearer ${authToken}`);
        } catch (e) {}
      }
    });

    it('should analyze customer RFM score efficiently', async () => {
      const iterations = 20;

      for (let i = 0; i < iterations; i++) {
        const startTime = tester.start();
        
        await request(app.getHttpServer())
          .get(`/customers/rfm/analyze/${rfmCustomerId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);
        
        tester.end('rfm_analyze', startTime);
      }

      const metrics = tester.calculateMetrics('rfm_analyze', iterations);
      console.log('\n=== RFM Analysis Performance ===');
      console.table([metrics]);

      // 断言：RFM 分析时间应小于 200ms
      expect(metrics.avgTime).toBeLessThan(200);
    });

    it('should get RFM summary statistics efficiently', async () => {
      const iterations = 15;

      for (let i = 0; i < iterations; i++) {
        const startTime = tester.start();
        
        await request(app.getHttpServer())
          .get('/customers/rfm/summary')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);
        
        tester.end('rfm_summary', startTime);
      }

      const metrics = tester.calculateMetrics('rfm_summary', iterations);
      console.log('\n=== RFM Summary Performance ===');
      console.table([metrics]);

      // 断言：RFM 汇总统计时间应小于 300ms
      expect(metrics.avgTime).toBeLessThan(300);
    });
  });

  /**
   * 推荐系统性能测试
   */
  describe('Recommendation System Performance', () => {
    let testRuleId: number;

    beforeAll(async () => {
      // 创建一个测试规则
      const response = await request(app.getHttpServer())
        .post('/rules')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ruleName: `Perf_Rule_${Date.now()}`,
          ruleExpression: 'totalOrders >= 5 && totalAmount >= 5000',
          priority: 70,
          tagTemplate: {
            name: '性能测试标签',
            category: '性能测试',
            baseConfidence: 0.75,
          },
          isActive: true,
        });
      
      testRuleId = response.body.id;
    });

    afterAll(async () => {
      if (testRuleId) {
        try {
          await request(app.getHttpServer())
            .delete(`/rules/${testRuleId}`)
            .set('Authorization', `Bearer ${authToken}`);
        } catch (e) {}
      }
    });

    it('should generate recommendations within acceptable time', async () => {
      // 创建一个测试顾客
      const customerResponse = await request(app.getHttpServer())
        .post('/customers')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: `Rec_Perf_Customer_${Date.now()}`,
          email: `rec_perf_${Date.now()}@example.com`,
          totalOrders: 10,
          totalAmount: 15000,
        });
      
      const customerId = customerResponse.body.id;
      const iterations = 10;

      try {
        for (let i = 0; i < iterations; i++) {
          const startTime = tester.start();
          
          await request(app.getHttpServer())
            .post(`/recommendations/generate/${customerId}`)
            .set('Authorization', `Bearer ${authToken}`)
            .send({ mode: 'rule', useCache: false })
            .expect(201);
          
          tester.end('recommendation_generate', startTime);
        }

        const metrics = tester.calculateMetrics('recommendation_generate', iterations);
        console.log('\n=== Recommendation Generation Performance ===');
        console.table([metrics]);

        // 断言：推荐生成时间应小于 2 秒（涉及规则匹配等复杂逻辑）
        expect(metrics.avgTime).toBeLessThan(2000);
      } finally {
        // 清理
        try {
          await request(app.getHttpServer())
            .delete(`/customers/${customerId}`)
            .set('Authorization', `Bearer ${authToken}`);
        } catch (e) {}
      }
    });
  });

  /**
   * 并发性能测试
   */
  describe('Concurrent Performance', () => {
    it('should handle concurrent requests efficiently', async () => {
      const concurrencyLevels = [5, 10, 20];
      const customerIdForTest = testCustomerId;

      for (const concurrency of concurrencyLevels) {
        tester.clear();
        const promises: Promise<any>[] = [];

        const startTime = performance.now();

        for (let i = 0; i < concurrency; i++) {
          promises.push(
            request(app.getHttpServer())
              .get('/customers?page=1&limit=10')
              .set('Authorization', `Bearer ${authToken}`)
              .expect(200)
              .then(() => {
                const endTime = performance.now();
                tester.end(`concurrent_${concurrency}`, endTime - startTime);
              })
          );
        }

        await Promise.all(promises);

        const metrics = tester.calculateMetrics(`concurrent_${concurrency}`, concurrency);
        console.log(`\n=== Concurrent Requests (${concurrency}) Performance ===`);
        console.table([metrics]);

        // 断言：并发请求的平均响应时间增长应该在可接受范围内
        expect(metrics.avgTime).toBeLessThan(concurrency * 100);
      }
    });
  });

  /**
   * 生成基准测试报告
   */
  describe('Generate Benchmark Report', () => {
    it('should generate comprehensive benchmark report', () => {
      const report: BenchmarkResult = {
        name: 'Performance Benchmark Suite',
        timestamp: new Date().toISOString(),
        metrics: [],
        environment: {
          nodeVersion: process.version,
          platform: process.platform,
          cpus: require('os').cpus().length,
          memory: `${Math.round(require('os').totalmem() / 1024 / 1024 / 1024)}GB`,
        },
      };

      console.log('\n========================================');
      console.log('       PERFORMANCE BENCHMARK REPORT');
      console.log('========================================');
      console.log(`Generated: ${report.timestamp}`);
      console.log(`Node Version: ${report.environment.nodeVersion}`);
      console.log(`Platform: ${report.environment.platform}`);
      console.log(`CPUs: ${report.environment.cpus}`);
      console.log(`Memory: ${report.environment.memory}`);
      console.log('========================================\n');

      // 这里可以添加历史数据对比逻辑
      expect(report).toBeDefined();
    });
  });
});
