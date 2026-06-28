import { runScheduledFetch } from "./handler";
import { logger } from "./logger";
import type { Env, ScheduledController } from "./types";

const controller = {
	cron: "local",
	type: "scheduled",
	scheduledTime: Date.now()
} satisfies ScheduledController;

const env = {} satisfies Env;

const result = await runScheduledFetch({ controller, env });

logger.info({ result }, "MOFA new arrival local run completed");
