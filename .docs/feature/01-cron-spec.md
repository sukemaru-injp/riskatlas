# Cron Worker 永続化実装計画

## 概要

`apps/cron` は Cloudflare Workers の Scheduled Handler として実行され、外務省の新着情報 XML feed を定期取得し、Cloudflare D1 に未登録データを保存する。

取得元は既存実装の `DEFAULT_NEW_ARRIVAL_FEED_URL` を使う。

```txt
https://www.ezairyu.mofa.go.jp/opendata/area/newarrivalA.xml
```

現在の `apps/cron/src/handler.ts` は XML fetch、parse、DTO 変換まで実装済み。今後は `packages/d1` に Drizzle schema、model 型、Repository、migration を追加し、cron handler から D1 永続化処理を呼び出す。

`apps/cron` の `AreaInfo`、`CountryInfo`、`Information` は feed 由来の DTO として扱う。D1 の永続化 model とは混同しない。

## ゴール

- `packages/d1` に `areas`、`countries`、`information` table を定義する
- Drizzle で migration SQL を生成し、D1 に適用できる状態にする
- `packages/d1/src/models` に apps 間で共通利用する model 型を置く
- `packages/d1/src/repo` に `AreaRepository`、`CountryRepository`、`InformationRepository` を置く
- `apps/cron` から D1 binding を使い、取得した feed item を直列処理で保存する
- 既存 `information.keyCd` が登録済みの場合は skip する
- 保存件数と skip 件数をログ出力する
- Cloudflare Worker としてデプロイし、cron trigger で実行する

## スキーマ設計

Drizzle schema は `packages/d1/src/schema.ts` に定義する。D1 は SQLite dialect なので `drizzle-orm/sqlite-core` を使う。

### areas

| column | type | constraint | note |
| --- | --- | --- | --- |
| `id` | integer | primary key autoincrement | internal id |
| `code` | text | not null unique | feed の `area.cd` 相当 |
| `name` | text | not null | feed の `area.name` |
| `created_at` | text | not null | ISO-8601 string |
| `updated_at` | text | not null | ISO-8601 string |

### countries

| column | type | constraint | note |
| --- | --- | --- | --- |
| `id` | integer | primary key autoincrement | internal id |
| `code` | text | not null unique | feed の `country.cd` 相当 |
| `name` | text | not null | feed の `country.name` |
| `created_at` | text | not null | ISO-8601 string |
| `updated_at` | text | not null | ISO-8601 string |

### information

| column | type | constraint | note |
| --- | --- | --- | --- |
| `id` | integer | primary key autoincrement | internal id |
| `code` | text | not null unique | feed の `keyCd` 相当 |
| `info_type` | text | not null | feed の `infoType` |
| `info_name` | text | not null | feed の `infoName` |
| `leave_date` | text | not null | feed の `leaveDate` |
| `area_id` | integer | nullable, FK `areas.id` | area がない feed item は null |
| `country_id` | integer | nullable, FK `countries.id` | country がない feed item は null |
| `title` | text | not null | feed の `title` |
| `lead` | text | nullable | feed の `lead` |
| `created_at` | text | not null | ISO-8601 string |
| `updated_at` | text | not null | ISO-8601 string |

### Index / unique

- `areas.code` は unique
- `countries.code` は unique
- `information.code` は unique
- `information.area_id` に index
- `information.country_id` に index

`code` は feed DTO では number の場合があるが、永続化 model では text に寄せる。外部由来の ID は数値演算に使わず、先頭ゼロなどの表現差分を避けるため。

## packages/d1 設計

想定ディレクトリ:

```txt
packages/d1/
├── drizzle/
├── drizzle.config.ts
├── src/
│   ├── index.ts
│   ├── schema.ts
│   ├── models/
│   │   ├── area.ts
│   │   ├── country.ts
│   │   ├── information.ts
│   │   └── index.ts
│   └── repo/
│       ├── area-repository.ts
│       ├── country-repository.ts
│       ├── information-repository.ts
│       └── index.ts
└── package.json
```

### Public exports

`packages/d1/src/index.ts` から以下を export する。

- `createDb(database: D1Database)`
- Drizzle schema
- model 型
- Repository class

`apps/cron` と `apps/web` は `@riskatlas/d1` から必要なものを import する。

### Model と DTO の分離

- `apps/cron/src/handler.ts` の `AreaInfo` / `CountryInfo` / `Information`
  - XML feed を parse した DTO
  - field 名は feed に近い `cd`、`keyCd`、`infoType` などを維持
- `packages/d1/src/models/*`
  - DB 永続化後の application model
  - field 名は DB/schema に合わせて `code`、`infoType`、`areaId` などに変換

DTO から model/create input への変換は `apps/cron` 側に置く。`packages/d1` は D1 永続化層として、外部 feed の XML 構造を知らない状態に保つ。

