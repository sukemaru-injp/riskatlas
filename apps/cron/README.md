# Risk Atlas Cron Worker

`apps/cron` は、Risk Atlas の定期取得処理を実行する Cloudflare
Workersアプリケーションです。Cloudflare Workers の Scheduled Handler
として実行されます。

## 実行方式

Cloudflare には `src/main.ts` が Worker の entrypoint としてデプロイされます。
default export は Scheduled Handler の形式に合わせて、次の関数を実装します。

```ts
scheduled(controller, env, ctx);
```

`scheduled` handler は `ctx.waitUntil(...)` 経由で `src/handler.ts` の
`runScheduledFetch` を呼び出します。取得処理の本体は `handler.ts` に置き、
Cloudflare 上の実行とローカル検証で同じ関数を使います。

新着情報フィードを取得して `fast-xml-parser` で parse し、Cloudflare D1 へ
未登録の情報を永続化します。

現在の cron schedule は `wrangler.jsonc` で定義しています。

```json
{
	"triggers": {
		"crons": ["0 */2 * * *"]
	}
}
```

この設定では 2 時間に 1 回実行されます。Cloudflare Cron Triggers は UTC で評価されます。

## ローカル検証

リポジトリルートから実行します。

```sh
pnpm local
```

cron workspace だけを対象にする場合は次のコマンドを使います。

```sh
pnpm --filter @riskatlas/cron local
```

`pnpm local` は `tsx` で `src/local.ts` を実行します。`src/local.ts`
ではローカル用の `ScheduledController` を組み立て、デプロイ時と同じ
`runScheduledFetch` を呼び出します。

## 検証コマンド

```sh
pnpm --filter @riskatlas/cron typecheck
pnpm --filter @riskatlas/cron check
```

`typecheck` は TypeScript の型検査、`check` は Biome による format / lint
の確認と 自動修正を行います。

## デプロイ

事前に依存関係をインストールし、Wrangler で Cloudflare にログインします。

```sh
pnpm install
pnpm wrangler login
```

cron Worker は次のコマンドでデプロイします。

```sh
pnpm deploy:cron
```

この script は `@riskatlas/d1` を build してから、`apps/cron/wrangler.jsonc`
を指定して Wrangler deploy を実行します。Wrangler は `src/main.ts` をデプロイし、
`triggers.crons` に定義された cron trigger を登録します。

## 環境変数と bindings

Runtime bindings や環境変数を追加する場合は、`wrangler.jsonc` に定義し、
`src/types.ts` の `Env` 型にも反映します。`Env` は厳密に保ち、binding
の追加・削除・ 名前変更が型検査で検出できるようにします。
