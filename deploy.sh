#!/bin/bash

# Exit script if a command fails
set -e

# Cleanup function to kill all background processes when the script exits
cleanup() {
    echo "Stopping all services..."
    kill $(jobs -p) 2>/dev/null || true
    exit 0
}

# Trap termination signals to run the cleanup function
trap cleanup SIGINT SIGTERM

echo "======================================"
echo "Starting MemeVault Full Stack App"
echo "======================================"

# 1. Start Local Blockchain (Anvil)
echo "[1/4] Starting Anvil (Local Blockchain)..."
cd blockchain
# Start anvil in the background and redirect output to a log file
anvil > anvil.log 2>&1 &
ANVIL_PID=$!
cd ..

# Wait a few seconds to ensure Anvil is fully started before deploying contracts
sleep 3

# 2. Deploy Smart Contracts
echo "[2/4] Deploying Smart Contracts..."
cd blockchain
PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 forge script script/DeployMemeVault.s.sol:DeployMemeVault --broadcast --rpc-url http://127.0.0.1:8545
cd ..

# 3. Start Backend server
echo "[3/4] Starting Backend..."
cd backend
npm install
# Start backend in the background and redirect output to a log file
npm run dev > backend.log 2>&1 &
BACKEND_PID=$!
cd ..

# 4. Start Frontend React App
echo "[4/4] Starting Frontend..."
cd frontend
npm install
# Start frontend in the background and redirect output to a log file
npm run dev > frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

echo "======================================"
echo "🚀 All services are now running!"
echo "======================================"
echo "🌐 Frontend:   http://localhost:3000"
echo "🛠️  Backend:    http://localhost:5000"
echo "🔗 Blockchain: http://127.0.0.1:8545"
echo ""
echo "Logs are available in:"
echo "- blockchain/anvil.log"
echo "- backend/backend.log"
echo "- frontend/frontend.log"
echo ""
echo "Press Ctrl+C to stop all services."
echo "======================================"

# Wait for all background processes to keep the script running
wait
