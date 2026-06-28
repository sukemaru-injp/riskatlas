import {
	type Area,
	AreaRepository,
	type Country,
	CountryRepository,
	type CreateInformationInput,
	createDb,
	InformationRepository,
	sleep
} from "@riskatlas/d1";
import { XMLParser } from "fast-xml-parser";
import { logger } from "./logger";
import type { Env, ScheduledController } from "./types";

const DEFAULT_NEW_ARRIVAL_FEED_URL =
	"https://www.ezairyu.mofa.go.jp/opendata/area/newarrivalA.xml";
const PERSISTENCE_INTERVAL_MS = 1000;

type XmlValue = string | number | boolean | null | XmlValue[] | XmlObject;

type XmlObject = { [key: string]: XmlValue };

export type AreaInfo = {
	cd: number;
	name: string;
};

export type CountryInfo = {
	cd: number;
	name: string;
};

export type Information = {
	keyCd: string;
	infoType: string;
	infoName: string;
	leaveDate: string;
	area: AreaInfo | null;
	country: CountryInfo | null;
	title: string;
	lead: string;
};

export type ScheduledFetchInput = {
	controller: ScheduledController;
	env: Env;
};

export type ScheduledFetchResult = {
	cron: string;
	controllerType: "scheduled";
	createdAreaCount: number;
	createdCountryCount: number;
	createdInformationCount: number;
	fetchedAt: string;
	feedUrl: string;
	itemCount: number;
	persistenceEnabled: boolean;
	rootKeys: string[];
	scheduledAt: string;
	skippedInformationCount: number;
};

type PersistenceStats = {
	createdAreaCount: number;
	createdCountryCount: number;
	createdInformationCount: number;
	skippedInformationCount: number;
};

type PersistenceRepositories = {
	areaRepo: AreaRepository;
	countryRepo: CountryRepository;
	informationRepo: InformationRepository;
};

class PersistenceCache {
	private constructor(
		private readonly areaByCode: Map<string, Area>,
		private readonly countryByCode: Map<string, Country>
	) {}

	static from(areas: Area[], countries: Country[]): PersistenceCache {
		return new PersistenceCache(createCodeMap(areas), createCodeMap(countries));
	}

	findAreaByCode(code: string): Area | null {
		return this.areaByCode.get(code) ?? null;
	}

	findCountryByCode(code: string): Country | null {
		return this.countryByCode.get(code) ?? null;
	}

	putArea(area: Area): void {
		this.areaByCode.set(area.code, area);
	}

	putCountry(country: Country): void {
		this.countryByCode.set(country.code, country);
	}
}

export async function runScheduledFetch(
	input: ScheduledFetchInput
): Promise<ScheduledFetchResult> {
	const feedUrl =
		input.env.MOFA_NEW_ARRIVAL_FEED_URL ?? DEFAULT_NEW_ARRIVAL_FEED_URL;
	const xml = await fetchNewArrivalFeed(feedUrl);
	const parsed = parseNewArrivalFeed(xml);
	const information = convertToInformation(parsed);
	const rootKeys = getObjectKeys(parsed);
	const persistenceStats = await persistInformation(input.env, information);

	const result = {
		cron: input.controller.cron,
		controllerType: input.controller.type,
		createdAreaCount: persistenceStats.createdAreaCount,
		createdCountryCount: persistenceStats.createdCountryCount,
		createdInformationCount: persistenceStats.createdInformationCount,
		fetchedAt: new Date().toISOString(),
		feedUrl,
		itemCount: information.length,
		persistenceEnabled: Boolean(input.env.DB),
		rootKeys,
		scheduledAt: new Date(input.controller.scheduledTime).toISOString(),
		skippedInformationCount: persistenceStats.skippedInformationCount
	};

	logger.info(result, "MOFA new arrival feed processed");

	return result;
}

async function persistInformation(
	env: Env,
	information: Information[]
): Promise<PersistenceStats> {
	const stats = createEmptyPersistenceStats();

	if (!env.DB) {
		return stats;
	}

	const db = createDb(env.DB);
	const repositories = {
		areaRepo: new AreaRepository(db),
		countryRepo: new CountryRepository(db),
		informationRepo: new InformationRepository(db)
	};
	const cache = PersistenceCache.from(
		await repositories.areaRepo.findAll(),
		await repositories.countryRepo.findAll()
	);

	for (const item of information) {
		const existingInformation = await repositories.informationRepo.findByCode(
			item.keyCd
		);

		if (existingInformation) {
			stats.skippedInformationCount += 1;
			logger.info(
				{
					code: item.keyCd,
					id: existingInformation.id,
					name: item.infoName
				},
				"MOFA new arrival information skipped"
			);
			continue;
		}

		const areaId = await findOrCreateArea(
			repositories,
			cache,
			item.area,
			stats
		);
		const countryId = await findOrCreateCountry(
			repositories,
			cache,
			item.country,
			stats
		);

		const createdInformation = await repositories.informationRepo.create(
			toCreateInformationInput(item, areaId, countryId)
		);
		stats.createdInformationCount += 1;
		logger.info(
			{
				code: createdInformation.code,
				id: createdInformation.id,
				name: createdInformation.infoName
			},
			"MOFA new arrival information created"
		);
		await sleep(PERSISTENCE_INTERVAL_MS);
	}

	return stats;
}

