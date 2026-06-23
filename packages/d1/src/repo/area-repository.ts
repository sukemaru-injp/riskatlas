import { eq } from "drizzle-orm";
import type { Db } from "../db";
import type { Area, CreateAreaInput } from "../models";
import { areas } from "../schema";

export class AreaRepository {
	constructor(private readonly db: Db) {}

	async findAll(): Promise<Area[]> {
		return this.db.select().from(areas);
	}

	async findByCode(code: string): Promise<Area | null> {
		const rows = await this.db
			.select()
			.from(areas)
			.where(eq(areas.code, code))
			.limit(1);

		return rows[0] ?? null;
	}

	async create(input: CreateAreaInput): Promise<Area> {
		const now = new Date().toISOString();
		const rows = await this.db
			.insert(areas)
			.values({
				code: input.code,
				name: input.name,
				createdAt: now,
				updatedAt: now
			})
			.returning();

		const area = rows[0];

		if (!area) {
			throw new Error("Failed to create area");
		}

		return area;
	}
}
