import { runScheduledFetch } from "./handler";
import type { Env, ScheduledController } from "./types";

const controller = {
	cron: "local",
	type: "scheduled",
	scheduledTime: Date.now()
} satisfies ScheduledController;

const env = {} satisfies Env;

const result = await runScheduledFetch({ controller, env });

console.log(JSON.stringify(result, null, 2));
