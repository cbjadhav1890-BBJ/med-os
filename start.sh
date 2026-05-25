#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
NC='\033[0m' # No Color
BOLD='\033[1m'

echo -e "${GREEN}"
echo "======================================================"
echo "    MedOS Hospital Management System v2.0"
echo "======================================================"
echo -e "${NC}"

# 1. Install backend deps if needed
if [ ! -d "backend/node_modules" ]; then
    echo "[1/4] Installing backend dependencies..."
    (cd backend && npm install)
    echo "Done."
fi

# 2. Install frontend deps if needed
if [ ! -d "frontend/node_modules" ]; then
    echo "[2/4] Installing frontend dependencies..."
    (cd frontend && npm install)
    echo "Done."
fi

# Stop existing node processes to prevent port collisions
echo "Stopping any existing MedOS processes..."
pkill -f node || true

# 3. Start backend
echo "[3/4] Starting backend on port 3001..."
# Start in background and redirect output to a log file
cd backend && nohup node server.js > server.log 2>&1 &
BACKEND_PID=$!
cd ..

sleep 2

# 4. Start frontend
echo "[4/4] Starting frontend on port 3000..."
# Start in background and redirect output to a log file
cd frontend && nohup npm run dev > frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

sleep 3

echo -e "\n${GREEN}======================================================"
echo "   Backend  : http://localhost:3001/api/health"
echo "   Frontend : http://localhost:3000"
echo -e "======================================================${NC}"

echo -e "\n${BOLD}Logins:${NC}"
echo "   admin / admin123        (Full access)"
echo "   drpriya / doctor123     (Doctor - OPD)"
echo "   reception1 / recep123   (Front Office)"
echo "   nurse1 / nurse123       (Nursing)"
echo "   billing1 / billing123   (Billing)"
echo ""

echo "Opening browser..."
# Try multiple ways to open the browser based on OS (Linux/macOS)
if command -v xdg-open > /dev/null; then
    xdg-open http://localhost:3000
elif command -v open > /dev/null; then
    open http://localhost:3000
else
    echo "Please open http://localhost:3000 manually in your browser."
fi

echo -e "\n${BOLD}Processes are running in the background.${NC}"
echo "------------------------------------------------------"
echo "Backend PID: $BACKEND_PID (Logs: backend/server.log)"
echo "Frontend PID: $FRONTEND_PID (Logs: frontend/frontend.log)"
echo "------------------------------------------------------"
echo "To stop all processes, run: pkill -f node"
echo ""
echo "Press [Enter] to exit this launcher..."
read

