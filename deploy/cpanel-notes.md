# BexChat - cPanel Deployment Guide

## Prerequisites
- cPanel account with:
  - Python App support (Application Manager)
  - MySQL/MariaDB database
  - SSH access (recommended)
  - Node.js support (for building frontend)

## Step-by-step Deployment

### 1. Create MySQL Database
1. Go to cPanel > MySQL Databases
2. Create database: `bexchat`
3. Create user: `bexchat_user` with a strong password
4. Add user to database with ALL PRIVILEGES

### 2. Create Python Application
1. Go to cPanel > Setup Python App (or Application Manager)
2. Select Python version 3.11+
3. Set application root to your server directory
4. Set startup file: `bexchat/wsgi.py`
5. Set entry point: `application`

### 3. Upload Server Code
1. Upload the `server/` directory to your application root
2. Via SSH or cPanel Terminal:
   ```bash
   cd ~/your-app-directory
   source /virtualenv/your-app/3.11/bin/activate
   pip install -r requirements.txt
   ```

### 4. Configure Environment
1. Create `.env` file in server directory:
   ```
   SECRET_KEY=<generate-a-random-string>
   DEBUG=False
   ALLOWED_HOSTS=yourdomain.com
   DB_NAME=bexchat
   DB_USER=bexchat_user
   DB_PASSWORD=your-db-password
   DB_HOST=localhost
   DB_PORT=3306
   FRONTEND_URL=https://yourdomain.com
   STORAGE_ROOT=/home/username/storage
   ```

### 5. Run Migrations
```bash
python manage.py migrate
python manage.py createsuperuser
```

### 6. Build & Deploy Frontend
On your local machine:
```bash
cd client
npm install
npm run build
```
Upload contents of `client/dist/` to `public_html/`

### 7. Configure .htaccess
Create `public_html/.htaccess`:
```apache
RewriteEngine On
RewriteRule ^api/(.*)$ http://127.0.0.1:YOUR_APP_PORT/api/$1 [P,L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteRule . /index.html [L]
```
(Replace YOUR_APP_PORT with the port assigned by cPanel Python App)

### 8. Storage Permissions
```bash
mkdir -p ~/storage/workspaces ~/storage/users ~/storage/avatars ~/storage/previews
chmod 750 ~/storage
```

### 9. SSL
Enable AutoSSL via cPanel > SSL/TLS Status

## Troubleshooting
- **502 Bad Gateway**: Check Python app is running in Application Manager
- **Static files not loading**: Ensure `public_html/` has the built frontend files
- **API 500 errors**: Check Django logs, verify DB credentials
- **File upload fails**: Check storage directory permissions and disk quota
- **SSE not working**: Increase Apache timeout settings

## Cron Jobs (Optional)
Add via cPanel > Cron Jobs:
```bash
# Clean expired sessions every hour
0 * * * * cd ~/your-app && source venv/bin/activate && python manage.py clearsessions
```
