import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import { pino } from "pino";
import { healthCheckRouter } from "@/api/healthCheck/healthCheckRouter";
import { metaRouter } from "@/api/meta/metaRouter";
import { restaurantRouter } from "@/api/restaurant/restaurantRouter";
import { openAPIRouter } from "@/api-docs/openAPIRouter";
import errorHandler from "@/common/middleware/errorHandler";
import rateLimiter from "@/common/middleware/rateLimiter";
import requestLogger from "@/common/middleware/requestLogger";
import { env } from "@/common/utils/envConfig";

const logger = pino({ name: "server start" });
const app: Express = express();

// Local clients connect directly: do not trust client-supplied forwarding headers.
// Behind a reverse proxy, configure only its known addresses/subnets, never `true`.
app.set("trust proxy", false);

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(helmet());
app.use(rateLimiter);

// Request logging
app.use(requestLogger);

// Routes
app.use("/health-check", healthCheckRouter);
app.use("/restaurants", restaurantRouter);
app.use("/meta", metaRouter);

// The unrelated boilerplate /users API is intentionally disabled. RR has no
// account/authentication scope, so exposing personal fields would be unsafe.
// Keep this explicit refusal before the root-mounted Swagger middleware.
app.use("/users", (_req, res) => res.sendStatus(404));

// Swagger UI
app.use(openAPIRouter);

// Error handlers
app.use(errorHandler());

export { app, logger };
