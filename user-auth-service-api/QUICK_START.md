# 🚀 Quick Start - User & Auth Microservice

## 1️⃣ Start in 30 Seconds (Docker)

```bash
cd "/Volumes/SSD Sakib/Office -25/leadpylot/backend/microservices/user-auth-service"
docker-compose up -d
./test-api.sh
```

**Done!** Service is running on `http://localhost:3000`

---

## 2️⃣ Start Manually (Local Development)

### Prerequisites
```bash
# Check Node.js version
node --version  # Should be 16+

# Check if MongoDB is running
mongosh  # Should connect
```

### Start Steps
```bash
# 1. Navigate to service
cd "/Volumes/SSD Sakib/Office -25/leadpylot/backend/microservices/user-auth-service"

# 2. Install dependencies
npm install

# 3. Start MongoDB (if not running)
docker run -d -p 27017:27017 --name mongodb mongo:6

# 4. Create environment file
cp .env.example .env

# 5. Start the service
npm run dev
```

### Verify It's Working
```bash
# Check health
curl http://localhost:3000/health

# Should see:
# {"status":"healthy","timestamp":"...","uptime":...}
```

---

## 3️⃣ Test the Service

### Automated Testing (Recommended)
```bash
./test-api.sh
```

This will automatically test:
- ✅ Registration
- ✅ Login/Logout
- ✅ Protected routes
- ✅ Password changes
- ✅ User management

### Manual Testing (Step by Step)

#### Step 1: Register First Admin
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "login": "admin",
    "password": "admin123",
    "role": "Admin"
  }'
```

Copy the `token` from response!

#### Step 2: Get Current User
```bash
TOKEN="<paste-your-token-here>"

curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

#### Step 3: Create Another User
```bash
curl -X POST http://localhost:3000/api/users \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "login": "agent1",
    "password": "agent123",
    "role": "Agent",
    "info": {
      "name": "Agent One",
      "email": "agent1@example.com"
    }
  }'
```

#### Step 4: List All Users
```bash
curl http://localhost:3000/api/users \
  -H "Authorization: Bearer $TOKEN"
```

---

## 4️⃣ Common Commands

### Service Management
```bash
# Start service
npm run dev

# Start with nodemon (auto-reload)
npm run dev

# Start in production mode
npm start

# Stop service
Ctrl+C
```

### Docker Commands
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f user-auth-service

# Stop services
docker-compose down

# Restart service
docker-compose restart user-auth-service

# Remove everything (including data)
docker-compose down -v
```

### Database Commands
```bash
# Connect to MongoDB
mongosh mongodb://localhost:27017/user_db

# View all users
db.users.find().pretty()

# Count users
db.users.countDocuments()

# Drop database (reset)
use user_db
db.dropDatabase()
```

---

## 5️⃣ API Quick Reference

### Base URL
```
http://localhost:3000
```

### Public Endpoints (No Auth)
```bash
# Register
POST /api/auth/register

# Login
POST /api/auth/login

# Health Check
GET /health
```

### Protected Endpoints (Requires Token)
```bash
# Get current user
GET /api/auth/me

# Change password
POST /api/auth/change-password

# Logout
POST /api/auth/logout

# Get all users (admin only)
GET /api/users

# Create user (admin only)
POST /api/users

# Get user by ID (admin or self)
GET /api/users/:id

# Update user (admin or self)
PUT /api/users/:id

# Delete user (admin only)
DELETE /api/users/:id
```

### Authorization Header Format
```bash
Authorization: Bearer <your-jwt-token>
```

---

## 6️⃣ Environment Variables

Default `.env` configuration:
```env
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/user_db
JWT_SECRET=your-secret-key-change-in-production
SESSION_DURATION_HOURS=24
```

**⚠️ Important:** Change `JWT_SECRET` in production!

---

## 7️⃣ Troubleshooting

### Service won't start
```bash
# Check if port 3000 is already in use
lsof -i :3000

# Kill process on port 3000
kill -9 $(lsof -t -i:3000)

# Or use a different port in .env
echo "PORT=3001" >> .env
```

### MongoDB connection error
```bash
# Check if MongoDB is running
docker ps | grep mongodb

# If not running, start it
docker run -d -p 27017:27017 --name mongodb mongo:6

# Or with docker-compose
docker-compose up -d mongodb
```

### Token expired error
```bash
# Login again to get a new token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"login":"admin","password":"admin123"}'
```

### Reset everything
```bash
# Stop service
Ctrl+C

# Remove MongoDB data
docker-compose down -v

# Start fresh
docker-compose up -d
./test-api.sh
```

---

## 8️⃣ Next Steps

1. ✅ **Test locally** - Run `./test-api.sh`
2. ✅ **Integrate with frontend** - Update frontend API URLs
3. ✅ **Deploy to staging** - Use Docker or Kubernetes
4. ✅ **Set up CI/CD** - Automate builds and deployments
5. ✅ **Monitor logs** - Use logging service
6. ✅ **Scale as needed** - Add more instances

---

## 9️⃣ File Locations

```
📁 Project Root:
/Volumes/SSD Sakib/Office -25/leadpylot/backend/microservices/user-auth-service/

📄 Key Files:
├── src/app.js                 - Main entry point
├── package.json               - Dependencies
├── docker-compose.yml         - Docker setup
├── .env                       - Environment config
├── test-api.sh                - Test script
└── README.md                  - Full documentation
```

---

## 🔟 Support

For more details, see:
- `README.md` - Complete documentation
- `TESTING_GUIDE.md` - Detailed testing instructions
- `COMPLETION_SUMMARY.md` - Full feature list

---

**Happy coding! 🎉**

