# Risk Atlas

Risk
Atlasは、外務省がオープンデータとして公開している海外安全情報を定期的に取得し、国ごとの時系列データとして保存・閲覧できるようにするWebアプリケーションです。

## 概要

このアプリケーションは、外務省 海外安全情報オープンデータで公開されている
海外安全情報を定期的に取得します。

- 外務省オープンデータ案内ページ:
  https://www.ezairyu.mofa.go.jp/html/opendata/index.html
- 利用マニュアル:
  https://www.ezairyu.mofa.go.jp/html/opendata/support/usemanual.pdf
- 新着情報フィード: https://www.ezairyu.mofa.go.jp/opendata/area/newarrivalA.xml

外務省のオープンデータは XML 形式で公開されており、案内ページ上では 5
分ごとに更新されるとされています。Risk Atlas では Cloudflare Workers の
Scheduled Handler として `apps/cron` を 2 時間に 1 回実行し、新たに公開された
安全情報を国ごとに時系列で蓄積します。
蓄積した情報は、対象国の安全情報履歴として Web
アプリ上で確認できるようにします。

## 想定ディレクトリ構成

```text
.
├── apps/
│   ├── cron/
│   └── web/
├── packages/
│   └── d1/
├── package.json
└── pnpm-workspace.yaml
```

ルートは pnpm workspace として管理し、アプリケーションは `apps/`
配下に配置します。

### workspace 方針

当面は pnpm workspace のみで管理します。`apps/web` と `apps/cron` の 2
アプリ構成で、 共有パッケージもまだないため、ビルド・開発・lint・typecheck
はルートの `pnpm -r` コマンドで十分に扱える想定です。

Turborepo
は初期段階では導入しません。将来的に共有パッケージが増える、タスク間の依存関係を
明示したくなる、または CI のビルドキャッシュが必要になる場合に導入を検討します。

### `apps/web`

収集済みの安全情報を閲覧するための Web アプリケーションです。TanStack Start で
構成し、Cloudflare Workers へデプロイします。

主な責務:

- 国一覧と国ごとの安全情報履歴を表示する
- 各安全情報の詳細を表示する
- 対象国の最新情報と過去情報を確認するための UI を提供する
- 利用規約に従い、画面上に出典情報を表示する

### `apps/cron`

外務省オープンデータを定期取得するための cron Worker です。Cloudflare Workers の
`scheduled` handler で実行します。

主な責務:

- 新着情報 XML フィードを 2 時間に 1 回取得する
- 公開された安全情報を解析する
- 安全情報を国・時刻単位で保存する
- 取得済み情報の重複登録を避ける

### `packages/d1`

Cloudflare D1 を扱う DB adapter package です。`tsc` で型検査し、`tsdown` で apps
から利用するための bundle を生成します。

## Cron Worker のデプロイ

`apps/cron/wrangler.jsonc` は環境ごとの Cloudflare binding 情報を含むため Git
管理対象外です。初回は example からコピーし、D1 の `database_id` を設定します。

```sh
cp apps/cron/wrangler.example.jsonc apps/cron/wrangler.jsonc
```

デプロイはリポジトリルートから実行します。

```sh
pnpm deploy:cron
```

この script は `@riskatlas/d1` を build してから、`apps/cron/wrangler.jsonc`
を指定して Wrangler deploy を実行します。

```sh
pnpm --filter @riskatlas/d1 build
pnpm wrangler deploy --config apps/cron/wrangler.jsonc
```

デプロイ後は Cloudflare Dashboard で `riskatlas-cron` Worker を開き、D1 binding
`DB` と Cron Trigger `0 */2 * * *` が設定されていることを確認します。
Cloudflare Cron Triggers は UTC で評価されます。

## データソース

このプロジェクトでは、外務省が公開している海外安全情報オープンデータを
利用します。データの利用・再配布にあたっては、公式サイト上の最新の
利用規約およびプライバシーポリシーを確認してください。

- 利用規約: https://www.ezairyu.mofa.go.jp/html/opendata/support/terms.html

利用規約では、コンテンツを利用する際に出典を記載することが求められています。
また、コンテンツを編集・加工して利用する場合は、出典とは別に編集・加工した
旨を記載する必要があります。Risk Atlas の画面上では、外務省 海外安全情報
オープンデータを利用していることが分かる出典情報を表示します。

## ステータス

初期設計中です。まずは `apps/web` と `apps/cron` を実装する想定です。
追加機能については検討中です。
