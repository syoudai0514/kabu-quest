# カブクエスト 開発ガイド（エージェント向け）

親子向け投資教育ゲーム。設計の正典は `docs/GDD.md`、拡張手順は `docs/HANDOFF.md`。

## コマンド

- `npm test` — domainユニット＋実データ検証（コード変更時は必ず通す）
- `npm run build` — tsc＋vite（型エラーはここで出る）
- `CHROMIUM_PATH=/opt/pw-browsers/chromium node scripts/smoke.e2e.mjs` — 通しE2E（要 `npm run preview` 起動済み）

## 絶対に守る設計原則

1. `src/domain/` はReact/DOM/Zustand非依存の純粋関数のみ。UIロジックを持ち込まない
2. もしもタイムライン・ベンチマークは `engine/run.ts` の `simulateScript` を通す（別実装禁止）
3. 金利参照は `CashRateProvider` 経由のみ
4. こどもモード文言の規則: ひらがな中心・分かち書き（文節スペース）・専門用語は `src/ui/i18n/text.ts` の対訳語彙に従う。教訓の説教は書かない（フクじいの問いかけで終える）
5. 「なにもしない」が最速の操作である、というUI原則を崩さない（確認ダイアログ追加などに注意）
6. 個人情報の収集・外部送信コードは書かない
7. スコアは市況でなく行動を評価する（現金ベンチマーク比）。絶対額での評価に変えない

## 市場データ

`src/data/generated/*.json` は `scripts/build-market-data.mjs` の生成物。手編集禁止。
更新手順・出典・既知の妥協（月中平均vs月末終値等）は `docs/HANDOFF.md` §2。
`src/domain/data.test.ts` が既知の歴史値（例: 日経1989-12=38915.87）で破損検知する。
