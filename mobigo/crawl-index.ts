import fs from 'node:fs';
import path from 'node:path';
import { chromium, type BrowserContext, type Cookie } from 'playwright';

const BASE_URL = 'https://www.mobigo.ie';
const COOKIES_PATH = path.join(__dirname, 'cookies', 'mobigo.json');
const OUTPUT_DIR = path.join(__dirname, 'data');
const OUTPUT_PATH = path.join(OUTPUT_DIR, 'product-urls.json');

// 从已保存的登录 Cookie 恢复会话
async function createContextWithCookies(): Promise<BrowserContext> {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();

  if (fs.existsSync(COOKIES_PATH)) {
    const raw = fs.readFileSync(COOKIES_PATH, 'utf-8');
    const cookies: Cookie[] = JSON.parse(raw);
    if (cookies.length) {
      await context.addCookies(cookies);
    }
  } else {
    console.warn('⚠️ 未找到 cookies/mobigo.json，请先运行 pnpm run login');
  }

  return context;
}

async function collectCategoryLinks(context: BrowserContext): Promise<string[]> {
  const page = await context.newPage();
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });

  // 从导航中提取所有分类/品牌链接（SearchResults 或 Category 等）
  const hrefs = await page.$$eval('a[href]', (anchors) =>
    anchors
      .map((a) => (a as HTMLAnchorElement).getAttribute('href') || '')
      .filter(Boolean),
  );

  const categoryLinks = new Set<string>();
  for (const href of hrefs) {
    if (
      /SearchResults\.asp/i.test(href) ||
      /Category\.asp/i.test(href) ||
      /category/i.test(href)
    ) {
      const url = href.startsWith('http') ? href : new URL(href, BASE_URL).toString();
      // 排除明显不是商品列表的链接
      if (!/login|register|cart|checkout/i.test(url)) {
        categoryLinks.add(url);
      }
    }
  }

  console.log(`📂 首页发现可能的分类/列表链接 ${categoryLinks.size} 条`);
  await page.close();
  return Array.from(categoryLinks);
}

async function crawlCategoryForProducts(
  context: BrowserContext,
  categoryUrl: string,
  productUrls: Set<string>,
  maxPagesPerCategory = 5,
): Promise<void> {
  const page = await context.newPage();
  let currentUrl = categoryUrl;

  for (let pageIndex = 0; pageIndex < maxPagesPerCategory; pageIndex += 1) {
    console.log(`   → 分类页 ${pageIndex + 1}: ${currentUrl}`);
    await page.goto(currentUrl, { waitUntil: 'domcontentloaded' });

    // 抓取本页商品链接
    const hrefs = await page.$$eval('a[href*="/product-p/"]', (anchors) =>
      anchors.map((a) => (a as HTMLAnchorElement).getAttribute('href') || '').filter(Boolean),
    );
    for (const href of hrefs) {
      const normalized = href.startsWith('http')
        ? new URL(href).pathname
        : new URL(href, BASE_URL).pathname;
      if (normalized.includes('/product-p/')) {
        productUrls.add(normalized);
      }
    }
    console.log(`      本页新增商品链接后累计: ${productUrls.size}`);

    // 查找“下一页”链接（Volusion 常用的分页文案）
    const nextLink = await page
      .$(
        [
          'a:has-text("Next")',
          'a:has-text(">>")',
          'a[rel="next"]',
          'input[type="submit"][value*="Next" i]',
        ].join(', '),
      )
      .catch(() => null);

    if (!nextLink) {
      break;
    }

    const nextHref = await nextLink.getAttribute('href');
    if (!nextHref) break;
    currentUrl = nextHref.startsWith('http')
      ? nextHref
      : new URL(nextHref, BASE_URL).toString();
  }

  await page.close();
}

async function main() {
  const productUrls = new Set<string>();
  const context = await createContextWithCookies();

  try {
    const categoryLinks = await collectCategoryLinks(context);

    // 覆盖全部分类；如需限流可在此处改为 slice(N)
    const targets = categoryLinks;

    for (const url of targets) {
      console.log(`📁 遍历分类列表: ${url}`);
      await crawlCategoryForProducts(context, url, productUrls);
    }

    if (!productUrls.size) {
      console.warn(
        '⚠️ 仍未从分类页解析到 /product-p/ 链接，可能需要针对具体页面结构调整选择器。',
      );
    }

    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    const list = Array.from(productUrls).sort();
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(list, null, 2), 'utf-8');
    console.log(`📦 共收集商品链接 ${list.length} 条，已写入: ${OUTPUT_PATH}`);
  } finally {
    await context.browser()?.close();
  }
}

main().catch((err) => {
  console.error('crawl-index 出错:', err);
  process.exitCode = 1;
});