function createEmptyPersistenceStats(): PersistenceStats {
	return {
		createdAreaCount: 0,
		createdCountryCount: 0,
		createdInformationCount: 0,
		skippedInformationCount: 0
	};
}

function createCodeMap<TResource extends { code: string }>(
	resources: TResource[]
): Map<string, TResource> {
	return new Map(resources.map((resource) => [resource.code, resource]));
}

async function findOrCreateArea(
	repositories: PersistenceRepositories,
	cache: PersistenceCache,
	area: AreaInfo | null,
	stats: PersistenceStats
): Promise<number | null> {
	if (!area) {
		return null;
	}

	const code = String(area.cd);
	const existingArea = cache.findAreaByCode(code);

	if (existingArea) {
		logger.info(
			{
				code,
				id: existingArea.id,
				name: existingArea.name
			},
			"MOFA new arrival area skipped"
		);
		return existingArea.id;
	}

	const createdArea = await repositories.areaRepo.create({
		code,
		name: area.name
	});
	cache.putArea(createdArea);
	stats.createdAreaCount += 1;
	logger.info(
		{
			code: createdArea.code,
			id: createdArea.id,
			name: createdArea.name
		},
		"MOFA new arrival area created"
	);

	return createdArea.id;
}

async function findOrCreateCountry(
	repositories: PersistenceRepositories,
	cache: PersistenceCache,
	country: CountryInfo | null,
	stats: PersistenceStats
): Promise<number | null> {
	if (!country) {
		return null;
	}

	const code = String(country.cd);
	const existingCountry = cache.findCountryByCode(code);

	if (existingCountry) {
		logger.info(
			{
				code,
				id: existingCountry.id,
				name: existingCountry.name
			},
			"MOFA new arrival country skipped"
		);
		return existingCountry.id;
	}

	const createdCountry = await repositories.countryRepo.create({
		code,
		name: country.name
	});
	cache.putCountry(createdCountry);
	stats.createdCountryCount += 1;
	logger.info(
		{
			code: createdCountry.code,
			id: createdCountry.id,
			name: createdCountry.name
		},
		"MOFA new arrival country created"
	);

	return createdCountry.id;
}

function toCreateInformationInput(
	item: Information,
	areaId: number | null,
	countryId: number | null
): CreateInformationInput {
	return {
		code: item.keyCd,
		infoType: item.infoType,
		infoName: item.infoName,
		leaveDate: item.leaveDate,
		areaId,
		countryId,
		title: item.title,
		lead: item.lead === "" ? null : item.lead
	};
}

async function fetchNewArrivalFeed(feedUrl: string): Promise<string> {
	const response = await fetch(feedUrl, {
		headers: {
			accept: "application/xml,text/xml,*/*"
		}
	});

	if (!response.ok) {
		throw new Error(
			`Failed to fetch MOFA new arrival feed: ${response.status} ${response.statusText}`
		);
	}

	return response.text();
}

function parseNewArrivalFeed(xml: string): XmlValue {
	const parser = new XMLParser({
		attributeNamePrefix: "@",
		ignoreAttributes: false,
		parseAttributeValue: true,
		parseTagValue: true,
		trimValues: true
	});

	return parser.parse(xml) as XmlValue;
}

function getObjectKeys(value: XmlValue): string[] {
	if (isXmlObject(value)) {
		return Object.keys(value);
	}

	return [];
}

function convertToInformation(value: XmlValue): Information[] {
	const opendata = getObjectProperty(value, "opendata");
	const mail = getObjectProperty(opendata, "mail");
	const entries = Array.isArray(mail) ? mail : [mail];

	return entries.filter(isXmlObject).map((entry) => ({
		keyCd: getStringProperty(entry, "keyCd"),
		infoType: getStringProperty(entry, "infoType"),
		infoName: getStringProperty(entry, "infoName"),
		leaveDate: getStringProperty(entry, "leaveDate"),
		area: toArea(entry),
		country: toCountry(entry),
		title: getStringProperty(entry, "title"),
		lead: getStringProperty(entry, "lead")
	}));
}

function toArea(entry: XmlObject): Information["area"] {
	const area = getObjectProperty(entry, "area");

	if (!isXmlObject(area)) {
		return null;
	}

	return {
		cd: getNumberProperty(area, "cd"),
		name: getStringProperty(area, "name")
	};
}

function toCountry(entry: XmlObject): Information["country"] {
	const country = getObjectProperty(entry, "country");

	if (!isXmlObject(country)) {
		return null;
	}

	return {
		cd: getNumberProperty(country, "cd"),
		name: getStringProperty(country, "name")
	};
}

function getObjectProperty(value: XmlValue, key: string): XmlValue {
	if (!isXmlObject(value)) {
		return null;
	}

	return value[key] ?? null;
}

function getStringProperty(value: XmlValue, key: string): string {
	const property = getObjectProperty(value, key);

	if (typeof property === "string") {
		return property;
	}

	if (typeof property === "number" || typeof property === "boolean") {
		return String(property);
	}

	return "";
}

function getNumberProperty(value: XmlValue, key: string): number {
	const property = getObjectProperty(value, key);

	if (typeof property === "number") {
		return property;
	}

	if (typeof property === "string") {
		const parsed = Number(property);
		return Number.isFinite(parsed) ? parsed : 0;
	}

	return 0;
}

function isXmlObject(value: XmlValue): value is XmlObject {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
