import { eq } from "drizzle-orm";
import type { Db } from "../db";
import type { CreateInformationInput, Information } from "../models";
import { information } from "../schema";

export class InformationRepository {
	constructor(private readonly db: Db) {}

	async findByCode(code: string): Promise<Information | null> {
		const rows = await this.db
			.select()
			.from(information)
			.where(eq(information.code, code))
			.limit(1);

		return rows[0] ?? null;
	}

	async create(input: CreateInformationInput): Promise<Information> {
		const now = new Date().toISOString();
		const rows = await this.db
			.insert(information)
			.values({
				code: input.code,
				infoType: input.infoType,
				infoName: input.infoName,
				leaveDate: input.leaveDate,
				areaId: input.areaId,
				countryId: input.countryId,
				title: input.title,
				lead: input.lead,
				createdAt: now,
				updatedAt: now
			})
			.returning();

		const createdInformation = rows[0];

		if (!createdInformation) {
			throw new Error("Failed to create information");
		}

		return createdInformation;
	}
}
