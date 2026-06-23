# Risk Atlas Web App

`apps/web` は、Risk Atlas の Web UI を提供する TanStack Start
アプリケーションです。Cloudflare Workers へデプロイします。

## ローカル開発

リポジトリルートから依存関係をインストールします。

```sh
pnpm install
```

開発サーバーは次のコマンドで起動します。

```sh
pnpm dev:web
```

web workspace だけを直接指定する場合は次のコマンドを使います。

```sh
pnpm --filter @riskatlas/web dev
```

## UI ライブラリ

UI コンポーネントには Base UI を使用します。

```sh
pnpm --filter @riskatlas/web add @base-ui/react
```

Base UI は unstyled なコンポーネントライブラリなので、各画面・コンポーネントの
見た目は CSS Modules で定義します。トップページのスタイルは
`src/routes/root.module.css` に置きます。

Dialog や Popover などの portaled component がページ全体の最前面に表示されるように、
`src/routes/__root.tsx` の layout root に `.root` を付与し、`src/styles.css` で
`isolation: isolate` を設定しています。また、iOS Safari の viewport 挙動に対応するため
`body { position: relative; }` も global style に含めています。

## 検証コマンド

デプロイ前に、少なくとも型検査と Biome check を実行します。

```sh
pnpm --filter @riskatlas/web typecheck
pnpm --filter @riskatlas/web check
pnpm --filter @riskatlas/web build
```

workspace 全体を確認する場合は、リポジトリルートで次のコマンドを実行します。

```sh
pnpm typecheck
pnpm check
pnpm build
```

## デプロイ

事前に Wrangler で Cloudflare にログインします。

```sh
pnpm --filter @riskatlas/web exec wrangler login
```

web app は次のコマンドでビルドしてデプロイします。

```sh
pnpm --filter @riskatlas/web run deploy
```

`deploy` script は `apps/web/package.json` で定義しており、内部では次の処理を
実行します。

```sh
pnpm build && wrangler deploy
```

`run` を省略すると pnpm 本体の `deploy` コマンドとして解釈され、
デプロイ先ディレクトリの指定を求められます。

Wrangler は `apps/web/wrangler.jsonc` を読み込み、
`@tanstack/react-start/server-entry` を Worker entrypoint としてデプロイします。
現在の Worker 名は `risk-atlas-web-app` です。

## 設定

Cloudflare Workers の設定は `apps/web/wrangler.jsonc` に定義します。

```json
{
	"name": "risk-atlas-web-app",
	"compatibility_date": "2025-09-02",
	"compatibility_flags": ["nodejs_compat"],
	"main": "@tanstack/react-start/server-entry"
}
```

Runtime bindings や環境変数を追加する場合は、`wrangler.jsonc` に定義し、
アプリケーション側の型にも反映します。D1、KV、R2 などの bindings を追加した
場合は、ローカル開発・プレビュー・本番で同じ名前を参照できるようにします。

## デプロイ後の確認

デプロイ完了後は Wrangler が出力する URL にアクセスし、初期ページが表示されることを
確認します。必要に応じて live logs を確認します。

```sh
pnpm --filter @riskatlas/web exec wrangler tail
```

## 検証用リソースの削除

検証目的でデプロイした Worker を削除する場合は、削除対象を dry run で確認してから
削除します。

```sh
pnpm --filter @riskatlas/web exec wrangler delete --dry-run
pnpm --filter @riskatlas/web exec wrangler delete
```

Worker 名を明示する場合は次のコマンドを使います。

```sh
pnpm --filter @riskatlas/web exec wrangler delete --name risk-atlas-web-app
```

この操作はデプロイ済みの Worker サービス自体を削除します。直前のデプロイへ戻すだけなら
`wrangler rollback` を使い、D1、KV、R2 などの個別リソースを削除する場合はそれぞれの
Wrangler コマンドまたは Cloudflare dashboard で個別に削除します。

## トラブルシュート

`Could not route to /client/v4/accounts/account_id/... [code: 7003]` が出る場合は、
`CLOUDFLARE_ACCOUNT_ID` に `account_id` などのプレースホルダー文字列が設定されています。
実際の Cloudflare account ID に置き換えるか、Wrangler のログイン情報から推測させる場合は
環境変数を解除してから再実行します。

```sh
unset CLOUDFLARE_ACCOUNT_ID
pnpm --filter @riskatlas/web run deploy
```

CI などで API token を使う場合は、`CLOUDFLARE_ACCOUNT_ID` と `CLOUDFLARE_API_TOKEN`
に実際の値を設定してください。
