import {
	index,
	int,
	sqliteTable,
	text,
	uniqueIndex
} from "drizzle-orm/sqlite-core";

export const areas = sqliteTable(
	"areas",
	{
		id: int("id").primaryKey({ autoIncrement: true }),
		code: text("code").notNull(),
		name: text("name").notNull(),
		createdAt: text("created_at").notNull(),
		updatedAt: text("updated_at").notNull()
	},
	(table) => [uniqueIndex("areas_code_unique").on(table.code)]
);

export const countries = sqliteTable(
	"countries",
	{
		id: int("id").primaryKey({ autoIncrement: true }),
		code: text("code").notNull(),
		name: text("name").notNull(),
		createdAt: text("created_at").notNull(),
		updatedAt: text("updated_at").notNull()
	},
	(table) => [uniqueIndex("countries_code_unique").on(table.code)]
);

export const information = sqliteTable(
	"information",
	{
		id: int("id").primaryKey({ autoIncrement: true }),
		code: text("code").notNull(),
		infoType: text("info_type").notNull(),
		infoName: text("info_name").notNull(),
		leaveDate: text("leave_date").notNull(),
		areaId: int("area_id").references(() => areas.id),
		countryId: int("country_id").references(() => countries.id),
		title: text("title").notNull(),
		lead: text("lead"),
		createdAt: text("created_at").notNull(),
		updatedAt: text("updated_at").notNull()
	},
	(table) => [
		uniqueIndex("information_code_unique").on(table.code),
		index("information_area_id_idx").on(table.areaId),
		index("information_country_id_idx").on(table.countryId)
	]
);
