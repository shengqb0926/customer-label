#!/bin/bash
# 尝试释放 5176 端口的脚本
PID=$(netstat -ano | grep ":5176" | grep "LISTENING" | awk '{print $NF}' | head -n 1)
if [ ! -z "$PID" ]; then
    echo "Found process on port 5176: $PID"
    kill -9 $PID 2>/dev/null
    sleep 2
    echo "Process killed, waiting for port to be released..."
    sleep 3
fi
echo "Port release attempt completed"
