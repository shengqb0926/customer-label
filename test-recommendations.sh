#!/usr/bin/env bash
# 推荐结果管理功能 - API 自动化测试脚本
# 使用方法：./test-recommendations.sh

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 配置
BASE_URL="http://localhost:3000/api/v1"
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0IiwidXNlcm5hbWUiOiJidXNpbmVzc191c2VyIiwicm9sZXMiOlsiYW5hbHlzdCIsInVzZXIiXSwiZW1haWwiOiJidXNpbmVzc0BleGFtcGxlLmNvbSIsImlhdCI6MTc3NDU5NTczMywiZXhwIjoxNzc0NTk5MzMzfQ.RHmnyFHj_0LAJK_ix5os_7PzJ60J9UGKyAnHdugTBxM"

# 计数器
TOTAL=0
PASSED=0
FAILED=0

# 打印函数
print_test() {
    echo -e "${YELLOW}[TEST]${NC} $1"
}

print_pass() {
    echo -e "${GREEN}[PASS]${NC} $1"
    ((PASSED++))
    ((TOTAL++))
}

print_fail() {
    echo -e "${RED}[FAIL]${NC} $1"
    ((FAILED++))
    ((TOTAL++))
}

print_info() {
    echo -e "${YELLOW}[INFO]${NC} $1"
}

# 测试函数
test_endpoint() {
    local method=$1
    local endpoint=$2
    local data=$3
    local expected_status=${4:-200}
    
    print_test "$method $endpoint"
    
    if [ "$method" == "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" "$BASE_URL$endpoint" \
            -H "Authorization: Bearer $TOKEN")
    elif [ "$method" == "POST" ]; then
        response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL$endpoint" \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer $TOKEN" \
            -d "$data")
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)
    
    if [ "$http_code" == "$expected_status" ]; then
        print_pass "$method $endpoint (HTTP $http_code)"
        echo "$body" | python -c "import sys, json; data = json.load(sys.stdin); print(f'  Response: {json.dumps(data, indent=2)[:200]}...')" 2>/dev/null || true
    else
        print_fail "$method $endpoint (Expected: $expected_status, Got: $http_code)"
        echo "Response: $body"
    fi
}

# 主测试流程
main() {
    echo "========================================"
    echo "推荐结果管理功能 - API 自动化测试"
    echo "========================================"
    echo ""
    
    # 1. 健康检查
    print_info "阶段 1: 健康检查"
    test_endpoint "GET" "/health" "" "200"
    echo ""
    
    # 2. 基础查询测试
    print_info "阶段 2: 基础查询测试"
    test_endpoint "GET" "/recommendations?page=1&limit=5" "" "200"
    test_endpoint "GET" "/recommendations?category=偏好分析" "" "200"
    test_endpoint "GET" "/recommendations?source=rule" "" "200"
    test_endpoint "GET" "/recommendations?minConfidence=0.8" "" "200"
    echo ""
    
    # 3. 接受/拒绝测试
    print_info "阶段 3: 操作功能测试"
    test_endpoint "POST" "/recommendations/1/accept" '{"feedbackReason":"自动化测试接受"}' "200"
    test_endpoint "POST" "/recommendations/2/reject" '{"feedbackReason":"自动化测试拒绝"}' "200"
    echo ""
    
    # 4. 批量操作测试
    print_info "阶段 4: 批量操作测试"
    test_endpoint "POST" "/recommendations/batch-accept" '{"ids":[3,4,5]}' "200"
    test_endpoint "POST" "/recommendations/batch-reject" '{"ids":[6,7,8]}' "200"
    echo ""
    
    # 5. 测试数据管理
    print_info "阶段 5: 测试数据管理"
    test_endpoint "POST" "/recommendations/generate-test-data" '{"count":10}' "200"
    # 注意：清空测试数据需要谨慎，这里仅注释掉
    # test_endpoint "POST" "/recommendations/clear-test-data" "" "200"
    echo ""
    
    # 6. 统计信息
    print_info "阶段 6: 统计信息查询"
    test_endpoint "GET" "/recommendations/stats" "" "200"
    echo ""
    
    # 总结
    echo "========================================"
    echo "测试总结"
    echo "========================================"
    echo -e "总测试数：${TOTAL}"
    echo -e "通过：${GREEN}${PASSED}${NC}"
    echo -e "失败：${RED}${FAILED}${NC}"
    echo ""
    
    if [ $FAILED -eq 0 ]; then
        echo -e "${GREEN}✅ 所有测试通过！${NC}"
        exit 0
    else
        echo -e "${RED}❌ 有 ${FAILED} 个测试失败${NC}"
        exit 1
    fi
}

# 执行测试
main "$@"
