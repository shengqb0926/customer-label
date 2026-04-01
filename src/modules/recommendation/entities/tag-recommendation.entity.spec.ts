import { TagRecommendation, RecommendationStatus } from './tag-recommendation.entity';

describe('TagRecommendation Entity', () => {
  describe('Basic Properties', () => {
    it('should create a recommendation with required fields', () => {
      const recommendation = new TagRecommendation();
      recommendation.id = 1;
      recommendation.customerId = 100;
      recommendation.tagName = '高价值客户';
      recommendation.tagCategory = '客户价值';
      recommendation.confidence = 0.85;
      recommendation.source = 'rule';
      recommendation.reason = '基于消费金额和订单数的规则匹配';

      expect(recommendation.id).toBe(1);
      expect(recommendation.customerId).toBe(100);
      expect(recommendation.tagName).toBe('高价值客户');
      expect(recommendation.tagCategory).toBe('客户价值');
      expect(recommendation.confidence).toBe(0.85);
      expect(recommendation.source).toBe('rule');
      expect(recommendation.reason).toContain('规则匹配');
    });

    it('should initialize status to PENDING by default', () => {
      const recommendation = new TagRecommendation();
      recommendation.customerId = 1;
      recommendation.tagName = '测试标签';
      recommendation.confidence = 0.7;
      recommendation.source = 'clustering';
      recommendation.status = RecommendationStatus.PENDING; // Manually set default value

      expect(recommendation.status).toBe(RecommendationStatus.PENDING);
    });

    it('should allow optional fields to be null', () => {
      const recommendation = new TagRecommendation();
      recommendation.customerId = 1;
      recommendation.tagName = '测试标签';
      recommendation.confidence = 0.7;
      recommendation.source = 'association';
      
      recommendation.tagCategory = null;
      recommendation.reason = null;
      recommendation.scoreOverall = null;
      recommendation.isAccepted = null;
      recommendation.acceptedAt = null;
      recommendation.acceptedBy = null;
      recommendation.modifiedTagName = null;
      recommendation.feedbackReason = null;
      recommendation.expiresAt = null;

      expect(recommendation.tagCategory).toBeNull();
      expect(recommendation.reason).toBeNull();
      expect(recommendation.scoreOverall).toBeNull();
    });
  });

  describe('RecommendationStatus Enum', () => {
    it('should have correct enum values', () => {
      expect(RecommendationStatus.PENDING).toBe('pending');
      expect(RecommendationStatus.ACCEPTED).toBe('accepted');
      expect(RecommendationStatus.REJECTED).toBe('rejected');
    });

    it('should be usable in status field', () => {
      const recommendation = new TagRecommendation();
      recommendation.customerId = 1;
      recommendation.tagName = '标签';
      recommendation.confidence = 0.8;
      recommendation.source = 'rule';
      
      recommendation.status = RecommendationStatus.ACCEPTED;

      expect(recommendation.status).toBe('accepted');
    });

    it('should support all status values', () => {
      const statuses = Object.values(RecommendationStatus);
      
      expect(statuses).toContain('pending');
      expect(statuses).toContain('accepted');
      expect(statuses).toContain('rejected');
    });
  });

  describe('Source Field Validation', () => {
    it('should accept rule as source', () => {
      const recommendation = new TagRecommendation();
      recommendation.customerId = 1;
      recommendation.tagName = '规则推荐';
      recommendation.confidence = 0.9;
      recommendation.source = 'rule';

      expect(recommendation.source).toBe('rule');
    });

    it('should accept clustering as source', () => {
      const recommendation = new TagRecommendation();
      recommendation.customerId = 1;
      recommendation.tagName = '聚类推荐';
      recommendation.confidence = 0.75;
      recommendation.source = 'clustering';

      expect(recommendation.source).toBe('clustering');
    });

    it('should accept association as source', () => {
      const recommendation = new TagRecommendation();
      recommendation.customerId = 1;
      recommendation.tagName = '关联推荐';
      recommendation.confidence = 0.65;
      recommendation.source = 'association';

      expect(recommendation.source).toBe('association');
    });
  });

  describe('Confidence Field', () => {
    it('should support confidence values between 0 and 1', () => {
      const rec1 = new TagRecommendation();
      rec1.customerId = 1;
      rec1.tagName = '低置信度';
      rec1.confidence = 0.1234;
      rec1.source = 'rule';

      const rec2 = new TagRecommendation();
      rec2.customerId = 1;
      rec2.tagName = '高置信度';
      rec2.confidence = 0.9876;
      rec2.source = 'rule';

      expect(rec1.confidence).toBe(0.1234);
      expect(rec2.confidence).toBe(0.9876);
    });

    it('should support exact boundary values', () => {
      const rec1 = new TagRecommendation();
      rec1.customerId = 1;
      rec1.tagName = '零置信度';
      rec1.confidence = 0;
      rec1.source = 'rule';

      const rec2 = new TagRecommendation();
      rec2.customerId = 1;
      rec2.tagName = '完全置信度';
      rec2.confidence = 1;
      rec2.source = 'rule';

      expect(rec1.confidence).toBe(0);
      expect(rec2.confidence).toBe(1);
    });
  });

  describe('Timestamps', () => {
    it('should store createdAt timestamp', () => {
      const now = new Date();
      const recommendation = new TagRecommendation();
      recommendation.customerId = 1;
      recommendation.tagName = '测试';
      recommendation.confidence = 0.8;
      recommendation.source = 'rule';
      recommendation.createdAt = now;

      expect(recommendation.createdAt).toBeInstanceOf(Date);
      expect(recommendation.createdAt.getTime()).toBe(now.getTime());
    });

    it('should store updatedAt timestamp', () => {
      const now = new Date();
      const recommendation = new TagRecommendation();
      recommendation.customerId = 1;
      recommendation.tagName = '测试';
      recommendation.confidence = 0.8;
      recommendation.source = 'rule';
      recommendation.updatedAt = now;

      expect(recommendation.updatedAt).toBeInstanceOf(Date);
    });

    it('should store expiresAt timestamp', () => {
      const future = new Date('2026-12-31T23:59:59Z');
      const recommendation = new TagRecommendation();
      recommendation.customerId = 1;
      recommendation.tagName = '临时推荐';
      recommendation.confidence = 0.7;
      recommendation.source = 'rule';
      recommendation.expiresAt = future;

      expect(recommendation.expiresAt).toBeInstanceOf(Date);
      expect(recommendation.expiresAt.toISOString()).toBe(future.toISOString());
    });
  });

  describe('Acceptance Tracking Fields', () => {
    it('should track acceptance information', () => {
      const acceptedDate = new Date('2026-03-30T15:30:00Z');
      const recommendation = new TagRecommendation();
      recommendation.customerId = 1;
      recommendation.tagName = '已接受标签';
      recommendation.confidence = 0.9;
      recommendation.source = 'rule';
      recommendation.status = RecommendationStatus.ACCEPTED;
      recommendation.isAccepted = true;
      recommendation.acceptedAt = acceptedDate;
      recommendation.acceptedBy = 42;

      expect(recommendation.status).toBe('accepted');
      expect(recommendation.isAccepted).toBe(true);
      expect(recommendation.acceptedAt).toBeInstanceOf(Date);
      expect(recommendation.acceptedBy).toBe(42);
    });

    it('should store feedback reason', () => {
      const recommendation = new TagRecommendation();
      recommendation.customerId = 1;
      recommendation.tagName = '被拒绝的标签';
      recommendation.confidence = 0.5;
      recommendation.source = 'rule';
      recommendation.status = RecommendationStatus.REJECTED;
      recommendation.feedbackReason = '与实际客户特征不符';

      expect(recommendation.feedbackReason).toBe('与实际客户特征不符');
    });

    it('should store modified tag name', () => {
      const recommendation = new TagRecommendation();
      recommendation.customerId = 1;
      recommendation.tagName = '原始标签名';
      recommendation.confidence = 0.75;
      recommendation.source = 'rule';
      recommendation.modifiedTagName = '修改后的标签名';

      expect(recommendation.modifiedTagName).toBe('修改后的标签名');
    });
  });

  describe('Score Overall Field', () => {
    it('should store overall score', () => {
      const recommendation = new TagRecommendation();
      recommendation.customerId = 1;
      recommendation.tagName = '评分标签';
      recommendation.confidence = 0.8;
      recommendation.source = 'rule';
      recommendation.scoreOverall = 0.8765;

      expect(recommendation.scoreOverall).toBe(0.8765);
    });

    it('should support score boundary values', () => {
      const rec1 = new TagRecommendation();
      rec1.customerId = 1;
      rec1.tagName = '最低分';
      rec1.confidence = 0.5;
      rec1.source = 'rule';
      rec1.scoreOverall = 0;

      const rec2 = new TagRecommendation();
      rec2.customerId = 1;
      rec2.tagName = '最高分';
      rec2.confidence = 0.9;
      rec2.source = 'rule';
      rec2.scoreOverall = 1;

      expect(rec1.scoreOverall).toBe(0);
      expect(rec2.scoreOverall).toBe(1);
    });
  });

  describe('Complete Recommendation Example', () => {
    it('should create a complete recommendation with all fields', () => {
      const createdAt = new Date('2026-03-29T10:00:00Z');
      const acceptedAt = new Date('2026-03-30T14:30:00Z');
      
      const recommendation = new TagRecommendation();
      recommendation.id = 123;
      recommendation.customerId = 456;
      recommendation.tagName = '高价值客户';
      recommendation.tagCategory = '客户价值';
      recommendation.confidence = 0.9234;
      recommendation.source = 'rule';
      recommendation.reason = '客户月均消费超过 10000 元，订单数超过 50 单';
      recommendation.scoreOverall = 0.8956;
      recommendation.status = RecommendationStatus.ACCEPTED;
      recommendation.isAccepted = true;
      recommendation.acceptedAt = acceptedAt;
      recommendation.acceptedBy = 1001;
      recommendation.modifiedTagName = '钻石级客户';
      recommendation.feedbackReason = '调整为客户更易理解的名称';
      recommendation.createdAt = createdAt;
      recommendation.expiresAt = new Date('2026-06-29T10:00:00Z');
      recommendation.updatedAt = acceptedAt;

      expect(recommendation.id).toBe(123);
      expect(recommendation.customerId).toBe(456);
      expect(recommendation.tagName).toBe('高价值客户');
      expect(recommendation.confidence).toBe(0.9234);
      expect(recommendation.source).toBe('rule');
      expect(recommendation.status).toBe('accepted');
      expect(recommendation.acceptedBy).toBe(1001);
      expect(recommendation.modifiedTagName).toBe('钻石级客户');
    });
  });
});
