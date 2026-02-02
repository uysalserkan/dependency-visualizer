#!/bin/bash

echo "🚀 Starting Import Visualizer..."
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop."
    exit 1
fi

echo "📦 Building and starting services..."
docker-compose up --build -d

echo ""
echo "✅ Services are starting up..."
echo ""
echo "🌐 Frontend: http://localhost:5173"
echo "🔌 Backend API: http://localhost:8000"
echo "📚 API Docs: http://localhost:8000/docs"
echo ""
echo "⏳ Please wait ~30 seconds for services to be ready..."
echo ""
echo "To view logs: docker-compose logs -f"
echo "To stop: docker-compose down"
