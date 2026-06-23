# @riskatlas/d1

RiskAtlas の Cloudflare D1 database adapter package です。Drizzle ORM を使い、D1 の schema、migration、接続ヘルパーをこの package に集約します。

参考: [Get Started with Drizzle and D1](https://orm.drizzle.team/docs/get-started/d1-new)

## 方針

- D1 は SQLite dialect として扱う
- Runtime では Cloudflare Worker の `D1Database` binding を `drizzle-orm/d1` に渡す
- Schema 定義は `drizzle-orm/sqlite-core` を使って `packages/d1/src/schema.ts` に置く
- Application code は Drizzle の table 定義や `createDb` helper を `@riskatlas/d1` から import する
- `apps/cron` は scheduled task から D1 を更新し、`apps/web` は TanStack Start の server runtime から同じ D1 を参照する
- Migration SQL と snapshot は `packages/d1/drizzle/` に生成する
- D1 の schema 変更は `drizzle-kit generate` で migration として残し、`drizzle-kit migrate` で適用する
- Cloudflare account id、database id、API token は環境変数で渡し、repository には commit しない

## Application 構成

`packages/d1` は `apps/cron` と `apps/web` の共有 DB package です。Schema、migration、Drizzle client helper をここに集約し、各 application は runtime の D1 binding を渡して利用します。

```txt
apps/cron  ── scheduled task ── createDb(env.DB) ── write/update
apps/web   ── TanStack Start ── createDb(env.DB) ── read/query
                                  │
                                  ▼
                           packages/d1
                           schema + migrations
                                  │
                                  ▼
                           Cloudflare D1
```

`apps/cron` は外部データ取得、正規化、upsert などの書き込み処理を担当します。`apps/web` は TanStack Start の server function、loader、API route など server runtime 上の処理から D1 を参照します。Browser 側の client component から Cloudflare D1 に直接接続しません。

両 application で同じ D1 database を使う場合は、各 `wrangler.*` に同じ `database_id` を設定し、binding 名も原則 `DB` に揃えます。環境ごとに DB を分ける場合は、production、preview、local で `database_id` と migration 適用先を明確に分けます。

## 想定する構成

```txt
packages/d1/
├── drizzle/
├── src/
│   ├── index.ts
│   └── schema.ts
├── drizzle.config.ts
├── package.json
└── tsconfig.json
```

`drizzle/` は Drizzle Kit が生成する migration SQL と snapshot の置き場です。`dist/` は build output なので source として扱いません。

## 追加する依存関係

`packages/d1` に Drizzle ORM と Drizzle Kit を追加します。

```sh
pnpm --filter @riskatlas/d1 add drizzle-orm
pnpm --filter @riskatlas/d1 add -D drizzle-kit
```

`wrangler` と `tsx` は Worker app 側や root tooling で使う可能性があります。D1 package で migration を完結させるなら、必要に応じて `@riskatlas/d1` の dev dependency に追加します。

## Runtime 接続

Cloudflare Worker の binding をそのまま Drizzle に渡します。

```ts
import { drizzle } from "drizzle-orm/d1"
import * as schema from "./schema"

export function createDb(database: D1Database) {
	return drizzle(database, { schema })
}

export type Db = ReturnType<typeof createDb>
export * from "./schema"
```

Worker 側では `env.DB` のような D1 binding を `createDb` に渡します。

```ts
import { createDb } from "@riskatlas/d1"

export interface Env {
	DB: D1Database
}

export default {
	async fetch(_request: Request, env: Env) {
		const db = createDb(env.DB)
		const rows = await db.query.someTable.findMany()
		return Response.json(rows)
	}
}
```

Binding 名は Worker の設定に合わせます。Cloudflare の設定例では `binding = "DB"` が使われています。

## Schema 定義

D1 は SQLite 互換なので、schema は `drizzle-orm/sqlite-core` で定義します。

```ts
import { int, sqliteTable, text } from "drizzle-orm/sqlite-core"

export const examples = sqliteTable("examples", {
	id: int().primaryKey({ autoIncrement: true }),
	name: text().notNull(),
	createdAt: text("created_at").notNull()
})
```

Table 名、column 名、index、unique constraint は schema file に集約します。Application package 側では raw SQL や table 名文字列をできるだけ直接持たず、`@riskatlas/d1` の exports を経由します。

## Drizzle Kit 設定

`packages/d1/drizzle.config.ts` を置きます。

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

`.env` を使う場合も repository には commit しません。

## Migration 運用

Schema 変更時は `packages/d1` を対象に Drizzle Kit を実行します。

```sh
pnpm --filter @riskatlas/d1 exec drizzle-kit generate
pnpm --filter @riskatlas/d1 exec drizzle-kit migrate
```

D1 では `drizzle-kit push` が認可エラーになるケースがあるため、通常は `generate` で migration file を残してから `migrate` で適用します。生成された SQL を review できる状態にする方針です。

## D1 作成から schema 適用まで

Remote の Cloudflare D1 に schema を適用するまでの初回手順です。Drizzle Kit は `packages/d1/drizzle.config.ts` を読み、`packages/d1/src/schema.ts` から migration SQL を生成します。

### 1. D1 database を作成する

Repository root から Wrangler で D1 database を作成します。DB 名は環境に合わせて変更してください。

```sh
pnpm dlx wrangler d1 create riskatlas
```

実行結果に出る `database_name` と `database_id` を控えます。

```toml
[[d1_databases]]
binding = "DB"
database_name = "riskatlas"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

### 2. Worker に D1 binding を追加する

D1 を使う Worker の `wrangler.jsonc` に binding を追加します。`apps/cron/wrangler.jsonc` から `packages/d1/drizzle` を参照する場合は、相対パスを `../../packages/d1/drizzle` にします。

```jsonc
{
	"$schema": "node_modules/wrangler/config-schema.json",
	"name": "riskatlas-cron",
	"main": "src/main.ts",
	"compatibility_date": "2026-05-22",
	"triggers": {
		"crons": ["0 * * * *"]
	},
	"d1_databases": [
		{
			"binding": "DB",
			"database_name": "riskatlas",
			"database_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
			"migrations_dir": "../../packages/d1/drizzle"
		}
	]
}
```

Binding 名を `DB` 以外にする場合は、Worker の `Env` 型や `createDb(env.DB)` の参照も同じ名前に揃えます。

### 3. Drizzle Kit 用の環境変数を設定する

`packages/d1/drizzle.config.ts` は Cloudflare D1 HTTP driver を使うため、以下を shell 環境または `.env` に設定します。`.env` は commit しません。

```sh
CLOUDFLARE_ACCOUNT_ID="Cloudflare account id"
CLOUDFLARE_DATABASE_ID="wrangler の database_id"
CLOUDFLARE_D1_TOKEN="D1:Edit 権限を持つ API token"
```

`CLOUDFLARE_DATABASE_ID` は手順 1 で作成した D1 database の `database_id` と同じ値にします。

### 4. Schema を定義する

`packages/d1/src/schema.ts` に table 定義を置きます。

```ts
import { int, sqliteTable, text } from "drizzle-orm/sqlite-core"

export const examples = sqliteTable("examples", {
	id: int().primaryKey({ autoIncrement: true }),
	name: text().notNull(),
	createdAt: text("created_at").notNull()
})
```

Table 名や column 名は Drizzle の TypeScript 定義を正にします。既存 DB から移行する場合を除き、application 側で schema SQL を別管理しません。

### 5. Migration SQL を生成する

`packages/d1/src/schema.ts` を変更したら、Drizzle Kit で migration を生成します。

```sh
pnpm --filter @riskatlas/d1 exec drizzle-kit generate
```

生成物は `packages/d1/drizzle/` に置かれます。生成された SQL は commit 前に確認します。

### 6. Remote D1 に migration を適用する

Cloudflare D1 に migration を適用します。

```sh
pnpm --filter @riskatlas/d1 exec drizzle-kit migrate
```

`migrate` は Cloudflare の D1 HTTP API を使うため、手順 3 の `CLOUDFLARE_*` が必要です。成功時の出力は少ないため、エラーが出なければ適用完了として扱います。

### 7. Worker binding の型を更新する

Worker 側で `D1Database` binding の型を使う場合は、binding 追加後に型を生成します。

```sh
pnpm dlx wrangler types --config apps/cron/wrangler.jsonc
```

生成された型、または手書きの `Env` 型に `DB: D1Database` が反映されていることを確認します。

### 8. 適用結果を確認する

必要に応じて Wrangler から table を確認します。

```sh
pnpm dlx wrangler d1 execute riskatlas --remote --command "SELECT name FROM sqlite_master WHERE type = 'table';"
```

`drizzle-kit push` は schema を直接反映する用途ですが、D1 では認可エラーになるケースがあるため、通常は `generate` で migration を残してから `migrate` で適用します。

## Worker 設定

D1 を使う Worker の `wrangler.toml` または `wrangler.jsonc` に D1 binding を追加します。Drizzle の公式例では以下の要素が必要です。

```toml
[[d1_databases]]
binding = "DB"
database_name = "YOUR_DB_NAME"
database_id = "YOUR_DB_ID"
migrations_dir = "../../packages/d1/drizzle"
```

この repository では Worker app が `apps/cron` などに分かれているため、`migrations_dir` は app の設定ファイルから見た相対パスにします。JSONC で設定する場合も同じ情報を表現します。

## 型生成

Worker binding の型は Wrangler で生成します。

```sh
pnpm dlx wrangler types --config apps/cron/wrangler.jsonc
```

生成された `worker-configuration.d.ts` に D1 binding が反映されます。手書きの `Env` 型を使う場合も、binding 名と `D1Database` 型を一致させます。

## 実装順

1. `packages/d1` に `drizzle-orm` と `drizzle-kit` を追加する
2. `src/schema.ts` を作り、最初の table 定義を置く
3. `src/index.ts` から `createDb` と schema を export する
4. `drizzle.config.ts` を追加する
5. `apps/*/wrangler.*` に D1 binding と migration directory を設定する
6. `wrangler types` で Worker binding 型を更新する
7. `drizzle-kit generate` で初回 migration を生成する
8. Local/remote D1 に migration を適用して Worker から query する
