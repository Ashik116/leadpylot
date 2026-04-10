# Environment Setup

Cross-env configuration for dev, prod, and multi-CRM deployments.

## Quick Start

### Development
```bash
npm run dev
```
Uses `.env.dev` (localhost microservices).  
**Note:** Next.js also loads `.env` and `.env.local` if present—those can override `.env.dev`. For clean dev, avoid conflicting vars in `.env.local`.

### Production (single deployment)
```bash
# 1. Edit .env.prod with your domain and secrets
# 2. Build
npm run build
npm run start
```

### Production (5-6 CRM deployments)
```bash
# 1. Copy template for each CRM
cp env/.env.prod.crm1.example .env.prod.crm1
cp env/.env.prod.crm1.example .env.prod.crm2
# ... etc

# 2. Edit each .env.prod.crmX with domain-specific values

# 3. Build per CRM
npm run build:crm1   # → deploy to crm1.yourdomain.com
npm run build:crm2   # → deploy to crm2.yourdomain.com
# ...
```

## Env Files

| File | Purpose | Committed? |
|------|---------|------------|
| `.env.dev` | Local development | Yes |
| `.env.prod` | Default production | Yes (template) |
| `.env.prod.crm1` - `.env.prod.crm6` | Per-CRM production | No (gitignored) |
| `.env.local` | Local overrides | No (gitignored) |

## Scripts

| Script | Env File |
|--------|----------|
| `npm run dev` | `.env.dev` |
| `npm run build` | `.env.prod` |
| `npm run build:crm1` | `.env.prod.crm1` |
| `npm run build:crm2` | `.env.prod.crm2` |
| ... | ... |
| `npm run build:crm6` | `.env.prod.crm6` |

## Docker

For Docker builds, run the CRM build before building the image, or pass build args:

```bash
# Option 1: Build first, then docker
npm run build:crm1
docker build -f Dockerfile.prod .

# Option 2: Dockerfile with env file (requires custom Dockerfile)
# COPY .env.prod.crm1 .env.production
# RUN npm run build
```

## Adding More CRMs (7+)

1. Create `.env.prod.crm7` (copy from `.env.prod.crm1.example`)
2. Add to `package.json`:
   ```json
   "build:crm7": "cross-env NODE_OPTIONS=--max-old-space-size=1536 env-cmd -f .env.prod.crm7 next build"
   ```
3. Add to `.gitignore`: `.env.prod.crm7`