## Repository 設計

Repository は Drizzle の `Db` を constructor で受け取る。

### AreaRepository

- `findByCode(code: string): Promise<Area | null>`
- `create(input: CreateAreaInput): Promise<Area>`

### CountryRepository

- `findByCode(code: string): Promise<Country | null>`
- `create(input: CreateCountryInput): Promise<Country>`

### InformationRepository

- `findByCode(code: string): Promise<Information | null>`
- `create(input: CreateInformationInput): Promise<Information>`

今回の cron 永続化では、既存 record の update は行わない。`information.code` が存在する場合は item 全体を skip する。

## Cron 永続化フロー

`runScheduledFetch` の処理を以下に拡張する。

1. `env.MOFA_NEW_ARRIVAL_FEED_URL ?? DEFAULT_NEW_ARRIVAL_FEED_URL` から XML を fetch
2. XML を parse し、cron DTO の `Information[]` に変換
3. `createDb(env.DB)` で D1 Drizzle client を作成
4. `AreaRepository`、`CountryRepository`、`InformationRepository` を作成
5. DTO 配列を `for...of` で直列処理する
6. `informationRepo.findByCode(dto.keyCd)` で既存 information を確認
7. 存在する場合は `skippedInformationCount` を増やして次へ
8. `dto.area` がある場合:
   - `areaRepo.findByCode(String(dto.area.cd))`
   - 存在しない場合は `areaRepo.create(...)`
   - 取得または作成した `area.id` を `areaId` として保持
9. `dto.country` がある場合:
   - `countryRepo.findByCode(String(dto.country.cd))`
   - 存在しない場合は `countryRepo.create(...)`
   - 取得または作成した `country.id` を `countryId` として保持
10. `informationRepo.create(...)` で information を新規作成
11. 件数をログ出力する

### ログ項目

`console.log("MOFA new arrival feed persisted", result)` のように structured log を出す。

- `cron`
- `scheduledAt`
- `fetchedAt`
- `feedUrl`
- `itemCount`
- `createdAreaCount`
- `createdCountryCount`
- `createdInformationCount`
- `skippedInformationCount`

## apps/cron の変更点

### Env

`apps/cron/src/types.ts` の `Env` に D1 binding を追加する。

```ts
export type Env = {
	DB: D1Database
	MOFA_NEW_ARRIVAL_FEED_URL?: string
}
```

`D1Database` 型は Wrangler 生成型、または `@cloudflare/workers-types` 由来の型を使う。

### wrangler.jsonc

`apps/cron/wrangler.jsonc` に D1 binding と migration directory を追加する。

```jsonc
{
	"$schema": "node_modules/wrangler/config-schema.json",
	"name": "riskatlas-cron",
	"main": "src/main.ts",
	"compatibility_date": "2026-05-22",
	"triggers": {
		"crons": ["0 */2 * * *"]
	},
	"d1_databases": [
		{
			"binding": "DB",
			"database_name": "riskatlas",
			"database_id": "<D1_DATABASE_ID>",
			"migrations_dir": "../../packages/d1/drizzle"
		}
	]
}
```

`0 */2 * * *` は 2 時間に 1 回、UTC の偶数時 `00` 分に実行される。Cloudflare Cron Triggers は UTC で評価される。

## 定期実行コスト試算

Cloudflare Workers / D1 の料金は 2026-06-06 時点の公式 pricing を前提にする。

参照:

- Workers pricing: https://developers.cloudflare.com/workers/platform/pricing/
- D1 pricing: https://developers.cloudflare.com/d1/platform/pricing/

### 実行回数

毎時 `00` 分と `30` 分に実行する場合:

| period | invocations |
| --- | ---: |
| 1 hour | 2 |
| 1 day | 48 |
| 30 days | 1,440 |
| 31 days | 1,488 |

### Workers request / CPU

Workers Paid plan は月額 minimum `$5`。Paid plan では 1,000 万 requests/month と 3,000 万 CPU ms/month が included、超過分は requests が `$0.30 / million`、CPU が `$0.02 / million CPU ms`。

30分ごとの cron は 30日で 1,440 requests/month のため、request 数だけ見ると included usage に対して非常に小さい。

CPU cost は実測 CPU time 次第。外部 fetch の待ち時間は duration には含まれるが、Workers pricing 上の CPU time とは別に扱われる。概算式:

```txt
monthly_worker_cpu_ms = avg_cpu_ms_per_invocation * 1440
paid_cpu_overage_usd = max(monthly_worker_cpu_ms - 30000000, 0) / 1000000 * 0.02
```

例:

| avg CPU / invocation | monthly CPU ms | Paid overage |
| ---: | ---: | ---: |
| 100 ms | 144,000 | $0 |
| 1,000 ms | 1,440,000 | $0 |
| 10,000 ms | 14,400,000 | $0 |
| 30,000 ms | 43,200,000 | 約 $0.26 |

