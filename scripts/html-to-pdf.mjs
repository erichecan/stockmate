#!/usr/bin/env node
/**
 * 将 price.html 转为 PDF（表格内不换行由 HTML 内 @media print 控制）
 * 用法: node scripts/html-to-pdf.mjs [html路径] [pdf路径]
 * 依赖: 系统已安装 Chrome，或先执行 npx playwright install chromium 后用 NODE_USE_PLAYWRIGHT=1 运行
 */
import { fileURLToPath } from 'url';
import path from 'path';
import { spawnSync } from 'child_process';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const htmlPath = path.resolve(root, process.argv[2] || 'price.html');
const pdfPath = path.resolve(root, process.argv[3] || 'price.pdf');

const chromePaths = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
];

function runChrome() {
  const chrome = chromePaths.find((p) => fs.existsSync(p));
  if (!chrome) return null;
  const out = spawnSync(chrome, [
    '--headless',
    '--disable-gpu',
    '--no-pdf-header-footer',
    `--print-to-pdf=${pdfPath}`,
    `file://${htmlPath}`,
  ], { encoding: 'utf8', timeout: 30000 });
  return out.status === 0;
}

async function runPlaywright() {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle' });
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    landscape: true,
    printBackground: true,
    margin: { top: '15mm', right: '10mm', bottom: '15mm', left: '10mm' },
  });
  await browser.close();
}

(async () => {
  if (runChrome()) {
    console.log('PDF 已生成 (Chrome):', pdfPath);
    return;
  }
  if (process.env.NODE_USE_PLAYWRIGHT === '1') {
    await runPlaywright();
    console.log('PDF 已生成 (Playwright):', pdfPath);
    return;
  }
  console.error('未找到 Chrome。请安装 Chrome，或将 HTML 在浏览器中打开后 Ctrl+P → 另存为 PDF。');
  process.exit(1);
})();
