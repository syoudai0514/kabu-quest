# 引き継ぎ文書（HANDOFF）

次セッションのエージェント（Opus想定）と開発者向け。
**発注者との合意事項**: 以下の§1〜§3は「あとでやる」とオーナーが明示した項目であり、手順をここに固定する。

## 0. 現状サマリ（2026-07-06時点）

| フェーズ | 状態 |
|---|---|
| フェーズ0 GDD | ✅ `docs/GDD.md`（オーナー承認済み。タイトルはA案「カブクエスト」、震災イベント収録OK） |
| フェーズ1 コアループ | ✅ 実装・E2E確認済み |
| フェーズ2 我慢/イベント/雪だるま/実績 | ✅ 実装・E2E確認済み |
| フェーズ3 親ダッシュボード/チュートリアル/音 | ✅ 実装済み（磨き込み余地は§6） |

検証コマンド:

```bash
npm install
npm test              # domainユニット+実データスモーク（45+件）
npm run build         # tsc + vite build + PWA
npm run preview &     # :4173
CHROMIUM_PATH=/opt/pw-browsers/chromium SHOT_DIR=/tmp node scripts/smoke.e2e.mjs
# → {"errors":[], "scoreReached":true, ...} なら通しでOK
```

アーキテクチャ原則（壊さないこと）:
- `src/domain/` は**React/DOM/Zustand非依存の純粋関数**。UIはここを呼ぶだけ
- ライブプレイと「もしもタイムライン」は**同じエンジン**（`engine/run.ts`）を通る。もしも計算を別実装しない
- 金利は必ず `CashRateProvider` 経由（`getCashRates()`）。直接0を書かない
- こども/おとなの文言は「翻訳の切替」であり、ゲームバランスに影響させない

---

## §1 預金金利の時代連動化＋未来金利の可変化（オーナー要望）

**現状**: `src/state/marketData.ts` の `getCashRates()` が `zeroRate` を返す（0%固定）。
**実装口は既にある**: `src/domain/rates/cashRate.ts` の `eraLinkedRate(table)` と `fixedAnnualRate(annual)` は実装・エクスポート済み。

手順:
1. **データ投入**: `src/data/rates/jpDeposit.ts` を新規作成し、日本の定期預金金利（1年もの）の時代テーブルを置く。
   形式: `[{ from: '1985-01', annual: 0.055 }, { from: '1991-01', annual: 0.045 }, ...]`
   出典候補: 日本銀行 時系列統計データ検索サイト（預金種類別店頭表示金利）。CCR環境からは外部サイトがプロキシ遮断される場合があるので、**オーナーにCSVを添付してもらうのが最短**。粒度は「政策転換点ごと」で十分（ゲーム的には87年高金利→バブル後低下→99年ゼロ金利→24年解除、が体験できればよい）
2. **接続**: `getCashRates()` を `eraLinkedRate(JP_DEPOSIT_TABLE)` に差し替え。
   ただし `eraLinkedRate` は月IDを受けるので、**旅の窓が実年月にマップされている現行実装のままで自動的に時代連動になる**（engineは `monthAt(market, idx)` で実月を渡している）
3. **未来金利（オーナー要望の「今後の未来の金利も変えられるように」）**:
   - `useSettings` に `futureAnnualRate: number | null` を追加（保護者ダッシュボードから設定）
   - `getCashRates()` で `futureAnnualRate != null` なら `eraLinkedRate` の結果を包み、データ最終月以降＋「みらいモード」用に上書きするプロバイダを合成する
   - UIは保護者ダッシュボードの「表示設定」セクションに数値入力を1つ足すだけ
4. **UI反映**: `Play.tsx` のちょきんばこカードに、おとなモード時のみ現在の年利を表示（`getCashRates().monthlyRate(realMonth)` から逆算）。こどもモードでは高金利時代のみ「ちょきんばこも すこし ふえる じだいだよ」とコリンが一言
5. **開示更新**: `Parent.tsx` の簡略化リストから「金利0%固定」の行を削除し、出典を追記
6. **テスト**: `cashRate.ts` の `eraLinkedRate` は境界月（テーブル行の前後）のテストを追加。engineとの結合は `run.test.ts` の 'applies cash interest' パターンを流用

注意: 1980年代の日本の窓では預金金利6%前後になり、株式との競争が発生する。これは**教育的に正しい**（「昔は貯金も強かった」）。ただし星評価は現金ベンチマーク比なので、高金利時代は星が取りにくくなる。`scoring.ts` の閾値調整が必要になる可能性あり——プレイテストで確認すること。

## §2 データ出典の強化とトータルリターン化（オーナー要望）

**現状の妥協**（`docs/GDD.md` §12、Parent画面にも開示済み）:
- S&P500: Shillerデータ由来の**月中平均**・配当抜き・ドル建て値をそのまま円扱い
- 日経: macrotrends(1985-2010)+investing.com(2011-2024.09)の**月末終値**・配当抜き
- 2系列で方法論が不一致

手順（優先度順）:
1. **S&P500トータルリターン化（材料は手元にある）**:
   `scripts/raw/sp500.csv` には `Dividend` 列（年率換算の月次配当）が既に入っている。
   `scripts/build-market-data.mjs` に以下を追加:
   ```
   TR[0] = P[0]
   TR[t] = TR[t-1] * (P[t] + D[t]/12) / P[t-1]
   ```
   直近数ヶ月はDividend=0.0（未発表）なので、**最後の非ゼロ月以降は最終配当利回りで外挿**し、`methodology` に明記。出力は `sp500tr.json` として別ファイルにし、`marketData.ts` でどちらを使うか切替可能にする（おとなモード注記も切替）
