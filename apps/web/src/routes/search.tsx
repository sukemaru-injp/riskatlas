import { ClientOnly, createFileRoute, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";

import { COUNTRY_OPTIONS } from "#/constants/countries";
import styles from "./root.module.css";

type SearchParams = {
	country: string;
};

type Information = {
	id: string;
	countryId: string;
	countryName: string;
	title: string;
	description: string;
	sourceName: string;
	updatedAt: string;
};

/**
 * TODO: D1 実装時の検索フロー
 *
 * 1. `packages/d1` に countryRepo / informationRepo の公開 API を用意する。
 * 2. `countryRepo.searchByLikeName(name)` で `country.name` と別名を曖昧検索する。
 * 3. 該当する country がある場合は `information.searchByCountryId(country.id)` を呼び、
 *    `Information[]` を返す。複数 country に一致する場合は country ごとに取得して統合する。
 * 4. 該当 country がない場合は空配列を返す。
 * 5. Cloudflare Workers の D1 binding を server function から参照できるように型定義する。
 */
const searchInformation = createServerFn({ method: "GET" })
	.validator((data: SearchParams) => data)
	.handler(async ({ data }) => {
		const countryName = data.country.trim();

		if (!countryName) {
			return [];
		}

		const country = COUNTRY_OPTIONS.find((option) => {
			const values = [option.label, option.value, ...(option.keywords ?? [])];

			return values.some((value) =>
				value
					.normalize("NFKC")
					.toLocaleLowerCase()
					.includes(countryName.normalize("NFKC").toLocaleLowerCase())
			);
		});

		if (!country) {
			return [];
		}

		return createMockInformation(country.value, country.label);
	});

export const Route = createFileRoute("/search")({
	validateSearch: (search: Record<string, unknown>): SearchParams => ({
		country: typeof search.country === "string" ? search.country : ""
	}),
	loaderDeps: ({ search }) => ({
		country: search.country
	}),
	loader: ({ deps }) => searchInformation({ data: deps }),
	component: SearchPage
});

function SearchPage() {
	const { country } = Route.useSearch();
	const informationList = Route.useLoaderData();

	return (
		<ClientOnly>
			<SearchContent country={country} informationList={informationList} />
		</ClientOnly>
	);
}

type SearchContentProps = {
	country: string;
	informationList: Information[];
};

function SearchContent({ country, informationList }: SearchContentProps) {
	return (
		<div className={styles.searchShell}>
			<div className={styles.searchHeader}>
				<div>
					<p className={styles.searchEyebrow}>Search results</p>
					<h1>検索結果</h1>
					<p className={styles.searchDescription}>
						{country
							? `「${country}」に関連する安全情報です。`
							: "国名を入力して検索してください。"}
					</p>
				</div>
				<Link className={styles.backLink} to="/">
					検索条件を変更
				</Link>
			</div>

			{informationList.length > 0 ? (
				<ul className={styles.informationList}>
					{informationList.map((information) => (
						<li className={styles.informationItem} key={information.id}>
							<div className={styles.informationMeta}>
								<span>{information.countryName}</span>
								<span>{information.sourceName}</span>
								<time dateTime={information.updatedAt}>
									{formatDate(information.updatedAt)}
								</time>
							</div>
							<h2>{information.title}</h2>
							<p>{information.description}</p>
						</li>
					))}
				</ul>
			) : (
				<p className={styles.emptyState}>該当する情報はまだありません。</p>
			)}
		</div>
	);
}

function createMockInformation(
	countryId: string,
	countryName: string
): Information[] {
	return [
		{
			id: `${countryId}-security`,
			countryId,
			countryName,
			title: "渡航前の安全確認",
			description:
				"主要都市の治安、交通事情、現地当局からの注意喚起を事前に確認してください。",
			sourceName: "RiskAtlas mock",
			updatedAt: "2026-06-27"
		},
		{
			id: `${countryId}-health`,
			countryId,
			countryName,
			title: "健康・医療情報",
			description:
				"滞在地域の医療体制、常備薬、海外旅行保険の補償範囲を確認してください。",
			sourceName: "RiskAtlas mock",
			updatedAt: "2026-06-27"
		}
	];
}

function formatDate(value: string) {
	const [year, month, day] = value.split("-");

	return `${year}年${Number(month)}月${Number(day)}日`;
}
