#!/usr/bin/env node
// 2026-03-14 22:45:00 - 从 1688 手机配件市场页面抓取的图片 URL，下载到 public/1688 供首页使用
import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '..', 'public', '1688');

const IMAGES = [
  'https://cbu01.alicdn.com/cms/upload/2016/523/689/2986325_1990471759.jpg',
  'https://cbu01.alicdn.com/cms/upload/2017/567/507/3705765_1990471759.jpg',
  'https://cbu01.alicdn.com/cms/upload/2017/400/320/3023004_1990471759.jpg',
  'https://cbu01.alicdn.com/cms/upload/2017/018/417/3714810_1990471759.jpg',
  'https://cbu01.alicdn.com/cms/upload/2017/718/107/3701817_1990471759.jpg',
  'https://cbu01.alicdn.com/cms/upload/2017/167/907/3709761_1990471759.jpg',
  'https://cbu01.alicdn.com/cms/upload/2017/600/710/3017006_1990471759.jpg',
  'https://cbu01.alicdn.com/cms/upload/2017/900/220/3022009_1990471759.jpg',
  'https://cbu01.alicdn.com/img/ibank/2016/070/895/3557598070_1867383390.180x180.jpg',
  'https://cbu01.alicdn.com/img/ibank/2017/775/119/4113911577_27422975.180x180.jpg',
  'https://cbu01.alicdn.com/img/ibank/2018/242/177/10204771242_806160092.180x180.jpg',
  'https://cbu01.alicdn.com/img/ibank/2018/274/080/10246080472_750111620.200x200.jpg',
  'https://cbu01.alicdn.com/img/ibank/2018/016/710/10052017610_982039426.110x110.jpg',
];

function download(url) {
  return new Promise((resolve, reject) => {
    const name = path.basename(url.split('?')[0]) || `img-${url.length}.jpg`;
    const file = path.join(OUT_DIR, name);
    if (fs.existsSync(file)) {
      resolve(name);
      return;
    }
    const req = https.get(
      url,
      { headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', Referer: 'https://3c.1688.com/' } },
      (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`${url} => ${res.statusCode}`));
          return;
        }
        const stream = fs.createWriteStream(file);
        res.pipe(stream);
        stream.on('finish', () => {
          stream.close();
          resolve(name);
        });
        stream.on('error', reject);
      }
    );
    req.on('error', reject);
  });
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const results = [];
  for (let i = 0; i < IMAGES.length; i++) {
    try {
      const name = await download(IMAGES[i]);
      results.push({ url: IMAGES[i], local: name });
      console.log(`OK ${i + 1}/${IMAGES.length} ${name}`);
    } catch (e) {
      console.warn(`FAIL ${IMAGES[i]}`, e.message);
      results.push({ url: IMAGES[i], local: null });
    }
  }
  fs.writeFileSync(
    path.join(OUT_DIR, 'manifest.json'),
    JSON.stringify(results, null, 2)
  );
  console.log('Done. manifest.json written.');
}

main().catch(console.error);
