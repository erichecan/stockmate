import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'node:fs';
import path from 'node:path';

import type { Cookie } from 'playwright';

const BASE_URL = 'https://www.mobigo.ie';
const COOKIES_PATH = path.join(__dirname, 'cookies', 'mobigo.json');
const URLS_PATH = path.join(__dirname, 'data', 'product-urls.json');
const OUTPUT_PATH = path.join(__dirname, 'data', 'products-sample.jsonl');

type MobigoProduct = {
  url: string;
  code?: string;
  name?: string;
  priceText?: string;
  currency?: string;
  categories?: string[];
  imageUrls?: string[];
};

async function loadCookiesHeader(): Promise<string | undefined> {
  if (!fs.existsSync(COOKIES_PATH)) {
    console.warn('⚠️ 未找到 cookies/mobigo.json，请先运行 pnpm login');
    return;
  }
  const raw = fs.readFileSync(COOKIES_PATH, 'utf-8');
  const cookies: Cookie[] = JSON.parse(raw);
  if (!cookies.length) return;
  const cookieHeader = cookies
    .map((c) => `${c.name}=${encodeURIComponent(c.value)}`)
    .join('; ');
  return cookieHeader;
}

async function fetchHtml(url: string, cookieHeader?: string): Promise<string> {
  const res = await axios.get(url, {
    headers: cookieHeader
      ? {
          Cookie: cookieHeader,
          'User-Agent':
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123 Safari/537.36 mobigo-scraper',
        }
      : undefined,
    timeout: 30000,
  });
  return res.data as string;
}

function parseProduct(url: string, html: string): MobigoProduct {
  const $ = cheerio.load(html);

  // 标题
  const name =
    $('h1').first().text().trim() ||
    $('.productnamecolorLARGE').first().text().trim() ||
    undefined;

  // 价格文本（示例：€29.99）
  let priceText: string | undefined;
  let currency: string | undefined;
  const priceNode =
    $('[class*="PriceValue"], .product_productprice, .product_saleprice').first();
  if (priceNode.length) {
    const raw = priceNode.text().replace(/\s+/g, ' ').trim();
    priceText = raw;
    const m = raw.match(/[€£$]/);
    if (m) currency = m[0];
  }

  // 商品编码（Product Code）
  let code: string | undefined;
  const codeText = $('td, span, div')
    .filter((_, el) => $(el).text().includes('Product Code'))
    .first()
    .text();
  const codeMatch = codeText.match(/Product Code\s*[:：]\s*([A-Za-z0-9\-]+)/i);
  if (codeMatch) {
    code = codeMatch[1];
  } else {
    // 从 URL 回退提取
    const u = new URL(url);
    const seg = u.pathname.split('/product-p/')[1];
    if (seg) {
      const codePart = seg.replace(/\.htm$/i, '');
      code = codePart || undefined;
    }
  }

  // 面包屑分类
  const categories: string[] = [];
  $('a[href*="SearchResults.asp?Cat="], nav a').each((_, el) => {
    const txt = $(el).text().trim();
    if (txt && !['Home', 'All Products'].includes(txt)) {
      categories.push(txt);
    }
  });

  // 图片：优先从商品主图区域提取，过滤掉模板装饰图
  const imageUrls = new Set<string>();
  const candidates = $('img').toArray();
  for (const el of candidates) {
    const $img = $(el);
    const src = $img.attr('src') || $img.attr('data-src');
    if (!src) continue;

    const lower = src.toLowerCase();
    // 跳过明显的模板/边框/透明图标
    if (
      lower.includes('templates/262/images') ||
      lower.includes('clear1x1') ||
      lower.includes('icon_') ||
      lower.endsWith('.gif')
    ) {
      continue;
    }

    const full = src.startsWith('http') ? src : new URL(src, BASE_URL).toString();
    imageUrls.add(full);
  }

  return {
    url,
    code,
    name,
    priceText,
    currency,
    categories: categories.length ? Array.from(new Set(categories)) : undefined,
    imageUrls: imageUrls.size ? Array.from(imageUrls) : undefined,
  };
}

async function main() {
  if (!fs.existsSync(URLS_PATH)) {
    console.error('❌ 未找到 data/product-urls.json，请先运行 pnpm crawl:index');
    process.exit(1);
  }
  const cookieHeader = await loadCookiesHeader();
  const urls: string[] = JSON.parse(fs.readFileSync(URLS_PATH, 'utf-8'));

  if (!urls.length) {
    console.error('❌ product-urls.json 为空，请检查 crawl-index 结果。');
    process.exit(1);
  }

  // 全量抓取
  const sample = urls;
  console.log(`🕷 开始全量抓取 ${sample.length} 个商品详情页...`);

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  const out = fs.createWriteStream(OUTPUT_PATH, { flags: 'w' });

  for (const p of sample) {
    const url = p.startsWith('http') ? p : `${BASE_URL}${p}`;
    console.log(`   → 抓取 ${url}`);
    try {
      const html = await fetchHtml(url, cookieHeader);
      const product = parseProduct(url, html);
      out.write(JSON.stringify(product) + '\n');
    } catch (e) {
      console.warn(`   ⚠️ 抓取失败: ${url}`, e);
    }
  }

  out.end();
  console.log(`✅ 已写入商品数据到 ${OUTPUT_PATH}`);
}

main().catch((err) => {
  console.error('crawl-product 出错:', err);
  process.exitCode = 1;
});

