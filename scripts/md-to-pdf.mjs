#!/usr/bin/env node
/**
 * 将 Markdown 转为 PDF（使用 Playwright）
 * Updated: 2026-02-28
 */
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const inputMd = join(root, 'docs/product-overview.md');
const outputPdf = join(root, 'docs/product-overview.pdf');

// 简单 markdown 转 HTML（支持标题、表格、列表、代码块）
function mdToHtml(md) {
  let html = md
    .replace(/^### (.*)$/gm, '<h3>$1</h3>')
    .replace(/^## (.*)$/gm, '<h2>$1</h2>')
    .replace(/^# (.*)$/gm, '<h1>$1</h1>')
    .replace(/^#### (.*)$/gm, '<h4>$1</h4>')
    .replace(/^\|(.+)\|$/gm, (m) => {
      const cells = m.split('|').filter(Boolean).map(c => c.trim());
      if (cells.some(c => c.includes('---'))) return '';
      return '<tr>' + cells.map(c => `<td>${c}</td>`).join('') + '</tr>';
    })
    .replace(/<tr>.*<\/tr>/gs, (m) => {
      const rows = m.match(/<tr>.*?<\/tr>/gs);
      if (!rows || rows.length < 2) return m;
      let out = '<table><thead>' + rows[0] + '</thead><tbody>';
      for (let i = 1; i < rows.length; i++) out += rows[i];
      return out + '</tbody></table>';
    })
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>\n')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/^\-\s+/gm, '• ')
    .replace(/^\d+\.\s+/gm, '');
  return html.replace(/<\/p><p>/g, '</p><p>').replace(/^<\/p><p>/, '<p>').replace(/<\/p><p>$/, '</p>');
}

// 使用 frontend 的 marked 解析 MD（表格、列表等支持更好）
let htmlBody;
try {
  const markedPath = join(root, 'frontend/node_modules/marked');
  const { marked } = require(markedPath);
  htmlBody = marked.parse(readFileSync(inputMd, 'utf-8'));
} catch {
  const md = readFileSync(inputMd, 'utf-8');
  htmlBody = mdToHtml(md);
}

const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>StockFlow 产品功能说明</title>
<style>
  @page { size: A4; margin: 20mm; }
  body { font-family: -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif; font-size: 11pt; line-height: 1.6; color: #333; }
  h1 { font-size: 20pt; margin-top: 0; border-bottom: 2px solid #333; padding-bottom: 6px; }
  h2 { font-size: 16pt; margin-top: 24px; border-bottom: 1px solid #ccc; }
  h3 { font-size: 13pt; margin-top: 18px; }
  h4 { font-size: 12pt; margin-top: 14px; }
  table { border-collapse: collapse; width: 100%; margin: 12px 0; }
  th, td { border: 1px solid #ccc; padding: 6px 10px; text-align: left; }
  th { background: #f5f5f5; font-weight: 600; }
  code { background: #f5f5f5; padding: 2px 6px; border-radius: 4px; }
  pre { background: #f5f5f5; padding: 12px; overflow-x: auto; border-radius: 4px; }
  blockquote { border-left: 4px solid #ccc; margin: 12px 0; padding-left: 16px; color: #666; }
</style>
</head>
<body>${htmlBody}</body>
</html>`;

const htmlPath = join(root, 'docs/product-overview-temp.html');
writeFileSync(htmlPath, html, 'utf-8');

const playwrightPath = join(root, 'frontend/node_modules/playwright');
const { chromium } = require(playwrightPath);
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto('file://' + htmlPath, { waitUntil: 'networkidle' });
await page.pdf({ path: outputPdf, format: 'A4', margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' } });
await browser.close();

// 删除临时 HTML
await import('fs').then(fs => fs.promises.unlink(htmlPath).catch(() => {}));

console.log('Generated:', outputPdf);
