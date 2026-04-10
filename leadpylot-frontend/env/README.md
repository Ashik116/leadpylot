# Domain-Specific Environment Configs

For deploying to 5-6 different CRM domains, create one env file per CRM:

## Setup

1. Copy the example for your CRM:
   ```bash
   cp env/.env.prod.crm1.example .env.prod.crm1
   # or .env.prod.crm2, .env.prod.crm3, etc.
   ```

2. Edit `.env.prod.crm1` with your domain and secrets.

3. Build for that CRM:
   ```bash
   npm run build:crm1
   ```

## Available Build Scripts

| Script | Env File | Use Case |
|--------|----------|----------|
| `npm run dev` | `.env.dev` | Local development |
| `npm run build` | `.env.prod` | Default production |
| `npm run build:crm1` | `.env.prod.crm1` | CRM 1 deployment |
| `npm run build:crm2` | `.env.prod.crm2` | CRM 2 deployment |
| `npm run build:crm3` | `.env.prod.crm3` | CRM 3 deployment |
| `npm run build:crm4` | `.env.prod.crm4` | CRM 4 deployment |
| `npm run build:crm5` | `.env.prod.crm5` | CRM 5 deployment |
| `npm run build:crm6` | `.env.prod.crm6` | CRM 6 deployment |
| `npm run build:crm` | `.env.prod.crm{N}` | Custom: `npm run build:crm 3` |

## Adding More CRMs

1. Copy any `.env.prod.crm*.example` to `.env.prod.crm7` (etc.)
2. Add script in `package.json`:
   ```json
   "build:crm7": "env-cmd -f .env.prod.crm7 next build"
   ```

## Docker Build

For Docker, pass the env file at build time:

```bash
# Build with CRM-specific env
docker build --build-arg ENV_FILE=.env.prod.crm1 -f Dockerfile.prod .
```

Or use the npm script before docker build:
```bash
npm run build:crm1
# Then copy .next into your image
```
