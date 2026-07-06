/** E2Eスモーク: ホーム→出発→旅を完走→帰還シーケンス→ホーム */
import { chromium } from 'playwright';

const SHOT = process.env.SHOT_DIR ?? '.';
const errors = [];
// CHROMIUM_PATH でプリインストール済みブラウザを指定可能（未指定なら通常解決）
const browser = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
);
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(String(e)));

await page.goto('http://127.0.0.1:4173/');
await page.waitForTimeout(800);
await page.screenshot({ path: `${SHOT}/01-home.png` });

// 出発
await page.getByRole('button', { name: /たびに でる/ }).click();
await page.waitForTimeout(300);
await page.screenshot({ path: `${SHOT}/02-travel.png` });
await page.getByText('のりこむ！').click();
await page.waitForTimeout(1600);

// チュートリアルを閲覧
for (let i = 0; i < 3; i++) {
  const b = page.getByText('わかった！');
  if (await b.count()) { await b.click(); await page.waitForTimeout(150); }
}
await page.screenshot({ path: `${SHOT}/03-play.png` });

// 両資産を買う
for (let i = 0; i < 4; i++) await page.getByText('＋1000えん').first().click();
for (let i = 0; i < 3; i++) await page.getByText('＋1000えん').nth(1).click();

// 24ターン進める（パニックが出たら「がまん」）
for (let t = 0; t < 24; t++) {
  const adv = page.getByText('つぎのつきへ');
  if (await adv.isEnabled().catch(() => false)) await adv.click();
  await page.waitForTimeout(120);
  const hold = page.getByText('がまんする');
  if (await hold.count()) {
    await page.screenshot({ path: `${SHOT}/04-panic.png` });
    await hold.click();
    await page.waitForTimeout(1800);
  }
}
await page.waitForTimeout(600);
await page.screenshot({ path: `${SHOT}/05-return-reveal.png` });

// 帰還シーケンスをタップで進めきる
for (let i = 0; i < 30; i++) {
  for (const label of ['くわしく きく', 'つぎへ ▶', 'けっかを みる ▶']) {
    const b = page.getByText(label);
    if (await b.count()) { await b.first().click(); await page.waitForTimeout(250); break; }
  }
  if (await page.getByText('たびの けっか').count()) break;
}
await page.screenshot({ path: `${SHOT}/06-score.png` });
const moshimoShown = await page.getByText('もりへ かえる').count();
await page.getByText('もりへ かえる').click();
await page.waitForTimeout(400);
await page.screenshot({ path: `${SHOT}/07-home-after.png` });

console.log(JSON.stringify({
  errors,
  scoreReached: moshimoShown > 0,
  acorns: await page.locator('header').textContent(),
}, null, 2));
await browser.close();
process.exit(errors.length ? 1 : 0);
