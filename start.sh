#!/bin/bash

echo "Starting PostgreSQL database..."
docker-compose up -d db

# Wait for database to be ready
echo "Waiting for database to be ready..."
sleep 2

# Check if database is running
if docker-compose ps db | grep -q "Up"; then
    echo "✅ Database is running on localhost:5432"
else
    echo "❌ Failed to start database"
    exit 1
fi