2. **月末終値への統一（Stooq再取得）**:
   ローカル環境（プロキシなし）で `https://stooq.com/q/d/l/?s=^spx&i=m` と `?s=^nkx&i=m` をDLし、`scripts/raw/` を置き換え。build-market-dataのパーサはStooq形式（Date,Open,High,Low,Close）用の関数を1つ足す。**CCR環境からはstooq.comが403になる**ため、これはオーナーのローカルで実行してもらうこと
3. **日経の2024-10以降の更新**: 日経公式 `indexes.nikkei.co.jp` の月次CSV（`nikkei_stock_average_monthly_en.csv`... 正確なURLはサイトのアーカイブページ参照）が最も信頼できる。これもローカル実行
4. **為替（円建てS&P500）**: USDJPY月次系列を追加取得し、build時に `sp500_jpy = sp500 * usdjpy / usdjpy[0]` を生成するのが最小実装。資産名を「アメリカの かぶセット（えんだて）」にし、GDD §12-2の開示を更新。**為替でボラが増えパニックン発動率が変わる**ので窓分類の再確認が必要
5. 更新後は必ず `npm test`——`src/domain/data.test.ts` が既知の値（バブル天井38915.87等）と突き合わせて破損検知する。**月末終値に統一するとShiller月中平均前提のテスト（2020-03のS&P下落率など）の期待値調整が必要**

## §3 通貨・金額スケールの変更可能化（オーナー要望）

**現状**: 初期1万円＋毎月1000円は `src/state/game.ts` の `INITIAL_CASH` / `MONTHLY_ALLOWANCE` 定数。表示は `src/ui/i18n/text.ts` の `fmtYen`。

手順:
1. `src/data/economy.ts` を新規作成し、ゲーム経済設定を1オブジェクトに集約:
   ```ts
   export const ECONOMY = {
     currency: 'JPY',
     initialCash: 10000,
     monthlyAllowance: 1000,
     tradeUnit: 1000,        // Play.tsxの±1000ボタンもここから読む
     treeCost: 25,           // meta.ts から移す
   };
   ```
2. `fmtYen` を `fmtMoney(value, currency, adultMode)` に一般化。こどもモードの「まん」表記はJPY専用ロジックとして分岐（USDなら "$1.2k" 等）
3. スケール変更（例: 初期100万円の「おとな向けリアルモード」）は `ECONOMY` の差し替えだけで済むことをテストで保証: `engine/run.ts` は既に `cfg.initialCash` / `cfg.monthlyAllowance` 経由なので**エンジン変更は不要**
4. 注意: どんぐり換算 `scoring.ts calcAcorns` の `finalValue/2000` と `radiusFor`（Snowball.tsx）の `value/10000` はスケール依存。`ECONOMY.initialCash` 比で正規化すること（`value / ECONOMY.initialCash * 定数`）

## §4 多言語化（将来）

- 全こども文言は各コンポーネント内の日本語リテラル＋`text.ts`。多言語化する場合は `text.ts` の `TERMS`/`WORD_BOOK` パターンに寄せてから辞書化する
- **歴史イベントの紙芝居（`domain/events/history.ts`）が最大の翻訳資産**。構造は既にJSONライクなので、`story` を言語キー付きに拡張する
- ふりがな: 現状こどもモードはほぼ全ひらがなで運用しrubyタグ未使用。漢字を増やす場合は `<Ruby>` コンポーネントを新設し `text.ts` に `kanji|かんじ` 記法を導入する

## §5 アート・音の差し替え（将来）

- キャラクター: `src/ui/components/CharacterBubble.tsx` の絵文字アバター（🐿️🦉👻）を差し替え。パニックンの「勝つと小さくなる」演出（GDD §4）は未実装——metaに `panicWins` を持たせてアバターサイズに反映すると良い
- アイコン: `scripts/build-icons.mjs`（手描きラスタライザ）を本アートのPNGで置き換え
- 音: `src/platform/sound.ts` のオシレータ合成を音源ファイルに差し替える場合も**関数名とトリガ箇所は維持**（雪の付着/欠けが感情のアンカー。GDD §10）

## §6 未実装・磨き込み残（優先度順の提案）

1. **エンディング**: じだいずかんコンプでフクじいの「とうしかの あかし」（GDD §4のストーリーアーク終点）。`Zukan.tsx` にコンプ判定→専用画面
2. **パニックンの成長/縮小**: 勝敗をアバターサイズに反映（§5）
3. **きせかえ（コリンのへや）**: どんぐりの使い道拡張。pay-to-win禁止原則を維持
4. **ながいたび（120ヶ月）のチューニング**: 現状テンポ・イベント密度が未検証。おこづかい・パニック上限8回の妥当性をプレイテストで
5. **広告**: 遷移設計上の挿入点は「帰還スコア画面→もりのひろば」の間**のみ**（GDD §13。プレイ中断広告は禁止）
6. **アプリストア**: Capacitorラップを想定。`domain/` はそのまま動く
7. iOSでの `navigator.vibrate` 非対応は既知（無視される）。音のアンロックはユーザー操作起点なので現状実装（初回タップで `resume()`）でOK

## §7 子どもテスト・チェックリスト（現ビルドで実施可能）

GDD §14 の全項目が現ビルドでテスト可能。特に最初の親子テストで見るべき5点:
1. 「つぎのつきへ」を説明なしで押し続けられるか（5歳）
2. 雪だるまが縮んだときの感情語（恐怖が強すぎないか→シェイクOFF設定を案内）
3. パニックンで「がまんする」を選んだ理由を聞く（「メダルほしい」か「あとで あがるから」か）
4. 大損の旅のあと「もういっかい」と言うか
5. 帰還のタネあかしを最後まで聞くか（スキップしたがるならページ数削減を検討）
