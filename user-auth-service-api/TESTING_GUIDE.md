# 🧪 Testing Guide - User & Auth Microservice

## Quick Start

```bash
cd "/Volumes/SSD Sakib/Office -25/leadpylot/backend/microservices/user-auth-service"
npm install
npm run dev
```

---

## 📋 Prerequisites

### Required
- ✅ Node.js >= 18
- ✅ MongoDB >= 6 (running locally or Docker)
- ✅ npm or yarn

### Optional
- Docker & Docker Compose (for containerized testing)
- Postman or curl (for API testing)

---

## 🚀 Testing Methods

### Method 1: Local Testing (Recommended for Development)

#### Step 1: Install Dependencies
```bash
cd "/Volumes/SSD Sakib/Office -25/leadpylot/backend/microservices/user-auth-service"
npm install
```

#### Step 2: Start MongoDB (if not running)
```bash
# Option A: Using Docker
docker run -d -p 27017:27017 --name mongodb mongo:6

# Option B: Using local MongoDB
mongod --dbpath /path/to/data
```

#### Step 3: Create .env File
```bash
cp .env.example .env
```

Edit `.env`:
```env
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/user_db
JWT_SECRET=test-secret-key-change-in-production
```

#### Step 4: Start the Service
```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

You should see:
```
✅ MongoDB connected successfully
Database: user_db
🚀 User & Auth Service running on port 3000
```

---

### Method 2: Docker Testing

#### Step 1: Build and Run with Docker Compose
```bash
cd "/Volumes/SSD Sakib/Office -25/leadpylot/backend/microservices/user-auth-service"

# Start services
docker-compose up -d

# View logs
docker-compose logs -f user-auth-service

# Check status
docker-compose ps
```

#### Step 2: Verify Containers are Running
```bash
docker ps
```

You should see:
- `user-auth-service` (running on port 3000)
- `user-auth-mongodb` (running on port 27017)

---

## 🧪 API Testing

### 1. Health Check (No Auth Required)

```bash
curl http://localhost:3000/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "service": "user-auth-service",
  "timestamp": "2025-10-13T...",
  "uptime": 12.345
}
```

### 2. Readiness Check (Database Connection)

```bash
curl http://localhost:3000/ready
```

**Expected Response:**
```json
{
  "status": "ready",
  "database": "connected"
}
```

---

## 📝 Authentication Flow Testing

### Step 1: Register First User (Admin)

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "login": "admin",
    "password": "admin123",
    "role": "Admin"
  }'
```

**Expected Response (200):**
```json
{
  "user": {
    "_id": "...",
    "login": "admin",
    "role": "Admin"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Save the token!** You'll need it for authenticated requests.

---

### Step 2: Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "login": "admin",
    "password": "admin123"
  }'
```

**Expected Response (200):**
```json
{
  "user": {
    "_id": "...",
    "login": "admin",
    "role": "Admin"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "sessionId": "..."
}
```

---

### Step 3: Get Current User (Authenticated)

```bash
TOKEN="<your-token-from-login>"

curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response (200):**
```json
{
  "_id": "...",
  "login": "admin",
  "role": "Admin",
  "active": true,
  "create_date": "..."
}
```

---

### Step 4: Change Password

```bash
curl -X POST http://localhost:3000/api/auth/change-password \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "currentPassword": "admin123",
    "newPassword": "newpassword123"
  }'
```

**Expected Response (200):**
```json
{
  "message": "Password updated successfully",
  "user": {
    "_id": "...",
    "login": "admin"
  }
}
```

---

### Step 5: Logout

```bash
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response (200):**
```json
{
  "message": "Logout successful"
}
```

---

### Step 6: Try to Access Protected Route After Logout

```bash
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response (401):**
```json
{
  "error": "Session expired or terminated"
}
```

✅ **Success!** The session was properly terminated.

---

## 🔐 Testing Different Roles

### Create an Agent User (as Admin)

```bash
# Login as admin first to get token
TOKEN="<admin-token>"

# Register an agent
curl -X POST http://localhost:3000/api/auth/register \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "login": "agent1",
    "password": "agent123",
    "role": "Agent"
  }'
```

### Test Agent Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "login": "agent1",
    "password": "agent123"
  }'
```

---

## ❌ Testing Error Cases

### 1. Invalid Credentials

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "login": "admin",
    "password": "wrongpassword"
  }'
