# Lead & Offers Service - Setup Guide

This guide will help you set up the Lead & Offers Service as an independent project.

## Files Created

The following files have been created to make this service independent:

1. **`.gitignore`** - Git ignore file for Node.js projects
2. **`README.md`** - Comprehensive documentation for the service
3. **`docker-compose.yml`** - Docker Compose configuration for local development
4. **`ENV_TEMPLATE.txt`** - Template for environment variables

## Manual Steps Required

### 1. Create `.env` File

You need to manually create a `.env` file in the root directory. Use the `ENV_TEMPLATE.txt` file as a reference:

```bash
cd lead-offers-service
cp ENV_TEMPLATE.txt .env
```

Then edit `.env` and update all the values with your actual configuration:
- Database connection strings
- AWS credentials (if using cloud storage)
- JWT secrets
- External service URLs
- Other service-specific configurations

**Important**: Never commit the `.env` file to version control. It's already included in `.gitignore`.

### 2. Install Dependencies

If you haven't already installed dependencies:

```bash
npm install
```

### 3. Set Up MongoDB

Ensure MongoDB is running and accessible. You can either:

**Option A: Use existing MongoDB**
- Update `MONGODB_URI` in your `.env` file

**Option B: Use Docker Compose (includes MongoDB)**
```bash
docker-compose up -d
```

**Option C: Run MongoDB locally**
```bash
# Using Docker
docker run -d -p 27017:27017 --name mongodb mongo:7.0

# Or install MongoDB locally
```

### 4. Run Database Migrations (Optional but Recommended)

```bash
npm run migrate:indexes
```

This will create necessary database indexes for optimal performance.

### 5. Start the Service

**Development mode:**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

**Using Docker:**
```bash
docker-compose up -d
```

## Verification

Once the service is running, verify it's working:

1. **Health Check:**
   ```bash
   curl http://localhost:4003/health
   ```

2. **Service Info:**
   ```bash
   curl http://localhost:4003/info
   ```

3. **API Documentation:**
   ```bash
   curl http://localhost:4003/
   ```

## Configuration Checklist

Before running the service, ensure you have configured:

- [ ] `.env` file created with all required variables
- [ ] MongoDB connection string is correct
- [ ] JWT_SECRET is set (use a strong secret in production)
- [ ] External service URLs are correct (if using other microservices)
- [ ] AWS credentials are set (if using cloud storage)
- [ ] CORS_ORIGIN is set to your frontend URL
- [ ] FreePBX/VoIP settings (if using VoIP features)

## Running as Independent Project

The service is now configured to run independently. You can:

1. **Run it standalone** - Just start the service and connect to your MongoDB
2. **Use Docker Compose** - Includes MongoDB and the service
3. **Deploy to production** - Use the Dockerfile for containerized deployment

## Next Steps

1. Review the `README.md` for detailed API documentation
2. Configure all environment variables in `.env`
3. Test the service endpoints
4. Set up monitoring and logging as needed
5. Configure reverse proxy/load balancer if needed

## Troubleshooting

### Port Already in Use
If port 4003 is already in use, change the `PORT` in your `.env` file.

### MongoDB Connection Issues
- Verify MongoDB is running
- Check the `MONGODB_URI` in `.env`
- Ensure network connectivity

### Missing Environment Variables
- Check `ENV_TEMPLATE.txt` for all required variables
- Ensure all required variables are set in `.env`

## Support

For issues or questions, refer to the main `README.md` file or contact the development team.


