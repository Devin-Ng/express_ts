# 🚀 Express TypeScript Boilerplate 2025

[![CI](https://github.com/edwinhern/express-typescript/actions/workflows/ci.yml/badge.svg?branch=master)](https://github.com/edwinhern/express-typescript-2024/actions/workflows/ci.yml)

```code
Hey There! 🙌
🤾 that ⭐️ button if you like this boilerplate.
```

## 🌟 Introduction

Welcome to Express TypeScript Boilerplate 2025 – a simple and ready-to-use starting point for building backend web services with Express.js and TypeScript.

## 💡 Why We Made This

This starter kit helps you:

- ✨ Start new projects faster
- 📊 Write clean, consistent code
- ⚡ Build things quickly
- 🛡️ Follow best practices for security and testing

## 🚀 What's Included

- 📁 Well-organized folders: Files grouped by feature so you can find things easily
- 💨 Fast development: Quick code running with `tsx` and error checking with `tsc`
- 🌐 Latest Node.js: Uses the newest stable Node.js version from `.tool-versions`
- 🔧 Safe settings: Environment settings checked with Zod to prevent errors
- 🔗 Short import paths: Clean code with easy imports using path shortcuts
- 🔄 Auto-updates: Keeps dependencies up-to-date with Renovate
- 🔒 Better security: Built-in protection with Helmet and CORS settings
- 📊 Easy tracking: Built-in logging with `pino-http`
- 🧪 Ready-to-test: Testing tools with Vitest and Supertest already set up
- ✅ Clean code: Consistent coding style with `Biomejs`
- 📃 Standard responses: Unified API responses using `ServiceResponse`
- 🐳 Easy deployment: Ready for Docker containers
- 📝 Input checking: Request validation using Zod
- 🧩 API browser: Interactive API docs with Swagger UI

## 🛠️ Getting Started

### Video Demo

For a visual guide, watch the [video demo](https://github.com/user-attachments/assets/b1698dac-d582-45a0-8d61-31131732b74e) to see the setup and running of the project.

### Step-by-Step Guide

#### Step 1: 🚀 Initial Setup

- Clone the repository: `git clone https://github.com/edwinhern/express-typescript.git`
- Navigate: `cd express-typescript`
- Install dependencies: `pnpm install`

#### Step 2: ⚙️ Environment Configuration

- Create `.env`: Copy `.env.template` to `.env`
- Update `.env`: Fill in necessary environment variables

#### Step 3: 🏃‍♂️ Running the Project

- Development Mode: `pnpm start:dev`
- Building: `pnpm build`
- Production Mode: Set `NODE_ENV="production"` in `.env` then `pnpm build && pnpm start:prod`

## 🇭🇰 Hong Kong restaurant API (RR app)

This project also powers the **RR** React Native app (random Hong Kong
restaurant picker). The restaurant feature was extended with:

- `district` on `restaurants` and `photo_url` on `main_dishes`
- a curated seed of 135 real Hong Kong restaurants (202 signature dishes)
  across all 18 districts

### Local MySQL setup on Windows

See [MYSQL_SETUP.md](MYSQL_SETUP.md) for checking MySQL Server in Workbench, creating the local database/user, setting `.env`, and running `pnpm db:check`. Workbench alone does not install the database server.

### Database scripts

Use the read-only inventory before choosing a database path. The historic `001_hk_schema.sql` contains a catalog delete; the migration runner now fails closed while it is pending, before executing any migration-file SQL. Do not bypass it. `db:seed:sample` is additive; `db:seed` is a separately guarded disposable reset. See [DATABASE_SAFETY_RUNBOOK.md](DATABASE_SAFETY_RUNBOOK.md) and [MYSQL_SETUP.md](MYSQL_SETUP.md).

```bash
pnpm db:check          # read-only connectivity check; does not check tables
pnpm db:inventory      # read-only metadata/count/migration inventory
pnpm db:migrate        # refuses the historic pending 001 chain; reviewed paths only
pnpm db:seed:sample    # additive sample import; preserves matching records and IDs
pnpm db:seed           # destructive reset; explicit disposable-only gate
```

The inventory script is configured in `package.json`. Never run migration, reset, or fixture commands against valuable data. P0 uses Node 22.23.2 and pnpm 10.33.0; install with `pnpm install --frozen-lockfile`. The backend `pnpm-lock.yaml` is canonical; do not use the old ignored npm lockfile.

### Endpoints

The unrelated boilerplate `/users` routes are intentionally disabled and are not published in OpenAPI. RR has no account/authentication scope.

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/restaurants` | Optional filters: `region`, `district`, `dishType`, `minRating` |
| GET | `/restaurants/random` | Same filters, one random match |
| GET | `/restaurants/:id` | Includes `district` |
| GET | `/restaurants/:id/dishes` | Includes `photoUrl` |
| GET | `/meta/filters` | `regions`, `districtsByRegion`, `dishTypes` for the app filter UI |

Example:

```bash
curl "http://localhost:8080/restaurants/random?region=Kowloon&minRating=4"
curl "http://localhost:8080/meta/filters"
```

> Ratings and review counts are demo values. Restaurant names, districts and
> cuisines reflect real Hong Kong places; dish photos are Unsplash stock images.

## 🤝 Feedback and Contributions

We'd love to hear your feedback and suggestions for further improvements. Feel free to contribute and join us in making backend development cleaner and faster!

🎉 Happy coding!

## 📁 Folder Structure

```code
├── biome.json
├── Dockerfile
├── LICENSE
├── package.json
├── pnpm-lock.yaml
├── README.md
├── src
│   ├── api
│   │   ├── healthCheck
│   │   │   ├── __tests__
│   │   │   │   └── healthCheckRouter.test.ts
│   │   │   └── healthCheckRouter.ts
│   │   └── user
│   │       ├── __tests__
│   │       │   ├── userRouter.test.ts
│   │       │   └── userService.test.ts
│   │       ├── userController.ts
│   │       ├── userModel.ts
│   │       ├── userRepository.ts
│   │       ├── userRouter.ts
│   │       └── userService.ts
│   ├── api-docs
│   │   ├── __tests__
│   │   │   └── openAPIRouter.test.ts
│   │   ├── openAPIDocumentGenerator.ts
│   │   ├── openAPIResponseBuilders.ts
│   │   └── openAPIRouter.ts
│   ├── common
│   │   ├── __tests__
│   │   │   ├── errorHandler.test.ts
│   │   │   └── requestLogger.test.ts
│   │   ├── middleware
│   │   │   ├── errorHandler.ts
│   │   │   ├── rateLimiter.ts
│   │   │   └── requestLogger.ts
│   │   ├── models
│   │   │   └── serviceResponse.ts
│   │   └── utils
│   │       ├── commonValidation.ts
│   │       ├── envConfig.ts
│   │       └── httpHandlers.ts
│   ├── index.ts
│   └── server.ts
├── tsconfig.json
└── vite.config.mts
```

## venv command

.\venv\Scripts\activate
deactivate