この handler は XML parse と D1 query が中心なので、通常は Paid plan included CPU に収まる見込み。ただし feed 件数増加、重い parse、過剰な logging、全件 scan query がある場合は実測で確認する。

Workers Free plan は 100,000 requests/day と 10 ms CPU/invocation の制約がある。request 数は 48/day なので小さいが、XML parse と D1 永続化で 10 ms CPU を超える可能性があるため、本番運用は Workers Paid plan 前提が安全。

### D1 rows read / rows written

D1 は rows read / rows written / storage で課金される。Free plan は rows read 5 million/day、rows written 100,000/day、storage 5 GB total。Paid plan は rows read 25 billion/month included、rows written 50 million/month included、storage 5 GB included。

今回の処理は `information.code`、`areas.code`、`countries.code` の unique/index lookup が中心。index が効く前提では、1 item あたりの read は概ね以下。

既存 information を skip する通常ケース:

```txt
rows_read_per_invocation ≒ feed_item_count
rows_written_per_invocation = 0
```

新規 information がある場合:

```txt
rows_read_per_new_item ≒ 1 information lookup + 1 area lookup + 1 country lookup
rows_written_per_new_item >= 1 information row
```

実際の rows written は index 更新分も加算される。`information` は `code` unique、`area_id` index、`country_id` index を持つため、area/country が両方ある新規 insert は table row に加えて index 更新分が発生する。`areas` / `countries` の新規 insert も `code` unique index 分が加算される。

概算例:

| assumption | monthly rows read | monthly rows written | note |
| --- | ---: | ---: | --- |
| feed 100件、全件既存 skip | 144,000 | 0 | 100 * 1,440 |
| feed 500件、全件既存 skip | 720,000 | 0 | 500 * 1,440 |
| 毎回 100件すべて新規 | 約 432,000 | 約 576,000+ | read は 3 lookup/item、write は information row + indexes 想定 |

上記は Paid plan included usage に対して十分小さい。Free plan でも rows read は小さいが、rows written は初回大量 insert や migration、手動 import と合算されるため、日次 100,000 rows written/day に注意する。

### 実測方法

D1 query の `meta` には `rows_read` / `rows_written` が含まれる。Repository 実装時に必要であれば query 結果の meta を集計し、cron log に `d1RowsRead` / `d1RowsWritten` を追加する。

Cloudflare dashboard では D1 database の Metrics > Row Metrics、Workers では Workers Metrics / Logs で実行回数、CPU、duration を確認する。

## Drizzle / D1 migration 手順

### 依存関係

`packages/d1` に `drizzle-kit` が未追加なので追加する。

```sh
pnpm --filter @riskatlas/d1 add -D drizzle-kit
```

`drizzle-orm` は既に `packages/d1` の dependency にある。

### D1 database 作成

remote D1 を作成する。

```sh
pnpm wrangler d1 create riskatlas
```

作成結果の `database_id` を `apps/cron/wrangler.jsonc` の `d1_databases[0].database_id` に設定する。

必要なら location hint を付ける。

```sh
pnpm wrangler d1 create riskatlas --location=apac
```

### Drizzle config

`packages/d1/drizzle.config.ts` を追加する。

```ts
import "dotenv/config"
import { defineConfig } from "drizzle-kit"

export default defineConfig({
	out: "./drizzle",
	schema: "./src/schema.ts",
	dialect: "sqlite",
	driver: "d1-http",
	dbCredentials: {
		accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
		databaseId: process.env.CLOUDFLARE_DATABASE_ID!,
		token: process.env.CLOUDFLARE_D1_TOKEN!
	}
})
```

