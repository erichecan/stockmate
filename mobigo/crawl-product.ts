import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'node:fs';
import path from 'node:path';
import querystring from 'node:querystring';

const BASE_URL = 'https://www.mobigo.ie';
const URLS_PATH = path.join(__dirname, 'data', 'product-urls.json');
const CATEGORY_PATHS_PATH = path.join(__dirname, 'data', 'product-category-paths.json');
const OUTPUT_PATH = path.join(__dirname, 'data', 'products-sample.jsonl');
const USER_AGENT =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123 Safari/537.36 mobigo-scraper';

type MobigoProduct = {
  url: string;
  code?: string;
  name?: string;
  // Updated: 2026-03-19T10:36:20 - 抓取商品描述，供详情页展示与导入
  description?: string;
  priceText?: string;
  currency?: string;
  categories?: string[];
  imageUrls?: string[];
};

// Updated: 2026-03-20T10:36:00 - 改用直接 POST 登录获取会话 cookie，避免依赖过期的 Playwright cookies
async function loginAndGetCookieHeader(): Promise<string> {
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
    throw new Error('登录失败：未获取到会话 cookie');
  }
  return setCookie.map((c) => c.split(';')[0]).join('; ');
}

// Updated: 2026-03-20T10:32:00 - 加入指数退避重试，应对 Cloudflare 502/429 限流
async function fetchHtml(
  url: string,
  cookieHeader: string,
  maxRetries = 4,
): Promise<string> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await axios.get(url, {
        headers: {
          Cookie: cookieHeader,
          'User-Agent': USER_AGENT,
        },
        timeout: 30000,
      });
      return res.data as string;
    } catch (err: unknown) {
      const status =
        (err as { response?: { status?: number } })?.response?.status ?? 0;
      // 可重试的状态码：502/503/429
      if (
        attempt < maxRetries &&
        (status === 502 || status === 503 || status === 429)
      ) {
        const delay = Math.min(2000 * 2 ** attempt, 30000);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw err;
    }
  }
  // 理论上不会走到这里，TypeScript 需要
  throw new Error(`fetchHtml: max retries exceeded for ${url}`);
}

