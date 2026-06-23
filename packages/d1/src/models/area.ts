import type { InferSelectModel } from "drizzle-orm";
import type { areas } from "../schema";

export type Area = InferSelectModel<typeof areas>;

export type CreateAreaInput = {
	code: string;
	name: string;
};
