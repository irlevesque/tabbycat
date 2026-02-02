#!/bin/bash

echo "Setting up Tab Sync Extension..."

if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed. Please install Node.js 18 or higher."
    exit 1
fi

if ! command -v mongod &> /dev/null; then
    echo "Warning: MongoDB is not installed or not in PATH."
    echo "Please install MongoDB or update MONGODB_URI in backend/.env"
fi

echo "Installing dependencies..."

cd extension
npm install
cd ../backend
npm install
cd ..

echo "Creating .env file for backend..."
if [ ! -f backend/.env ]; then
    cp backend/.env.example backend/.env
    echo "Created backend/.env from .env.example"
    echo "Please update backend/.env with your configuration:"
    echo "  - MONGODB_URI"
    echo "  - JWT_SECRET"
    echo "  - GOOGLE_CLIENT_ID"
    echo "  - GOOGLE_CLIENT_SECRET"
else
    echo "backend/.env already exists. Skipping."
fi

echo ""
echo "Setup complete!"
echo ""
echo "Next steps:"
echo "1. Update backend/.env with your configuration"
echo "2. Start MongoDB: mongod"
echo "3. Start the backend: cd backend && npm run dev"
echo "4. Build the extension: cd extension && npm run build"
echo "5. Load the extension in Chrome/Firefox from extension/dist"
echo ""
echo "For more details, see README.md"
