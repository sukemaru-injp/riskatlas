import { runScheduledFetch } from "./handler";
import type {
	Env,
	ExecutionContext,
	ExportedHandler,
	ScheduledController
} from "./types";

export default {
	scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext) {
		ctx.waitUntil(runScheduledFetch({ controller, env }));
	}
} satisfies ExportedHandler<Env>;
