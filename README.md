# カブクエスト 〜タイムマシンとおかねのぼうけん〜

親子（5〜9歳＋保護者）で学ぶ投資シミュレーションゲーム。
実在の過去マーケットデータ（S&P500・日経平均）に「いつの時代か知らされずに」降り立ち、
1ターン＝1ヶ月の旅で長期・分散・複利・感情コントロールを体験する。

- 📄 設計書: [docs/GDD.md](docs/GDD.md)
- 🔧 引き継ぎ・拡張手順: [docs/HANDOFF.md](docs/HANDOFF.md)

## 遊びの核

- **タイムマシン相場**: 帰還時に初めて「きみが いたのは リーマンショックの ふゆ だった」と明かされる
- **パニックンバトル**: 暴落時に現れる狼狽の化身。「うる／がまんする／かいます」の三択
- **もしもタイムライン**: えらばなかった未来の資産曲線を重ねて表示（機会費用の可視化）
- **雪だるま**: 資産は体積スケールの雪だるまとして育つ（複利の体感）
- **どんぐりの森**: 旅の成果で森が育つメタ進行
- **保護者ダッシュボード**: 分析でなく「今夜の会話カード」を生成

## 開発

```bash
npm install
npm run dev        # 開発サーバ
npm test           # domainロジックのユニットテスト＋実データ検証
npm run build      # 型チェック＋本番ビルド（PWA・完全オフライン対応）
npm run preview    # ビルド確認 (:4173)
node scripts/smoke.e2e.mjs   # E2Eスモーク（要 playwright / CHROMIUM_PATH）
```

## 構成

```
scripts/           データ変換（生CSV→月次JSON）・アイコン生成・E2E
src/domain/        純粋ロジック（React非依存・テスト対象）
src/data/          同梱市場データ（出典はJSON内とdocs/HANDOFF.md）
src/state/         Zustandストア（進行・メタ・設定。localStorageのみ）
src/ui/            画面・コンポーネント・二層テキスト辞書
src/platform/      音（WebAudio合成）・振動
```

個人情報は一切収集しない。データは端末内localStorageのみ。
本アプリは教育目的のシミュレーションであり、投資助言ではない。

## データ出典

- S&P500: Robert Shiller公開データ（[datasets/s-and-p-500](https://github.com/datasets/s-and-p-500)）— 月中平均・配当なし
- 日経平均: [macrotrends.net](https://www.macrotrends.net/2593/nikkei-225-index-historical-chart-data)（1985–2010）＋ investing.com経由データ（2011–2024）— 月末終値

簡略化の詳細（配当・為替・手数料・金利の扱い）はアプリ内「おうちのひとへ」画面と `docs/GDD.md` §12 に明示。
