# Next.js Build Optimization Guide for Low-Memory Servers (2GB RAM)

## Problem
Next.js builds taking 7+ minutes on AWS servers with 2GB RAM due to memory constraints and build complexity.

## Solutions Implemented

### 1. Next.js Configuration Updates ✅
- **Disabled source maps** in production (`productionBrowserSourceMaps: false`)
- **Standalone output** for optimized deployments
- **Memory optimizations** enabled (`webpackMemoryOptimizations: true`)
- **Console removal** in production builds
- **Turbopack root** configured to eliminate lockfile warnings

### 2. Build Script Optimizations ✅
Updated `package.json` with memory-limited build commands:
- `npm run build` - Limited to 1.5GB RAM (1536MB)
- `npm run build:prod` - Limited to 1.5GB with size optimizations

## Critical Server-Side Optimizations (Run on AWS Server)

### Step 1: Add Swap Space (MOST IMPORTANT)
Without swap space, builds may fail or be extremely slow. Add 2GB swap:

```bash
# Check if swap exists
sudo swapon --show

# Create 2GB swap file
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Make it permanent (survives reboots)
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Verify swap is active
free -h
```

**Expected Result:** You should see 2GB swap space, reducing memory pressure during builds.

### Step 2: Enable Build Caching
Next.js caching can reduce subsequent build times significantly:

```bash
# Ensure .next/cache directory exists and persists
cd /home/ubuntu/leadpylot/frontend

# If using Docker, mount .next/cache as a volume
# If using PM2/direct deployment, ensure .next/cache is not deleted between builds
```

### Step 3: Optimize Node.js Settings on Server
Create or update your deployment script:

```bash
# Before running build, set Node options
export NODE_OPTIONS="--max-old-space-size=1536 --optimize-for-size"
export NODE_ENV=production

# Then run build
npm run build
```

### Step 4: Use PM2 for Memory Management
If using PM2, configure it to limit memory:

```bash
# Update your PM2 ecosystem file
pm2 start npm --name "leadpylot-build" \
  --max-memory-restart 1500M \
  -- run build
```

### Step 5: Parallel Build Optimization
Reduce parallel webpack workers to limit memory usage. Create `.env.production`:

```bash
# In /home/ubuntu/leadpylot/frontend/.env.production
NEXT_PARALLEL_BUILD=false
```

### Step 6: Clean Up Before Building
Remove unnecessary files to free up memory:

```bash
cd /home/ubuntu/leadpylot/frontend

# Clean previous builds
rm -rf .next
rm -rf node_modules/.cache

# Then build
npm run build
```

## Alternative: Build Locally or CI/CD Pipeline

For even faster deployments, consider:

### Option A: Build on Development Machine
```bash
# On your local machine (with more RAM)
npm run build

# Copy the standalone build to server
scp -r .next/standalone ubuntu@your-server:/home/ubuntu/leadpylot/frontend/
scp -r .next/static ubuntu@your-server:/home/ubuntu/leadpylot/frontend/.next/
scp -r public ubuntu@your-server:/home/ubuntu/leadpylot/frontend/
```

### Option B: GitHub Actions / GitLab CI
Build in CI/CD with more resources, then deploy pre-built artifacts:

```yaml
# .github/workflows/deploy.yml
name: Build and Deploy

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        working-directory: ./frontend
        run: npm ci
      
      - name: Build
        working-directory: ./frontend
        run: npm run build
      
      - name: Deploy to server
        uses: easingthemes/ssh-deploy@main
        with:
          SSH_PRIVATE_KEY: ${{ secrets.SSH_PRIVATE_KEY }}
          REMOTE_HOST: ${{ secrets.REMOTE_HOST }}
          REMOTE_USER: ubuntu
          SOURCE: "frontend/.next/"
          TARGET: "/home/ubuntu/leadpylot/frontend/"
```

### Option C: Docker Multi-Stage Build
Use a more powerful build container:

```dockerfile
# frontend/Dockerfile.optimized
FROM node:18-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source
COPY . .

# Build with memory limits
ENV NODE_OPTIONS="--max-old-space-size=3072"
RUN npm run build

# Runtime stage (smaller)
FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy standalone build
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3001

CMD ["node", "server.js"]
```

## Expected Build Time Improvements

| Method | Expected Time | Notes |
|--------|---------------|-------|
| Current (no optimization) | 7-10 min | Out of memory risks |
| With swap + config | 4-6 min | Stable, reliable |
| With CI/CD build | 2-3 min (local) | Faster deploys |
| Cached builds | 1-2 min | Subsequent builds |

## Monitoring Build Performance

Monitor your build:

```bash
# Check memory usage during build
watch -n 1 free -h

# Check build logs
npm run build 2>&1 | tee build.log

# Check swap usage
vmstat 1
```

## Troubleshooting

### Build Fails with "JavaScript heap out of memory"
- Increase `max-old-space-size` (but not above 1800 on 2GB server)
- Ensure swap is active
- Close other processes during build

### Build is Still Slow
- Check if swap is being used: `sudo swapon --show`
- Disable antivirus/monitoring during build
- Use `npm ci` instead of `npm install`
- Clear npm cache: `npm cache clean --force`

### Verifying Standalone Output
After build completes:

```bash
# The standalone output should be in
ls -lah /home/ubuntu/leadpylot/frontend/.next/standalone

# To run standalone:
cd /home/ubuntu/leadpylot/frontend/.next/standalone
node server.js
```

## Summary of Key Changes

1. ✅ `next.config.mjs` - Added memory optimizations and turbopack root
2. ✅ `package.json` - Added memory-limited build scripts
3. ⚠️ AWS Server - **MUST add swap space** (run commands above)
4. 📝 Optional - Consider CI/CD or local builds for better performance

## Quick Setup Commands for AWS Server

```bash
# Connect to your server
ssh ubuntu@your-aws-server

# 1. Add swap
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# 2. Navigate to project
cd /home/ubuntu/leadpylot/frontend

# 3. Pull latest changes (with optimized config)
git pull

# 4. Run optimized build
npm run build

# 5. Monitor memory
watch -n 1 free -h
```

## Next Steps

After implementing these optimizations:
1. Commit and push the config changes
2. Deploy to your AWS server
3. Add swap space (most critical!)
4. Test the new build process
5. Monitor build times and memory usage

Your build time should reduce from 7 minutes to approximately 4-5 minutes with these optimizations.

