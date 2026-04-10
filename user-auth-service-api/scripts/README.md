# Admin User Management Scripts

This directory contains utility scripts for managing admin users in the User & Auth Service.

## 🔧 Available Scripts

### 1. Create Admin User

Creates a new admin user with specified credentials.

**Usage:**

```bash
# Create default admin (itadmin/itadmin)
node scripts/create-admin.js

# Create custom admin user
node scripts/create-admin.js myusername mypassword
```

**Example:**

```bash
cd /path/to/user-auth-service
node scripts/create-admin.js superadmin mysecurepassword
```

**Output:**

```
================================================
         Admin User Creation Script
================================================

✅ Connected to MongoDB
✅ Admin user "superadmin" created successfully!

✅ SUCCESS!

📋 Admin User Credentials:
   Username: superadmin
   Password: mysecurepassword
   Role: Admin

⚠️  IMPORTANT: Please change the password after first login!

================================================
```

## 🚀 Automatic Initialization

The User & Auth Service automatically creates a default admin user on first startup if no admin exists:

- **Username:** `itadmin`
- **Password:** `itadmin`
- **Role:** `Admin`

This happens automatically when you start the service:

```bash
npm start
# or
node src/app.js
```

You'll see this in the logs:

```
🔄 Initializing database...
🔧 Creating default admin user...
✅ Default admin user created successfully!
📋 Login credentials:
   Username: itadmin
   Password: itadmin
⚠️  IMPORTANT: Please change the default password after first login!
```

## 🔐 Security Notes

1. **Change Default Password:** Always change the default `itadmin` password after first login
2. **Production:** In production, use strong passwords and consider:
   - Password rotation policies
   - Multi-factor authentication (MFA)
   - IP whitelisting for admin access
3. **Environment Variables:** Store sensitive credentials in environment variables, not in code

## 📝 Database Functions

The `dbInitializer.js` utility provides these functions:

### `initializeDatabase()`

- Automatically called on server startup
- Creates default admin user (`itadmin/itadmin`) if no admin exists
- Safe to call multiple times (checks before creating)

### `createAdminUser(login, password, additionalFields)`

- Creates a custom admin user
- Returns success/failure status
- Prevents duplicate usernames

### `adminExists()`

- Checks if any admin user exists in the system
- Returns boolean

## 🧪 Testing

To test the initialization:

1. Clear all users from the database (in development only):

   ```bash
   mongo leadpylot --eval "db.users.deleteMany({})"
   ```

2. Start the service:

   ```bash
   npm start
   ```

3. Check logs for initialization message

4. Try logging in with `itadmin/itadmin`

## 📚 Related Files

- `/src/utils/dbInitializer.js` - Database initialization utility
- `/src/app.js` - Server startup (calls `initializeDatabase()`)
- `/src/models/User.js` - User model definition
- `/src/auth/services/passwordService.js` - Password hashing/verification