function parseProduct(url: string, html: string, strictCategories: string[]): MobigoProduct {
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

  // Updated: 2026-03-19T10:36:20 - 解析商品描述（优先详细描述区，回退商品说明区）
  const descriptionSelectors = [
    '#ProductDescription',
    '.productdescription',
    '[itemprop="description"]',
    '.tab-content',
    '.product-tabs',
    'meta[name="description"]',
  ];
  let description: string | undefined;
  for (const selector of descriptionSelectors) {
    const node = $(selector).first();
    if (!node.length) continue;
    // Updated: 2026-03-19T10:45:10 - meta 描述使用 content，其余节点使用 text
    const raw =
      selector.startsWith('meta[') ? node.attr('content') || '' : node.text();
    const text = raw.replace(/\s+/g, ' ').trim();
    if (text && text.length >= 10) {
      description = text.slice(0, 4000);
      break;
    }
  }
  if (!description) {
    // Updated: 2026-03-19T10:46:35 - 兼容大小写不规则的 meta 标签描述
    const metaMatch = html.match(
      /<meta[^>]*name=["']?description["']?[^>]*content=["']([^"']+)["'][^>]*>/i,
    );
    const metaText = metaMatch?.[1]?.replace(/\s+/g, ' ').trim();
    if (metaText && metaText.length >= 10) {
      description = metaText.slice(0, 4000);
    }
  }

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
    description,
    priceText,
    currency,
    // Updated: 2026-03-19T22:30:30 - 严格使用 crawl-index 产出的类目路径，禁止从商品页全导航兜底抓取
    categories: strictCategories.length ? [...strictCategories] : undefined,
    imageUrls: imageUrls.size ? Array.from(imageUrls) : undefined,
  };
}

/** 与索引条目 / jsonl 中 url 对齐的 pathname 键。Updated: 2026-03-20T12:18:45 */
function normalizeProductPathKey(fromIndexEntryOrUrl: string): string {
  const s = fromIndexEntryOrUrl.trim();
  if (s.startsWith('http://') || s.startsWith('https://')) {
    try {
      return new URL(s).pathname;
    } catch {
      return s;
    }
  }
  return s.startsWith('/') ? s : `/${s}`;
}

/**
 * 从已有 jsonl 读取已成功写入的商品 pathname，用于断点续跑。
 * Updated: 2026-03-20T12:18:45
 */
function loadCompletedPathKeysFromJsonl(filePath: string): Set<string> {
  const keys = new Set<string>();
  if (!fs.existsSync(filePath)) return keys;
  const raw = fs.readFileSync(filePath, 'utf-8');
  for (const line of raw.split('\n')) {
    const t = line.trim();
    if (!t) continue;
    try {
      const row = JSON.parse(t) as { url?: string };
      if (row.url) keys.add(normalizeProductPathKey(row.url));
    } catch {
      // 跳过损坏行，避免阻断续跑
    }
  }
  return keys;
}

type CrawlJob = { url: string; strictCategories: string[] };

async function main() {
  if (!fs.existsSync(URLS_PATH)) {
    console.error('❌ 未找到 data/product-urls.json，请先运行 pnpm crawl:index');
    process.exit(1);
  }
  console.log('🔑 正在登录 Mobigo...');
  const cookieHeader = await loginAndGetCookieHeader();
  console.log('✅ 登录成功');
  const urls: string[] = JSON.parse(fs.readFileSync(URLS_PATH, 'utf-8'));
  if (!fs.existsSync(CATEGORY_PATHS_PATH)) {
    console.error('❌ 未找到 data/product-category-paths.json，请先运行 pnpm crawl:index');
    process.exit(1);
  }
  const productCategoryPaths = JSON.parse(fs.readFileSync(CATEGORY_PATHS_PATH, 'utf-8')) as Record<
    string,
    string[]
  >;

  if (!urls.length) {
    console.error('❌ product-urls.json 为空，请检查 crawl-index 结果。');
    process.exit(1);
  }

  // Updated: 2026-03-20T12:18:45 - 默认断点续跑：跳过 jsonl 中已有 pathname；MOBIGO_CRAWL_FRESH=1 时清空重抓
  const fresh = process.env.MOBIGO_CRAWL_FRESH === '1' || process.env.MOBIGO_CRAWL_FRESH === 'true';
  const completedKeys = fresh ? new Set<string>() : loadCompletedPathKeysFromJsonl(OUTPUT_PATH);
  if (fresh && fs.existsSync(OUTPUT_PATH)) {
    console.log('🧹 MOBIGO_CRAWL_FRESH 已开启：将清空 products-sample.jsonl 后全量重抓');
    fs.unlinkSync(OUTPUT_PATH);
  }

  const jobs: CrawlJob[] = [];
  let strictSkipped = 0;
  for (const p of urls) {
    const normalizedProductPath = p.startsWith('http') ? new URL(p).pathname : p;
    const pathKey = normalizeProductPathKey(normalizedProductPath);
    if (completedKeys.has(pathKey)) {
      continue;
    }
    const url = p.startsWith('http') ? p : `${BASE_URL}${p}`;
    const strictCategories = productCategoryPaths[normalizedProductPath] ?? [];
    if (!strictCategories.length) {
      strictSkipped += 1;
      console.warn(`   ⏭️ 严格模式跳过（缺失类目路径）: ${url}`);
      continue;
    }
    jobs.push({ url, strictCategories });
  }

  // Updated: 2026-03-20T10:24:10 - 支持并发抓取提升全量详情抓取速度
  const concurrency = Math.max(1, Number(process.env.MOBIGO_CRAWL_CONCURRENCY || '8'));
  if (!jobs.length) {
    console.log(
      `✅ 无需抓取：${OUTPUT_PATH} 已含全部可抓商品（索引 ${urls.length} 条，已完成 ${completedKeys.size} 条 pathname；本次严格跳过 ${strictSkipped} 条无类目路径）`,
    );
    return;
  }
  console.log(
    `🕷 ${fresh ? '全量' : '续跑'}：索引 ${urls.length} 条，已有 ${completedKeys.size} 条，待抓 ${jobs.length} 条详情页`,
  );
  console.log(`⚙️ 并发数: ${concurrency}`);

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  const out = fs.createWriteStream(OUTPUT_PATH, { flags: fresh ? 'w' : 'a' });
  let cursor = 0;
  let done = 0;
  let failed = 0;

  const worker = async (): Promise<void> => {
    while (true) {
      const current = cursor;
      cursor += 1;
      if (current >= jobs.length) return;
      const job = jobs[current];
      try {
        // Updated: 2026-03-20T10:33:15 - 每次请求前随机短延迟 200~600ms，降低 Cloudflare 触发率
        await new Promise((r) =>
          setTimeout(r, 200 + Math.random() * 400),
        );
        const html = await fetchHtml(job.url, cookieHeader);
        const product = parseProduct(job.url, html, job.strictCategories);
        out.write(JSON.stringify(product) + '\n');
      } catch (e) {
        failed += 1;
        console.warn(`   ⚠️ 抓取失败: ${job.url}`, e);
      } finally {
        done += 1;
        // Updated: 2026-03-20T10:28:20 - 降低日志频率，避免全量抓取时控制台 I/O 成为瓶颈
        if (done % 100 === 0 || done === jobs.length) {
          console.log(
            `   📈 进度: ${done}/${jobs.length} (failed=${failed}, 本轮严格跳过无类目=${strictSkipped})`,
          );
        }
      }
    }
  };

  await Promise.all(Array.from({ length: concurrency }, () => worker()));

  out.end();
  console.log(`📊 本轮已处理待抓队列: ${done}/${jobs.length}`);
  console.log(`✅ 已追加/写入商品数据到 ${OUTPUT_PATH}`);
  console.log(`🚫 本轮扫描索引时严格跳过（缺失类目路径）: ${strictSkipped}`);
}

main().catch((err) => {
  console.error('crawl-product 出错:', err);
  process.exitCode = 1;
});

