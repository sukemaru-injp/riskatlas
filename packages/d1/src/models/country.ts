import type { InferSelectModel } from "drizzle-orm";
import type { countries } from "../schema";

export type Country = InferSelectModel<typeof countries>;

export type CreateCountryInput = {
	code: string;
	name: string;
};
