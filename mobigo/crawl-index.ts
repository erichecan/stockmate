import fs from 'node:fs';
import path from 'node:path';
import axios from 'axios';
import * as cheerio from 'cheerio';
import querystring from 'node:querystring';

const BASE_URL = 'https://www.mobigo.ie';
const OUTPUT_DIR = path.join(__dirname, 'data');
const OUTPUT_PATH = path.join(OUTPUT_DIR, 'product-urls.json');
const PRODUCT_CATEGORY_PATHS_OUTPUT_PATH = path.join(OUTPUT_DIR, 'product-category-paths.json');
const USER_AGENT =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123 Safari/537.36 mobigo-index-crawler';

type CategoryTarget = {
  url: string;
  path: string[];
};

function normalizeCategoryLabel(raw: string): string {
  // Updated: 2026-03-19T23:06:40 - 统一导航文案格式，保证类目层级匹配稳定
  return raw
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^[0-9]+\.\s*/g, '')
    .replace(/^[*]+|[*!]+$/g, '')
    .replace(/[📲🖥️]/g, '')
    .replace(/^View All\s+/i, '')
    .replace(/^A\s+(ESSENTIAL|SUMMER)\b/i, '$1')
    .trim();
}

function getCookieHeaderFromSetCookie(setCookie: string[]): string {
  return setCookie.map((cookie) => cookie.split(';')[0]).join('; ');
}

async function loginAndGetCookieHeader(): Promise<string> {
  // Updated: 2026-03-19T23:06:40 - 直接调用 Customer_Login 接口建立可用会话，避免历史 cookie 失效
  const email = process.env.MOBIGO_EMAIL || 'youyouanddt@hotmail.com';
  const password = process.env.MOBIGO_PASSWORD || 'Xiaoyan@0724';
  const payload = querystring.stringify({
    email,
    password,
    Login: 'Login',
    CalledBy: 'Register.asp',
    CustomerNewOld: 'old',
  });
  const loginRes = await axios.post(`${BASE_URL}/Customer_Login.asp`, payload, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': USER_AGENT,
    },
    maxRedirects: 0,
    validateStatus: () => true,
    timeout: 30000,
  });
  const setCookie = loginRes.headers['set-cookie'];
  if (!Array.isArray(setCookie) || setCookie.length === 0) {
    throw new Error('登录失败：未获取到会话 cookie。');
  }
  return getCookieHeaderFromSetCookie(setCookie);
}

async function fetchHtml(url: string, cookieHeader: string): Promise<string> {
  const res = await axios.get(url, {
    headers: {
      Cookie: cookieHeader,
      'User-Agent': USER_AGENT,
    },
    timeout: 30000,
  });
  return String(res.data);
}

function collectCategoryTargetsFromHome(homeHtml: string): CategoryTarget[] {
  const $ = cheerio.load(homeHtml);
  const byUrl = new Map<string, CategoryTarget>();

  // Updated: 2026-03-19T23:06:40 - 从导航树提取类目链接与层级关系
  $('nav a[href*="/category-s/"], #display_menu_s a[href*="/category-s/"]').each((_, anchor) => {
    const href = ($(anchor).attr('href') || '').trim();
    if (!href) return;
    const url = href.startsWith('http') ? href : new URL(href, BASE_URL).toString();
    if (!/\/category-s\/\d+\.htm/i.test(url)) return;
    if (/login|register|cart|checkout/i.test(url)) return;

    const path: string[] = [];
    const parentLis = $(anchor).parents('li').toArray().reverse();
    for (const li of parentLis) {
      const label = normalizeCategoryLabel($(li).children('a').first().text());
      if (label) path.push(label);
    }
    if (!path.length) {
      const own = normalizeCategoryLabel($(anchor).text());
      if (own) path.push(own);
    }
    if (!path.length) return;

    const existing = byUrl.get(url);
    if (!existing || path.length > existing.path.length) {
      byUrl.set(url, { url, path });
    }
  });

  return Array.from(byUrl.values()).sort((a, b) => a.url.localeCompare(b.url));
}

function parseCategoryId(categoryUrl: string): string | null {
  const match = categoryUrl.match(/\/category-s\/(\d+)\.htm/i);
  return match?.[1] || null;
}

