import {
	type AnyD1Database,
	type DrizzleD1Database,
	drizzle
} from "drizzle-orm/d1";
import * as schema from "./schema";

export type Db = DrizzleD1Database<typeof schema>;
export type D1Binding = AnyD1Database;

export function createDb(database: D1Binding): Db {
	return drizzle(database, { schema });
}
