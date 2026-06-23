import type { InferSelectModel } from "drizzle-orm";
import type { information } from "../schema";

export type Information = InferSelectModel<typeof information>;

export type CreateInformationInput = {
	code: string;
	infoType: string;
	infoName: string;
	leaveDate: string;
	areaId: number | null;
	countryId: number | null;
	title: string;
	lead: string | null;
};
