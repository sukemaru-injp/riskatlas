import { eq } from "drizzle-orm";
import type { Db } from "../db";
import type { Country, CreateCountryInput } from "../models";
import { countries } from "../schema";

export class CountryRepository {
	constructor(private readonly db: Db) {}

	async findAll(): Promise<Country[]> {
		return this.db.select().from(countries);
	}

	async findByCode(code: string): Promise<Country | null> {
		const rows = await this.db
			.select()
			.from(countries)
			.where(eq(countries.code, code))
			.limit(1);

		return rows[0] ?? null;
	}

	async create(input: CreateCountryInput): Promise<Country> {
		const now = new Date().toISOString();
		const rows = await this.db
			.insert(countries)
			.values({
				code: input.code,
				name: input.name,
				createdAt: now,
				updatedAt: now
			})
			.returning();

		const country = rows[0];

		if (!country) {
			throw new Error("Failed to create country");
		}

		return country;
	}
}