必要な環境変数:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_DATABASE_ID`
- `CLOUDFLARE_D1_TOKEN`

`CLOUDFLARE_D1_TOKEN` は D1 edit 権限を持つ API token にする。secret や `.env` は commit しない。

### Migration SQL 生成

```sh
pnpm --filter @riskatlas/d1 exec drizzle-kit generate
```

生成物は `packages/d1/drizzle/` に置く。

### Migration 適用

Drizzle Kit で D1 HTTP API 経由の適用:

```sh
pnpm --filter @riskatlas/d1 exec drizzle-kit migrate
```

Wrangler の D1 migration として適用する場合:

```sh
pnpm wrangler d1 migrations apply riskatlas --config apps/cron/wrangler.jsonc --remote
```

この repository では Drizzle で migration SQL を生成し、D1 への適用方法は実装時にどちらかへ統一する。基本方針は `packages/d1/README.md` に合わせて `drizzle-kit generate` で migration を残し、`drizzle-kit migrate` で remote D1 に適用する。

### 適用確認

```sh
pnpm wrangler d1 execute riskatlas --remote --command "SELECT name FROM sqlite_master WHERE type = 'table';"
```

必要に応じて件数も確認する。

```sh
pnpm wrangler d1 execute riskatlas --remote --command "SELECT COUNT(*) AS count FROM information;"
```

## ローカル確認

### 既存 local entrypoint

feed parse と永続化処理を直接実行する。

```sh
pnpm --filter @riskatlas/cron local
```

ただし `local.ts` から D1 binding を渡すには、local D1 の扱いを追加実装する必要がある。D1 binding つきの cron handler を確認する場合は Wrangler dev を優先する。

### Scheduled handler の確認

```sh
pnpm --filter @riskatlas/cron exec wrangler dev --test-scheduled
```

別 terminal から実行する。

```sh
curl "http://localhost:8787/__scheduled?cron=0+*/2+*+*+*"
```

`/__scheduled` は `wrangler dev --test-scheduled` 時に scheduled handler を手動発火するための確認用 endpoint。

## デプロイ手順

1. 依存関係を入れる

```sh
pnpm install
```

2. Cloudflare login 状態を確認する

```sh
pnpm wrangler whoami
```

未ログインなら:

```sh
pnpm wrangler login
```

3. D1 database を作成し、`apps/cron/wrangler.jsonc` に binding を設定する

```sh
pnpm wrangler d1 create riskatlas --location=apac
```

4. migration を生成、適用する

```sh
pnpm --filter @riskatlas/d1 exec drizzle-kit generate
pnpm --filter @riskatlas/d1 exec drizzle-kit migrate
```

5. 型検査と Biome check を実行する

```sh
pnpm typecheck
pnpm check
```

6. cron Worker を dry-run する

```sh
pnpm --filter @riskatlas/cron exec wrangler deploy --dry-run
```

7. cron Worker を deploy する

```sh
pnpm --filter @riskatlas/cron exec wrangler deploy
```

Wrangler は `apps/cron/wrangler.jsonc` の `triggers.crons` を使って Cron Trigger を登録する。

## デプロイ後確認

### Worker logs

```sh
pnpm --filter @riskatlas/cron exec wrangler tail
```

次のログが出ることを確認する。

- XML feed 取得件数
- `createdAreaCount`
- `createdCountryCount`
- `createdInformationCount`
- `skippedInformationCount`

### D1 件数確認

```sh
pnpm wrangler d1 execute riskatlas --remote --command "SELECT COUNT(*) AS count FROM areas;"
pnpm wrangler d1 execute riskatlas --remote --command "SELECT COUNT(*) AS count FROM countries;"
pnpm wrangler d1 execute riskatlas --remote --command "SELECT COUNT(*) AS count FROM information;"
```

### Cloudflare dashboard

- Workers & Pages で `riskatlas-cron` の deployment が成功していること
- Worker の Triggers に cron trigger が登録されていること
- D1 database に table と record が作成されていること

## Todo

### packages/d1

- [ ] `drizzle-kit` を dev dependency に追加する
- [ ] `packages/d1/drizzle.config.ts` を追加する
- [ ] `packages/d1/src/schema.ts` に `areas`、`countries`、`information` を定義する
- [ ] `packages/d1/src/models` に Area/Country/Information model 型を追加する
- [ ] `packages/d1/src/repo` に Repository を追加する
- [ ] `packages/d1/src/index.ts` の export を整理する
- [ ] Drizzle migration を生成する
- [ ] D1 remote database へ migration を適用する

### apps/cron

- [ ] `Env` に `DB: D1Database` を追加する
- [ ] `wrangler.jsonc` に D1 binding を追加する
- [ ] `wrangler.jsonc` の cron schedule を 2 時間に 1 回実行に更新する
- [ ] DTO から repository input への変換処理を追加する
- [ ] `runScheduledFetch` に直列永続化処理を追加する
- [ ] 保存件数と skip 件数をログ出力する
- [ ] `local.ts` の D1 なし実行方針を見直す

### 検証

- [ ] `pnpm typecheck`
- [ ] `pnpm check`
- [ ] `pnpm --filter @riskatlas/cron exec wrangler dev --test-scheduled`
- [ ] `curl "http://localhost:8787/__scheduled?cron=0+*/2+*+*+*"`
- [ ] D1 table count を `wrangler d1 execute` で確認する
- [ ] `pnpm --filter @riskatlas/cron exec wrangler deploy --dry-run`
- [ ] `pnpm --filter @riskatlas/cron exec wrangler deploy`

## 確認事項

- D1 database 名を `riskatlas` で進めるか、環境別に `riskatlas-prod` / `riskatlas-preview` のように分けるか
- `leave_date` は文字列保存でよいか、検索/並び替え要件を考えて正規化するか
- `information` 既存時は完全 skip でよいか、title/lead 等の変更を update する必要があるか