function extractProductPathsFromSearchResults(html: string): string[] {
  const $ = cheerio.load(html);
  const paths = new Set<string>();
  $('a[href*="/product-p/"]').each((_, anchor) => {
    const href = ($(anchor).attr('href') || '').trim();
    if (!href) return;
    const pathname = href.startsWith('http') ? new URL(href).pathname : new URL(href, BASE_URL).pathname;
    if (pathname.includes('/product-p/')) paths.add(pathname);
  });
  return Array.from(paths);
}

function extractNextPageNumber(html: string): number | null {
  const matches = [...html.matchAll(/Add_Search_Param\('page',\s*([0-9]+)\)/gi)];
  if (!matches.length) return null;
  const nums = matches
    .map((m) => Number(m[1]))
    .filter((n) => Number.isFinite(n) && n >= 2);
  if (!nums.length) return null;
  return Math.max(...nums);
}

async function crawlCategoryBySearchResults(
  cookieHeader: string,
  target: CategoryTarget,
  productUrls: Set<string>,
  productCategoryPaths: Map<string, string[]>,
): Promise<void> {
  const categoryId = parseCategoryId(target.url);
  if (!categoryId) return;

  let page = 1;
  let guard = 0;
  while (guard < 200) {
    guard += 1;
    const searchUrl = `${BASE_URL}/SearchResults.asp?Cat=${categoryId}&show=400&page=${page}`;
    console.log(`   → 搜索页 page=${page}: ${searchUrl}`);
    const html = await fetchHtml(searchUrl, cookieHeader);
    const pageProducts = extractProductPathsFromSearchResults(html);
    for (const productPath of pageProducts) {
      productUrls.add(productPath);
      const existing = productCategoryPaths.get(productPath);
      if (!existing) {
        productCategoryPaths.set(productPath, [...target.path]);
      } else if (existing.join(' > ') !== target.path.join(' > ')) {
        // Updated: 2026-03-19T23:08:55 - 多类目命中时优先保留更深层级路径，保证挂载尽量精确
        if (target.path.length > existing.length) {
          console.warn(
            `⚠️ 商品命中多个类目，切换到更深路径: ${productPath}\n   from=${existing.join(
              ' > ',
            )}\n   to=${target.path.join(' > ')}`,
          );
          productCategoryPaths.set(productPath, [...target.path]);
        } else {
          console.warn(
            `⚠️ 商品命中多个类目，保留现有路径: ${productPath}\n   keep=${existing.join(
              ' > ',
            )}\n   drop=${target.path.join(' > ')}`,
          );
        }
      }
    }
    console.log(`      本页商品数: ${pageProducts.length}，累计唯一商品: ${productUrls.size}`);

    const nextPage = extractNextPageNumber(html);
    if (!nextPage || nextPage <= page) break;
    page = nextPage;
  }
}

async function main() {
  const cookieHeader = await loginAndGetCookieHeader();
  const homeHtml = await fetchHtml(BASE_URL, cookieHeader);
  const categoryTargets = collectCategoryTargetsFromHome(homeHtml);
  console.log(`📂 首页发现导航类目链接 ${categoryTargets.length} 条`);

  const productUrls = new Set<string>();
  const productCategoryPaths = new Map<string, string[]>();

  for (const target of categoryTargets) {
    console.log(`📁 遍历分类列表: ${target.path.join(' > ')} (${target.url})`);
    await crawlCategoryBySearchResults(cookieHeader, target, productUrls, productCategoryPaths);
  }

  if (!productUrls.size) {
    throw new Error('未抓取到任何商品链接，请检查登录状态或站点结构。');
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const list = Array.from(productUrls).sort();
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(list, null, 2), 'utf-8');
  const categoryPathObject = Object.fromEntries(
    Array.from(productCategoryPaths.entries()).sort(([a], [b]) => a.localeCompare(b)),
  );
  fs.writeFileSync(
    PRODUCT_CATEGORY_PATHS_OUTPUT_PATH,
    JSON.stringify(categoryPathObject, null, 2),
    'utf-8',
  );
  console.log(`📦 共收集商品链接 ${list.length} 条，已写入: ${OUTPUT_PATH}`);
  console.log(
    `🧭 共写入商品类目路径 ${Object.keys(categoryPathObject).length} 条，文件: ${PRODUCT_CATEGORY_PATHS_OUTPUT_PATH}`,
  );
}

main().catch((err) => {
  console.error('crawl-index 出错:', err);
  process.exitCode = 1;
});


