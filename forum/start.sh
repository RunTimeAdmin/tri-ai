#!/bin/bash
# AI Triad Forum — Startup Script
# Starts both the backend API and frontend server

echo "🔺 AI Triad Forum — Starting..."
echo ""

# Install dependencies if needed
pip install flask flask-cors requests 2>/dev/null

# Start backend API on port 5000
echo "🔵 Starting backend API on port 5000..."
python server.py &
BACKEND_PID=$!
sleep 2

# Start frontend on port 8050
echo "🟢 Starting frontend on port 8050..."
python -m http.server 8050 &
FRONTEND_PID=$!

echo ""
echo "✅ AI Triad Forum is running!"
echo "   Frontend: http://localhost:8050"
echo "   Backend:  http://localhost:5000"
echo ""
echo "Press Ctrl+C to stop both servers."

# Trap Ctrl+C to kill both
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo ''; echo 'Stopped.'; exit 0" INT
wait