```

**Expected (401):**
```json
{
  "error": "Invalid login credentials"
}
```

### 2. Missing Token

```bash
curl -X GET http://localhost:3000/api/auth/me
```

**Expected (401):**
```json
{
  "error": "Authentication required"
}
```

### 3. Expired/Invalid Token

```bash
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer invalid_token"
```

**Expected (401):**
```json
{
  "error": "Invalid token"
}
```

---

## 🧪 Postman Collection

### Import This Collection

Create a file `user-auth-tests.postman_collection.json`:

```json
{
  "info": {
    "name": "User Auth Service",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "variable": [
    {
      "key": "baseUrl",
      "value": "http://localhost:3000"
    },
    {
      "key": "token",
      "value": ""
    }
  ],
  "item": [
    {
      "name": "Health Check",
      "request": {
        "method": "GET",
        "url": "{{baseUrl}}/health"
      }
    },
    {
      "name": "Register Admin",
      "request": {
        "method": "POST",
        "url": "{{baseUrl}}/api/auth/register",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"login\": \"admin\",\n  \"password\": \"admin123\",\n  \"role\": \"Admin\"\n}"
        }
      }
    },
    {
      "name": "Login",
      "request": {
        "method": "POST",
        "url": "{{baseUrl}}/api/auth/login",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"login\": \"admin\",\n  \"password\": \"admin123\"\n}"
        }
      },
      "event": [
        {
          "listen": "test",
          "script": {
            "exec": [
              "var jsonData = pm.response.json();",
              "pm.environment.set(\"token\", jsonData.token);"
            ]
          }
        }
      ]
    },
    {
      "name": "Get Current User",
      "request": {
        "method": "GET",
        "url": "{{baseUrl}}/api/auth/me",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{token}}"
          }
        ]
      }
    },
    {
      "name": "Logout",
      "request": {
        "method": "POST",
        "url": "{{baseUrl}}/api/auth/logout",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{token}}"
          }
        ]
      }
    }
  ]
}
```

---

## 🐛 Troubleshooting

### Issue: "MongoDB connection error"

**Solution 1:** Start MongoDB
```bash
docker run -d -p 27017:27017 --name mongodb mongo:6
```

**Solution 2:** Check MongoDB URI in `.env`
```env
MONGODB_URI=mongodb://localhost:27017/user_db
```

### Issue: "Port 3000 already in use"

**Solution:** Change port in `.env`
```env
PORT=3001
```

### Issue: "Module not found"

**Solution:** Reinstall dependencies
```bash
rm -rf node_modules package-lock.json
npm install
```

### Issue: "Token expired"

**Solution:** Login again to get a new token

---

## 📊 Expected Test Results

### ✅ Successful Test Checklist

- [ ] Health check returns 200
- [ ] Readiness check shows database connected
- [ ] Can register first admin user
- [ ] Can login with correct credentials
- [ ] Receive valid JWT token
- [ ] Can access protected routes with token
- [ ] Can't access protected routes without token
- [ ] Invalid credentials are rejected
- [ ] Can change password
- [ ] Can logout successfully
- [ ] Token is invalidated after logout

---

## 🔍 Monitoring & Logs

### View Application Logs

**Local:**
```bash
# Logs appear in console where you ran npm run dev
```

**Docker:**
```bash
docker-compose logs -f user-auth-service
```

### Check MongoDB Data

```bash
# Connect to MongoDB
mongosh mongodb://localhost:27017/user_db

# List users
db.users.find().pretty()

# List sessions
db.usersessions.find().pretty()
```

---

## 🎯 Performance Testing

### Load Test with Apache Bench

```bash
# Install ab (Apache Bench)
# macOS: brew install httpd
# Linux: apt-get install apache2-utils

# Test health endpoint (1000 requests, 10 concurrent)
ab -n 1000 -c 10 http://localhost:3000/health
```

### Expected Performance

- **Health Check:** < 10ms
- **Login:** < 200ms
- **Token Validation:** < 50ms

---

## 🧹 Cleanup

### Stop Local Service
```bash
# Press Ctrl+C in terminal running npm run dev
```

### Stop Docker Services
```bash
docker-compose down

# Remove volumes (wipes data)
docker-compose down -v
```

### Remove MongoDB Container
```bash
docker stop mongodb
docker rm mongodb
```

---

## ✅ Test Summary

Once you've completed all tests, you should have verified:

1. ✅ Service starts successfully
2. ✅ Database connection works
3. ✅ Health checks pass
4. ✅ User registration works
5. ✅ Login returns valid tokens
6. ✅ Authentication middleware validates tokens
7. ✅ Session management works
8. ✅ Password changes work
9. ✅ Logout terminates sessions
10. ✅ Error handling works correctly

---

**🎉 If all tests pass, your User & Auth microservice is ready for integration!**

