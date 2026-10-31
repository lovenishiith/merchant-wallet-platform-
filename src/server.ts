import app from "./app";
import { env } from "./config/env";
import { logger } from "./config/logger";
import "./config/db";

app.listen(env.PORT, () => {
  logger.info(`Server running on http://localhost:${env.PORT}`);
});