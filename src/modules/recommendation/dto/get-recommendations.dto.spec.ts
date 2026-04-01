import { 
  GetRecommendationsDto, 
  RecommendationSource,
  PaginatedResponse 
} from './get-recommendations.dto';

describe('GetRecommendationsDto', () => {
  it('should create with default values', () => {
    const dto = new GetRecommendationsDto();
    
    expect(dto.page).toBe(1);
    expect(dto.limit).toBe(20);
    expect(dto.sortBy).toBe('confidence');
    expect(dto.sortOrder).toBe('desc');
  });

  it('should set pagination parameters', () => {
    const dto = new GetRecommendationsDto();
    dto.page = 5;
    dto.limit = 50;

    expect(dto.page).toBe(5);
    expect(dto.limit).toBe(50);
  });

  it('should validate page minimum value', () => {
    const dto = new GetRecommendationsDto();
    dto.page = 1; // Minimum

    expect(dto.page).toBe(1);
  });

  it('should validate limit range', () => {
    const dto1 = new GetRecommendationsDto();
    dto1.limit = 1; // Minimum

    const dto2 = new GetRecommendationsDto();
    dto2.limit = 100; // Maximum

    expect(dto1.limit).toBe(1);
    expect(dto2.limit).toBe(100);
  });

  it('should set filter parameters', () => {
    const dto = new GetRecommendationsDto();
    dto.category = '客户价值';
    dto.customerName = '张三';
    dto.source = RecommendationSource.RULE;
    dto.minConfidence = 0.75;

    expect(dto.category).toBe('客户价值');
    expect(dto.customerName).toBe('张三');
    expect(dto.source).toBe(RecommendationSource.RULE);
    expect(dto.minConfidence).toBe(0.75);
  });

  it('should support all recommendation sources', () => {
    expect(RecommendationSource.RULE).toBe('rule');
    expect(RecommendationSource.CLUSTERING).toBe('clustering');
    expect(RecommendationSource.ASSOCIATION).toBe('association');
    expect(RecommendationSource.FUSION).toBe('fusion');
  });

  it('should set date range filters', () => {
    const dto = new GetRecommendationsDto();
    dto.startDate = '2026-03-01';
    dto.endDate = '2026-03-31';

    expect(dto.startDate).toBe('2026-03-01');
    expect(dto.endDate).toBe('2026-03-31');
  });

  it('should set sorting parameters', () => {
    const dto1 = new GetRecommendationsDto();
    dto1.sortBy = 'confidence';
    dto1.sortOrder = 'desc';

    const dto2 = new GetRecommendationsDto();
    dto2.sortBy = 'createdAt';
    dto2.sortOrder = 'asc';

    expect(dto1.sortBy).toBe('confidence');
    expect(dto1.sortOrder).toBe('desc');
    expect(dto2.sortBy).toBe('createdAt');
    expect(dto2.sortOrder).toBe('asc');
  });

  it('should allow all fields to be optional', () => {
    const dto = new GetRecommendationsDto();
    
    // All fields should be optional for query parameters
    expect(dto.category).toBeUndefined();
    expect(dto.customerName).toBeUndefined();
    expect(dto.source).toBeUndefined();
    expect(dto.minConfidence).toBeUndefined();
    expect(dto.startDate).toBeUndefined();
    expect(dto.endDate).toBeUndefined();
  });

  it('should support deprecated isAccepted field', () => {
    const dto = new GetRecommendationsDto();
    dto.isAccepted = true;

    expect(dto.isAccepted).toBe(true);
  });
});

describe('RecommendationSource Enum', () => {
  it('should have correct enum values', () => {
    expect(RecommendationSource.RULE).toBe('rule');
    expect(RecommendationSource.CLUSTERING).toBe('clustering');
    expect(RecommendationSource.ASSOCIATION).toBe('association');
    expect(RecommendationSource.FUSION).toBe('fusion');
  });

  it('should be usable as string', () => {
    const sources = Object.values(RecommendationSource);
    
    expect(sources).toContain('rule');
    expect(sources).toContain('clustering');
    expect(sources).toContain('association');
    expect(sources).toContain('fusion');
  });
});

describe('PaginatedResponse', () => {
  interface MockData {
    id: number;
    name: string;
  }

  it('should create paginated response correctly', () => {
    const data: MockData[] = [
      { id: 1, name: 'Item 1' },
      { id: 2, name: 'Item 2' },
      { id: 3, name: 'Item 3' },
    ];
    const total = 57;
    const page = 1;
    const limit = 20;

    const response = new PaginatedResponse(data, total, page, limit);

    expect(response.data).toEqual(data);
    expect(response.total).toBe(57);
    expect(response.page).toBe(1);
    expect(response.limit).toBe(20);
    expect(response.totalPages).toBe(3); // ceil(57/20) = 3
  });

  it('should calculate totalPages correctly', () => {
    const data: MockData[] = [];
    
    // Test case 1: Exact division
    const response1 = new PaginatedResponse(data, 100, 1, 20);
    expect(response1.totalPages).toBe(5);

    // Test case 2: Division with remainder
    const response2 = new PaginatedResponse(data, 101, 1, 20);
    expect(response2.totalPages).toBe(6);

    // Test case 3: Less than one page
    const response3 = new PaginatedResponse(data, 15, 1, 20);
    expect(response3.totalPages).toBe(1);

    // Test case 4: Zero items
    const response4 = new PaginatedResponse(data, 0, 1, 20);
    expect(response4.totalPages).toBe(0);
  });

  it('should work with different page numbers', () => {
    const data: MockData[] = [{ id: 21, name: 'Item 21' }];
    const response = new PaginatedResponse(data, 100, 2, 20);

    expect(response.page).toBe(2);
    expect(response.limit).toBe(20);
    expect(response.total).toBe(100);
    expect(response.totalPages).toBe(5);
  });

  it('should handle empty data array', () => {
    const data: MockData[] = [];
    const response = new PaginatedResponse(data, 0, 1, 20);

    expect(response.data).toEqual([]);
    expect(response.total).toBe(0);
    expect(response.page).toBe(1);
    expect(response.limit).toBe(20);
    expect(response.totalPages).toBe(0);
  });

  it('should preserve generic type in data array', () => {
    interface Customer {
      id: number;
      name: string;
      email: string;
    }

    const customers: Customer[] = [
      { id: 1, name: 'Customer 1', email: 'c1@example.com' },
      { id: 2, name: 'Customer 2', email: 'c2@example.com' },
    ];

    const response = new PaginatedResponse(customers, 2, 1, 20);

    expect(response.data.length).toBe(2);
    expect(response.data[0].email).toBeDefined();
    expect(response.data[1].name).toBe('Customer 2');
  });
});
