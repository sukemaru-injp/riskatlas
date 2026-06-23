import type { D1Binding } from "@riskatlas/d1";

export type Env = {
	DB?: D1Binding;
	MOFA_NEW_ARRIVAL_FEED_URL?: string;
};

export type ScheduledController = {
	cron: string;
	type: "scheduled";
	scheduledTime: number;
};

export type ExecutionContext = {
	waitUntil(promise: Promise<unknown>): void;
};

export type ExportedHandler<TEnv> = {
	scheduled(
		controller: ScheduledController,
		env: TEnv,
		ctx: ExecutionContext
	): void | Promise<void>;
};
