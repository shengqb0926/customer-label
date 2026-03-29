#!/bin/bash

# 客户标签系统 - 完整功能测试脚本
# 用于验证后端 API 和前端页面是否正常

echo "======================================"
echo "🧪 客户标签系统 - 功能测试"
echo "======================================"
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 测试结果统计
TESTS_PASSED=0
TESTS_FAILED=0

# 测试函数
test_api() {
    local name="$1"
    local url="$2"
    local method="${3:-GET}"
    local data="${4:-}"
    
    echo -n "测试 $name ... "
    
    if [ "$method" == "POST" ]; then
        response=$(curl -s -w "\n%{http_code}" -X POST "$url" \
            -H "Content-Type: application/json" \
            -d "$data")
    else
        response=$(curl -s -w "\n%{http_code}" -X GET "$url")
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n -1)
    
    if [ "$http_code" == "200" ] || [ "$http_code" == "201" ]; then
        echo -e "${GREEN}✅ 通过${NC}"
        ((TESTS_PASSED++))
        return 0
    else
        echo -e "${RED}❌ 失败 (HTTP $http_code)${NC}"
        echo "响应：$body"
        ((TESTS_FAILED++))
        return 1
    fi
}

echo "📍 测试环境检查"
echo "--------------------------------------"

# 检查后端服务
echo -n "检查后端服务 (端口 3000) ... "
if netstat -ano | grep -q ":3000"; then
    echo -e "${GREEN}✅ 运行中${NC}"
else
    echo -e "${RED}❌ 未运行${NC}"
    echo "请先启动后端服务：npm run dev"
    exit 1
fi

# 检查前端服务
echo -n "检查前端服务 (端口 5176) ... "
if netstat -ano | grep -q ":5176"; then
    echo -e "${GREEN}✅ 运行中${NC}"
else
    echo -e "${RED}❌ 未运行${NC}"
    echo "请先启动前端服务：cd frontend && npm run dev"
    exit 1
fi

echo ""
echo "📊 开始 API 测试"
echo "--------------------------------------"

BASE_URL="http://localhost:3000/api/v1"

# 1. 健康检查
test_api "健康检查" "$BASE_URL/health"

# 2. 客户列表
test_api "客户列表" "$BASE_URL/customers?page=1&limit=5"

# 3. 客户统计
test_api "客户统计" "$BASE_URL/customers/statistics"

# 4. RFM 分析列表
test_api "RFM 分析列表" "$BASE_URL/customers/rfm-analysis" "POST" '{"page":1,"limit":5}'

# 5. RFM 统计汇总
test_api "RFM 统计汇总" "$BASE_URL/customers/rfm-summary" "POST" '{}'

# 6. 高价值客户
test_api "高价值客户" "$BASE_URL/customers/rfm-high-value" "POST" '{"limit":5}'

# 7. 特定细分客户（重要价值客户）
test_api "重要价值客户" "$BASE_URL/customers/rfm-segment/重要价值客户" "POST" '{}'

# 8. 推荐列表
test_api "推荐列表" "$BASE_URL/recommendations/customer/1?page=1&limit=5"

# 9. 规则列表
test_api "规则列表" "$BASE_URL/rules"

# 10. 评分概览
test_api "评分概览" "$BASE_URL/scores/stats/overview"

echo ""
echo "======================================"
echo "📈 测试结果汇总"
echo "======================================"
echo -e "通过：${GREEN}$TESTS_PASSED${NC}"
echo -e "失败：${RED}$TESTS_FAILED${NC}"
echo "总计：$((TESTS_PASSED + TESTS_FAILED))"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 所有测试通过！${NC}"
    echo ""
    echo "✅ 后端 API 全部正常"
    echo "👉 现在请在浏览器中访问："
    echo "   http://localhost:5176"
    echo ""
    echo "📝 前端测试步骤："
    echo "   1. 清理浏览器缓存 (Ctrl+Shift+Delete)"
    echo "   2. 强制刷新页面 (Ctrl+F5)"
    echo "   3. 访问【客户管理】→【统计分析】"
    echo "   4. 确认饼图显示正常（非 undefined）"
    echo "   5. 访问【RFM 分析】确认数据正常"
    echo ""
else
    echo -e "${RED}⚠️  部分测试失败，请检查日志${NC}"
    exit 1
fi
