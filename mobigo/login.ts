import { chromium, BrowserContext } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE_URL = 'https://www.mobigo.ie/';
const EMAIL = 'youyouanddt@hotmail.com';
const PASSWORD = 'Xiaoyan@0724';

const COOKIES_DIR = path.join(__dirname, 'cookies');
const COOKIES_PATH = path.join(COOKIES_DIR, 'mobigo.json');

async function main() {
  const browser = await chromium.launch({ headless: true });
  let context: BrowserContext | null = null;

  try {
    context = await browser.newContext();
    const page = await context.newPage();

    console.log('🔐 打开登录页...');
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });

    // 顶部或底部通常有 Login / Register 链接，使用 link 文本匹配
    const loginLink =
      (await page.$('a:text-is("Login")')) ??
      (await page.$('a:text-matches("Login or Register", "i")')) ??
      (await page.$('a[href*="login"]'));

    if (!loginLink) {
      throw new Error('未找到登录链接，请手动检查页面结构。');
    }

    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
      loginLink.click(),
    ]);

    // 登录页里有 “Quick Login” 表单，包含 Email Address / Password 字段
    console.log('✉️ 填写邮箱和密码...');
    await page.fill('input[type="email"], input[name*="email"], input[id*="Email"]', EMAIL);
    await page.fill('input[type="password"], input[name*="pass"], input[id*="Password"]', PASSWORD);

    const submitButton =
      (await page.$('input[type="submit"][value*="Login" i]')) ??
      (await page.$('input[type="submit"]')) ??
      (await page.$('button:has-text("Login")'));

    if (!submitButton) {
      throw new Error('未找到登录提交按钮，请检查登录页结构。');
    }

    await Promise.all([
      page.waitForLoadState('domcontentloaded'),
      submitButton.click(),
    ]);

    // 简单判断是否登录成功：页面中不再出现 Quick Login 文案
    const hasError = await page
      .locator('text=/invalid|error|incorrect password/i')
      .first()
      .isVisible()
      .catch(() => false);

    if (hasError) {
      throw new Error('登录失败，请检查账号或页面结构。');
    }

    console.log('✅ 登录成功，保存 Cookie...');
    fs.mkdirSync(COOKIES_DIR, { recursive: true });
    const cookies = await context.cookies();
    fs.writeFileSync(COOKIES_PATH, JSON.stringify(cookies, null, 2), 'utf-8');
    console.log(`🍪 Cookies 已保存到: ${COOKIES_PATH}`);
  } finally {
    await context?.close();
    await browser.close();
  }
}

main().catch((err) => {
  console.error('登录流程出错:', err);
  process.exitCode = 1;
});

