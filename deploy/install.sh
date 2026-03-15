#!/bin/bash
set -e

echo "=== BexChat Installation Script ==="
echo ""

# Check prerequisites
command -v python3 >/dev/null 2>&1 || { echo "Python 3 is required but not installed."; exit 1; }
command -v pip3 >/dev/null 2>&1 || command -v pip >/dev/null 2>&1 || { echo "pip is required but not installed."; exit 1; }
command -v node >/dev/null 2>&1 || { echo "Node.js is required but not installed."; exit 1; }

# Get the project root
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
echo "Project root: $PROJECT_ROOT"

# --- Backend Setup ---
echo ""
echo "=== Setting up Django backend ==="
cd "$PROJECT_ROOT/server"

# Create virtual environment
if [ ! -d "venv" ]; then
    python3 -m venv venv
    echo "Created virtual environment."
fi

# Activate and install dependencies
source venv/bin/activate
pip install -r requirements.txt
echo "Installed Python dependencies."

# Copy .env if it doesn't exist
if [ ! -f "$PROJECT_ROOT/server/.env" ]; then
    cp "$PROJECT_ROOT/.env.example" "$PROJECT_ROOT/server/.env"
    echo "Created .env from example. Please edit server/.env with your settings."
fi

# Create storage directories
mkdir -p storage/workspaces storage/users storage/avatars storage/previews
chmod 750 storage
echo "Created storage directories."

# Run migrations
python manage.py migrate
echo "Database migrations applied."

# Collect static files
python manage.py collectstatic --noinput 2>/dev/null || true
echo "Static files collected."

echo ""
echo "=== Setting up React frontend ==="
cd "$PROJECT_ROOT/client"

# Install npm dependencies
npm install
echo "Installed npm dependencies."

# Build frontend
npm run build
echo "Frontend built successfully."

echo ""
echo "=== Installation Complete ==="
echo ""
echo "Next steps:"
echo "1. Edit server/.env with your database credentials"
echo "2. Run: cd server && source venv/bin/activate && python manage.py migrate"
echo "3. Create admin: cd server && python manage.py createsuperuser"
echo "4. Start server: cd server && python manage.py runserver 0.0.0.0:8000"
echo "5. Copy client/dist/* to your web server's public directory"
echo "6. Configure reverse proxy (see deploy/apache.conf or deploy/nginx.conf)"
echo ""
