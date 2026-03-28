import { RecommendationRule } from '../entities/recommendation-rule.entity';

/**
 * 默认规则种子数据
 */
export const DEFAULT_RULES: Partial<RecommendationRule>[] = [
  {
    ruleName: '高价值客户识别',
    description: '识别消费金额和订单数双高的客户',
    ruleExpression: JSON.stringify({
      operator: 'AND',
      conditions: [
        { field: 'totalOrders', operator: '>=', value: 10 },
        { field: 'totalAmount', operator: '>=', value: 10000 },
      ],
    }),
    priority: 90,
    tagTemplate: {
      name: '高价值客户',
      category: '客户价值',
      baseConfidence: 0.8,
    },
    isActive: true,
    hitCount: 0,
  },
  {
    ruleName: '流失风险预警',
    description: '识别长时间未购买的客户',
    ruleExpression: JSON.stringify({
      operator: 'AND',
      conditions: [
        { 
          field: 'lastOrderDate', 
          operator: '<', 
          value: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] 
        },
        { field: 'totalOrders', operator: '>=', value: 3 },
      ],
    }),
    priority: 85,
    tagTemplate: {
      name: '流失风险',
      category: '客户风险',
      baseConfidence: 0.75,
    },
    isActive: true,
    hitCount: 0,
  },
  {
    ruleName: '潜力客户挖掘',
    description: '识别年轻且有消费能力的客户',
    ruleExpression: JSON.stringify({
      operator: 'AND',
      conditions: [
        { field: 'profile.age', operator: 'between', value: [25, 40] },
        { field: 'profile.city', operator: 'in', value: ['北京', '上海', '广州', '深圳'] },
        { field: 'avgOrderValue', operator: '>=', value: 500 },
      ],
    }),
    priority: 80,
    tagTemplate: {
      name: '潜力客户',
      category: '客户潜力',
      baseConfidence: 0.7,
    },
    isActive: true,
    hitCount: 0,
  },
  {
    ruleName: '频繁购买者',
    description: '识别购买频率高的客户',
    ruleExpression: JSON.stringify({
      operator: 'AND',
      conditions: [
        { field: 'ordersLast30Days', operator: '>=', value: 5 },
        { field: 'ordersLast90Days', operator: '>=', value: 12 },
      ],
    }),
    priority: 75,
    tagTemplate: {
      name: '频繁购买者',
      category: '客户活跃度',
      baseConfidence: 0.85,
    },
    isActive: true,
    hitCount: 0,
  },
];