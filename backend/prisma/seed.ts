// StockFlow Seed Data - 手机配件批发数据
// Updated: 2026-02-27T05:00:00
//
// Usage: npx tsx prisma/seed.ts

import 'dotenv/config';

const API_BASE = 'http://localhost:3001/api';
let TOKEN = '';

async function api(method: string, path: string, body?: unknown) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${method} ${path} failed (${res.status}): ${text}`);
  }
  return res.json();
}

async function main() {
  console.log('🌱 Starting StockFlow seed data...\n');

  // ===== 1. Login =====
  console.log('🔑 Logging in...');
  const auth = await api('POST', '/auth/login', {
    email: 'admin@test.com',
    password: 'Test1234!',
    tenantSlug: 'test-company',
  });
  TOKEN = auth.accessToken;
  console.log(`   ✅ Logged in as ${auth.user.email}\n`);

  // ===== 2. Categories (树形分类) =====
  console.log('📁 Creating categories...');

  const catPhoneCases = await api('POST', '/categories', { name: '手机壳', nameEn: 'Phone Cases', code: 'CASE' }).catch(() => null);
  const catScreenProtectors = await api('POST', '/categories', { name: '屏幕保护膜', nameEn: 'Screen Protectors', code: 'FILM' });
  const catCablesChargers = await api('POST', '/categories', { name: '充电器 & 线缆', nameEn: 'Chargers & Cables', code: 'CHG' });
  const catAudio = await api('POST', '/categories', { name: '耳机 & 音频', nameEn: 'Earphones & Audio', code: 'AUD' });
  const catStands = await api('POST', '/categories', { name: '手机支架', nameEn: 'Phone Stands & Holders', code: 'STD' });
  const catPowerBanks = await api('POST', '/categories', { name: '移动电源', nameEn: 'Power Banks', code: 'PWR' });
  const catTabletAcc = await api('POST', '/categories', { name: '平板配件', nameEn: 'Tablet Accessories', code: 'TAB' });
  const catWatchAcc = await api('POST', '/categories', { name: '手表配件', nameEn: 'Watch Accessories', code: 'WCH' });
  const catOther = await api('POST', '/categories', { name: '其他配件', nameEn: 'Other Accessories', code: 'OTH' });

  // 手机壳子分类 - use existing or new
  const caseId = catPhoneCases?.id;
  let catIphoneCases, catSamsungCases, catXiaomiCases, catPixelCases;
  if (caseId) {
    catIphoneCases = await api('POST', '/categories', { name: 'iPhone 手机壳', nameEn: 'iPhone Cases', code: 'IPCASE', parentId: caseId });
    catSamsungCases = await api('POST', '/categories', { name: 'Samsung 手机壳', nameEn: 'Samsung Cases', code: 'SMCASE', parentId: caseId });
    catXiaomiCases = await api('POST', '/categories', { name: 'Xiaomi 手机壳', nameEn: 'Xiaomi Cases', code: 'XMCASE', parentId: caseId });
    catPixelCases = await api('POST', '/categories', { name: 'Pixel 手机壳', nameEn: 'Pixel Cases', code: 'PXCASE', parentId: caseId });
  }

  // 屏幕保护膜子分类
  const catIphoneFilm = await api('POST', '/categories', { name: 'iPhone 保护膜', nameEn: 'iPhone Screen Protectors', code: 'IPFILM', parentId: catScreenProtectors.id });
  const catSamsungFilm = await api('POST', '/categories', { name: 'Samsung 保护膜', nameEn: 'Samsung Screen Protectors', code: 'SMFILM', parentId: catScreenProtectors.id });

  // 充电器子分类
  const catCables = await api('POST', '/categories', { name: '数据线', nameEn: 'Cables', code: 'CBL', parentId: catCablesChargers.id });
  const catWallChargers = await api('POST', '/categories', { name: '充电头', nameEn: 'Wall Chargers', code: 'WCHG', parentId: catCablesChargers.id });
  const catWirelessChargers = await api('POST', '/categories', { name: '无线充电器', nameEn: 'Wireless Chargers', code: 'WLCHG', parentId: catCablesChargers.id });
  const catCarChargers = await api('POST', '/categories', { name: '车载充电器', nameEn: 'Car Chargers', code: 'CCHG', parentId: catCablesChargers.id });

  console.log('   ✅ Categories created\n');

  // ===== 3. Brands =====
  console.log('🏷️  Creating brands...');

  const existingBrands = await api('GET', '/brands');
  const appleExists = existingBrands.find((b: { code: string }) => b.code === 'AP');

  const brandApple = appleExists || await api('POST', '/brands', { name: 'Apple', code: 'AP' }).catch(() => appleExists);
  const brandSamsung = await api('POST', '/brands', { name: 'Samsung', code: 'SAM' });
  const brandXiaomi = await api('POST', '/brands', { name: 'Xiaomi', code: 'XM' });
  const brandGoogle = await api('POST', '/brands', { name: 'Google', code: 'GGL' });
  const brandAnker = await api('POST', '/brands', { name: 'Anker', code: 'ANK' });
  const brandBaseus = await api('POST', '/brands', { name: 'Baseus 倍思', code: 'BSS' });
  const brandSpigen = await api('POST', '/brands', { name: 'Spigen', code: 'SPG' });
  const brandOtterBox = await api('POST', '/brands', { name: 'OtterBox', code: 'OTB' });
  const brandUgreen = await api('POST', '/brands', { name: 'UGREEN 绿联', code: 'UGR' });
  const brandNillkin = await api('POST', '/brands', { name: 'Nillkin 耐尔金', code: 'NLK' });
  const brandESR = await api('POST', '/brands', { name: 'ESR 亿色', code: 'ESR' });
  const brandRingke = await api('POST', '/brands', { name: 'Ringke', code: 'RGK' });
  const brandBelkin = await api('POST', '/brands', { name: 'Belkin', code: 'BLK' });
  const brandJBL = await api('POST', '/brands', { name: 'JBL', code: 'JBL' });
  const brandMomax = await api('POST', '/brands', { name: 'Momax 摩米士', code: 'MMX' });

  console.log('   ✅ 15 brands created\n');

  // ===== 4. Products (SPU) + SKUs =====
  console.log('📦 Creating products and SKUs...\n');

  const products: Array<{
    product: { name: string; nameEn: string; description?: string; descriptionEn?: string; categoryId: string; brandId: string; status: string };
    variants: Array<{ attributes: Record<string, string>; costPrice?: number; wholesalePrice?: number; retailPrice?: number }>;
  }> = [
    // ---- iPhone Cases ----
    {
      product: { name: 'iPhone 16 Pro Max 透明硅胶壳', nameEn: 'iPhone 16 Pro Max Clear Silicone Case', description: '超薄透明设计，TPU材质防黄变，精准开孔，支持无线充电', descriptionEn: 'Ultra-thin clear design, anti-yellowing TPU material, precise cutouts, wireless charging compatible', categoryId: catIphoneCases?.id, brandId: brandESR.id, status: 'ACTIVE' },
      variants: [
        { attributes: { color: 'CLR', material: 'TPU' }, costPrice: 1.20, wholesalePrice: 3.50, retailPrice: 9.99 },
        { attributes: { color: 'BLU', material: 'TPU' }, costPrice: 1.30, wholesalePrice: 3.80, retailPrice: 10.99 },
        { attributes: { color: 'PNK', material: 'TPU' }, costPrice: 1.30, wholesalePrice: 3.80, retailPrice: 10.99 },
      ],
    },
    {
      product: { name: 'iPhone 16 Pro Max 碳纤维防摔壳', nameEn: 'iPhone 16 Pro Max Carbon Fiber Shockproof Case', description: '碳纤维纹理，四角气囊防摔，磨砂手感，轻薄设计', descriptionEn: 'Carbon fiber texture, four-corner airbag shock absorption, matte finish, slim design', categoryId: catIphoneCases?.id, brandId: brandSpigen.id, status: 'ACTIVE' },
      variants: [
        { attributes: { color: 'BLK', material: 'PC' }, costPrice: 2.50, wholesalePrice: 6.99, retailPrice: 15.99 },
        { attributes: { color: 'NAV', material: 'PC' }, costPrice: 2.50, wholesalePrice: 6.99, retailPrice: 15.99 },
      ],
    },
    {
      product: { name: 'iPhone 16 Pro MagSafe 磁吸皮革壳', nameEn: 'iPhone 16 Pro MagSafe Leather Case', description: '真皮材质，内置MagSafe磁吸环，支持磁吸充电和配件', descriptionEn: 'Genuine leather, built-in MagSafe magnet ring, supports magnetic charging and accessories', categoryId: catIphoneCases?.id, brandId: brandApple?.id, status: 'ACTIVE' },
      variants: [
        { attributes: { color: 'BLK', material: 'LTH' }, costPrice: 8.00, wholesalePrice: 18.00, retailPrice: 39.99 },
        { attributes: { color: 'BRN', material: 'LTH' }, costPrice: 8.00, wholesalePrice: 18.00, retailPrice: 39.99 },
        { attributes: { color: 'GRN', material: 'LTH' }, costPrice: 8.00, wholesalePrice: 18.00, retailPrice: 39.99 },
      ],
    },
    {
      product: { name: 'iPhone 15 Pro 军规防摔壳', nameEn: 'iPhone 15 Pro Military Grade Drop Protection Case', description: 'MIL-STD-810G军规认证，双层防护，内置支架功能', descriptionEn: 'MIL-STD-810G certified, dual-layer protection, built-in kickstand', categoryId: catIphoneCases?.id, brandId: brandOtterBox.id, status: 'ACTIVE' },
      variants: [
        { attributes: { color: 'BLK' }, costPrice: 4.50, wholesalePrice: 12.00, retailPrice: 29.99 },
        { attributes: { color: 'BLU' }, costPrice: 4.50, wholesalePrice: 12.00, retailPrice: 29.99 },
      ],
    },
    {
      product: { name: 'iPhone 15 超薄磨砂壳', nameEn: 'iPhone 15 Ultra-Thin Matte Case', description: '0.35mm超薄PP材质，磨砂防指纹，极致轻薄', descriptionEn: '0.35mm ultra-thin PP material, matte anti-fingerprint, extremely slim', categoryId: catIphoneCases?.id, brandId: brandRingke.id, status: 'ACTIVE' },
      variants: [
        { attributes: { color: 'BLK', thickness: 'THIN' }, costPrice: 0.80, wholesalePrice: 2.50, retailPrice: 7.99 },
        { attributes: { color: 'WHT', thickness: 'THIN' }, costPrice: 0.80, wholesalePrice: 2.50, retailPrice: 7.99 },
        { attributes: { color: 'BLU', thickness: 'THIN' }, costPrice: 0.80, wholesalePrice: 2.50, retailPrice: 7.99 },
        { attributes: { color: 'GRN', thickness: 'THIN' }, costPrice: 0.80, wholesalePrice: 2.50, retailPrice: 7.99 },
      ],
    },

    // ---- Samsung Cases ----
    {
      product: { name: 'Samsung Galaxy S24 Ultra 透明防摔壳', nameEn: 'Samsung Galaxy S24 Ultra Clear Protective Case', description: '高透明度PC背板+TPU边框，支持S Pen插槽', descriptionEn: 'High-transparency PC back + TPU frame, S Pen slot compatible', categoryId: catSamsungCases?.id, brandId: brandSpigen.id, status: 'ACTIVE' },
      variants: [
        { attributes: { color: 'CLR' }, costPrice: 1.80, wholesalePrice: 4.99, retailPrice: 12.99 },
        { attributes: { color: 'MAT' }, costPrice: 1.80, wholesalePrice: 4.99, retailPrice: 12.99 },
      ],
    },
    {
      product: { name: 'Samsung Galaxy S24 翻盖皮套', nameEn: 'Samsung Galaxy S24 Flip Leather Wallet Case', description: '翻盖设计，内置卡槽×3，磁吸扣合，可支架使用', descriptionEn: 'Flip cover design, 3 card slots, magnetic clasp, kickstand function', categoryId: catSamsungCases?.id, brandId: brandSamsung.id, status: 'ACTIVE' },
      variants: [
        { attributes: { color: 'BLK', material: 'PUL' }, costPrice: 3.00, wholesalePrice: 8.50, retailPrice: 19.99 },
        { attributes: { color: 'BRN', material: 'PUL' }, costPrice: 3.00, wholesalePrice: 8.50, retailPrice: 19.99 },
        { attributes: { color: 'NAV', material: 'PUL' }, costPrice: 3.00, wholesalePrice: 8.50, retailPrice: 19.99 },
      ],
    },
    {
      product: { name: 'Samsung Galaxy S23 FE 液态硅胶壳', nameEn: 'Samsung Galaxy S23 FE Liquid Silicone Case', description: '亲肤液态硅胶，内衬超细纤维，防滑防摔', descriptionEn: 'Skin-friendly liquid silicone, microfiber lining, anti-slip shockproof', categoryId: catSamsungCases?.id, brandId: brandNillkin.id, status: 'ACTIVE' },
      variants: [
        { attributes: { color: 'BLK' }, costPrice: 1.60, wholesalePrice: 4.50, retailPrice: 11.99 },
        { attributes: { color: 'RED' }, costPrice: 1.60, wholesalePrice: 4.50, retailPrice: 11.99 },
        { attributes: { color: 'GRY' }, costPrice: 1.60, wholesalePrice: 4.50, retailPrice: 11.99 },
      ],
    },

    // ---- Xiaomi & Pixel Cases ----
    {
      product: { name: 'Xiaomi 14 Ultra 素皮保护壳', nameEn: 'Xiaomi 14 Ultra Vegan Leather Case', description: '环保素皮材质，Leica联名设计，精准摄像头保护', descriptionEn: 'Eco-friendly vegan leather, Leica co-branded design, precise camera protection', categoryId: catXiaomiCases?.id, brandId: brandXiaomi.id, status: 'ACTIVE' },
      variants: [
        { attributes: { color: 'BLK' }, costPrice: 3.50, wholesalePrice: 9.00, retailPrice: 22.99 },
        { attributes: { color: 'WHT' }, costPrice: 3.50, wholesalePrice: 9.00, retailPrice: 22.99 },
      ],
    },
    {
      product: { name: 'Google Pixel 9 Pro 透明壳', nameEn: 'Google Pixel 9 Pro Crystal Clear Case', description: '高透明TPU+PC混合材质，防黄变涂层，精准开孔', descriptionEn: 'High clarity TPU+PC hybrid, anti-yellowing coating, precise cutouts', categoryId: catPixelCases?.id, brandId: brandRingke.id, status: 'ACTIVE' },
      variants: [
        { attributes: { color: 'CLR' }, costPrice: 1.50, wholesalePrice: 4.20, retailPrice: 10.99 },
      ],
    },

    // ---- Screen Protectors ----
    {
      product: { name: 'iPhone 16 Pro Max 钢化玻璃膜 (3片装)', nameEn: 'iPhone 16 Pro Max Tempered Glass Screen Protector (3-Pack)', description: '9H硬度，0.33mm厚度，2.5D圆弧边，附送贴膜工具', descriptionEn: '9H hardness, 0.33mm thickness, 2.5D curved edge, alignment tool included', categoryId: catIphoneFilm.id, brandId: brandESR.id, status: 'ACTIVE' },
      variants: [
        { attributes: { type: 'CLR', pack: '3PK' }, costPrice: 0.90, wholesalePrice: 2.80, retailPrice: 8.99 },
        { attributes: { type: 'MAT', pack: '3PK' }, costPrice: 1.00, wholesalePrice: 3.20, retailPrice: 9.99 },
        { attributes: { type: 'PRV', pack: '2PK' }, costPrice: 1.50, wholesalePrice: 4.50, retailPrice: 12.99 },
      ],
    },
    {
      product: { name: 'iPhone 16 镜头保护贴', nameEn: 'iPhone 16 Camera Lens Protector', description: '蓝宝石玻璃镜头膜，单独镜头贴合设计，不影响拍照', descriptionEn: 'Sapphire glass lens protector, individual lens fit design, no photo interference', categoryId: catIphoneFilm.id, brandId: brandNillkin.id, status: 'ACTIVE' },
      variants: [
        { attributes: { color: 'CLR' }, costPrice: 0.60, wholesalePrice: 2.00, retailPrice: 6.99 },
        { attributes: { color: 'BLK' }, costPrice: 0.70, wholesalePrice: 2.20, retailPrice: 7.99 },
      ],
    },
    {
      product: { name: 'Samsung Galaxy S24 Ultra 曲面全覆盖膜', nameEn: 'Samsung Galaxy S24 Ultra Full Curved Screen Protector', description: '3D曲面全贴合，指纹解锁兼容，UV光固化安装', descriptionEn: '3D curved full adhesive, fingerprint unlock compatible, UV curing installation', categoryId: catSamsungFilm.id, brandId: brandBaseus.id, status: 'ACTIVE' },
      variants: [
        { attributes: { type: 'UV', pack: '2PK' }, costPrice: 2.00, wholesalePrice: 5.50, retailPrice: 14.99 },
      ],
    },
    {
      product: { name: 'iPhone 15 防窥钢化膜', nameEn: 'iPhone 15 Privacy Tempered Glass', description: '28°防窥角度，9H硬度，防指纹涂层', descriptionEn: '28° privacy angle, 9H hardness, anti-fingerprint coating', categoryId: catIphoneFilm.id, brandId: brandBaseus.id, status: 'ACTIVE' },
      variants: [
        { attributes: { pack: '2PK' }, costPrice: 1.20, wholesalePrice: 3.50, retailPrice: 9.99 },
      ],
    },

    // ---- Cables ----
    {
      product: { name: 'USB-C to Lightning MFi认证快充线', nameEn: 'USB-C to Lightning MFi Certified Fast Charging Cable', description: 'Apple MFi认证，支持PD 27W快充，尼龙编织防缠绕', descriptionEn: 'Apple MFi certified, PD 27W fast charging, nylon braided anti-tangle', categoryId: catCables.id, brandId: brandAnker.id, status: 'ACTIVE' },
      variants: [
        { attributes: { length: '1M', color: 'BLK' }, costPrice: 1.80, wholesalePrice: 4.50, retailPrice: 11.99 },
        { attributes: { length: '2M', color: 'BLK' }, costPrice: 2.20, wholesalePrice: 5.50, retailPrice: 13.99 },
        { attributes: { length: '1M', color: 'WHT' }, costPrice: 1.80, wholesalePrice: 4.50, retailPrice: 11.99 },
      ],
    },
    {
      product: { name: 'USB-C to USB-C 100W 快充数据线', nameEn: 'USB-C to USB-C 100W Fast Charging Data Cable', description: '支持100W PD快充，USB 3.2 10Gbps数据传输，E-Marker芯片', descriptionEn: '100W PD fast charging, USB 3.2 10Gbps data transfer, E-Marker chip', categoryId: catCables.id, brandId: brandUgreen.id, status: 'ACTIVE' },
      variants: [
        { attributes: { length: '1M' }, costPrice: 2.00, wholesalePrice: 5.00, retailPrice: 12.99 },
        { attributes: { length: '2M' }, costPrice: 2.80, wholesalePrice: 6.50, retailPrice: 15.99 },
        { attributes: { length: '3M' }, costPrice: 3.50, wholesalePrice: 8.00, retailPrice: 18.99 },
      ],
    },
    {
      product: { name: '3合1 磁吸充电线', nameEn: '3-in-1 Magnetic Charging Cable', description: '磁吸接头设计，Lightning/USB-C/Micro-USB三合一，盲插方便', descriptionEn: 'Magnetic connector design, Lightning/USB-C/Micro-USB 3-in-1, blind plug convenience', categoryId: catCables.id, brandId: brandBaseus.id, status: 'ACTIVE' },
      variants: [
        { attributes: { length: '1M', color: 'BLK' }, costPrice: 1.50, wholesalePrice: 3.80, retailPrice: 9.99 },
        { attributes: { length: '2M', color: 'BLK' }, costPrice: 1.80, wholesalePrice: 4.50, retailPrice: 11.99 },
      ],
    },

    // ---- Wall Chargers ----
    {
      product: { name: '65W GaN 氮化镓三口充电器', nameEn: '65W GaN 3-Port Wall Charger', description: '2C1A三口输出，GaN III技术，可折叠插脚，兼容iPhone/MacBook/iPad', descriptionEn: '2C1A triple-port output, GaN III technology, foldable prongs, compatible with iPhone/MacBook/iPad', categoryId: catWallChargers.id, brandId: brandAnker.id, status: 'ACTIVE' },
      variants: [
        { attributes: { color: 'WHT', plug: 'EU' }, costPrice: 6.00, wholesalePrice: 14.00, retailPrice: 32.99 },
        { attributes: { color: 'BLK', plug: 'EU' }, costPrice: 6.00, wholesalePrice: 14.00, retailPrice: 32.99 },
        { attributes: { color: 'WHT', plug: 'UK' }, costPrice: 6.00, wholesalePrice: 14.00, retailPrice: 32.99 },
      ],
    },
    {
      product: { name: '20W USB-C PD 快充头', nameEn: '20W USB-C PD Fast Charger', description: '小巧紧凑，iPhone 15/16标配充电速度，CE认证', descriptionEn: 'Compact size, iPhone 15/16 standard charging speed, CE certified', categoryId: catWallChargers.id, brandId: brandUgreen.id, status: 'ACTIVE' },
      variants: [
        { attributes: { color: 'WHT', plug: 'EU' }, costPrice: 1.50, wholesalePrice: 3.50, retailPrice: 8.99 },
        { attributes: { color: 'BLK', plug: 'EU' }, costPrice: 1.50, wholesalePrice: 3.50, retailPrice: 8.99 },
      ],
    },

    // ---- Wireless Chargers ----
    {
      product: { name: '15W MagSafe 磁吸无线充电器', nameEn: '15W MagSafe Magnetic Wireless Charger', description: '强磁吸附对准，15W快充，兼容MagSafe手机壳', descriptionEn: 'Strong magnetic alignment, 15W fast charge, MagSafe case compatible', categoryId: catWirelessChargers.id, brandId: brandBelkin.id, status: 'ACTIVE' },
      variants: [
        { attributes: { color: 'WHT' }, costPrice: 4.00, wholesalePrice: 10.00, retailPrice: 24.99 },
        { attributes: { color: 'BLK' }, costPrice: 4.00, wholesalePrice: 10.00, retailPrice: 24.99 },
      ],
    },
    {
      product: { name: '3合1 无线充电底座', nameEn: '3-in-1 Wireless Charging Station', description: '同时为iPhone+AirPods+Apple Watch充电，可折叠旅行设计', descriptionEn: 'Charge iPhone+AirPods+Apple Watch simultaneously, foldable travel design', categoryId: catWirelessChargers.id, brandId: brandMomax.id, status: 'ACTIVE' },
      variants: [
        { attributes: { color: 'WHT' }, costPrice: 8.00, wholesalePrice: 18.00, retailPrice: 39.99 },
        { attributes: { color: 'BLK' }, costPrice: 8.00, wholesalePrice: 18.00, retailPrice: 39.99 },
      ],
    },

    // ---- Car Chargers ----
    {
      product: { name: '车载快充 100W 双口充电器', nameEn: '100W Dual-Port Car Charger', description: 'USB-C 100W + USB-A 30W双口输出，铝合金外壳散热', descriptionEn: 'USB-C 100W + USB-A 30W dual output, aluminum alloy heat dissipation', categoryId: catCarChargers.id, brandId: brandBaseus.id, status: 'ACTIVE' },
      variants: [
        { attributes: { color: 'GRY' }, costPrice: 3.50, wholesalePrice: 8.50, retailPrice: 19.99 },
      ],
    },

    // ---- Audio ----
    {
      product: { name: '蓝牙5.3 主动降噪真无线耳机', nameEn: 'Bluetooth 5.3 ANC True Wireless Earbuds', description: '42dB主动降噪，30小时总续航，IPX5防水，触控操作', descriptionEn: '42dB ANC, 30h total battery, IPX5 waterproof, touch control', categoryId: catAudio.id, brandId: brandJBL.id, status: 'ACTIVE' },
      variants: [
        { attributes: { color: 'BLK' }, costPrice: 12.00, wholesalePrice: 25.00, retailPrice: 59.99 },
        { attributes: { color: 'WHT' }, costPrice: 12.00, wholesalePrice: 25.00, retailPrice: 59.99 },
        { attributes: { color: 'BLU' }, costPrice: 12.00, wholesalePrice: 25.00, retailPrice: 59.99 },
      ],
    },
    {
      product: { name: 'AirPods Pro 2 硅胶保护套', nameEn: 'AirPods Pro 2 Silicone Protective Case', description: '全包防摔设计，精准充电口开孔，含挂钩', descriptionEn: 'Full-body drop protection, precise charging port cutout, includes carabiner', categoryId: catAudio.id, brandId: brandESR.id, status: 'ACTIVE' },
      variants: [
        { attributes: { color: 'BLK' }, costPrice: 0.80, wholesalePrice: 2.50, retailPrice: 6.99 },
        { attributes: { color: 'WHT' }, costPrice: 0.80, wholesalePrice: 2.50, retailPrice: 6.99 },
        { attributes: { color: 'RED' }, costPrice: 0.80, wholesalePrice: 2.50, retailPrice: 6.99 },
        { attributes: { color: 'GRN' }, costPrice: 0.80, wholesalePrice: 2.50, retailPrice: 6.99 },
      ],
    },

    // ---- Stands & Holders ----
    {
      product: { name: '车载磁吸手机支架', nameEn: 'Magnetic Car Phone Mount', description: '强力钕磁铁，出风口夹式安装，360°旋转', descriptionEn: 'Strong neodymium magnets, air vent clip mount, 360° rotation', categoryId: catStands.id, brandId: brandBaseus.id, status: 'ACTIVE' },
      variants: [
        { attributes: { color: 'BLK', type: 'VENT' }, costPrice: 2.00, wholesalePrice: 5.00, retailPrice: 12.99 },
        { attributes: { color: 'BLK', type: 'DASH' }, costPrice: 2.50, wholesalePrice: 6.00, retailPrice: 14.99 },
      ],
    },
    {
      product: { name: '铝合金折叠桌面手机支架', nameEn: 'Aluminum Alloy Foldable Desktop Phone Stand', description: '航空铝合金，角度可调，可折叠便携，适配4-12.9寸设备', descriptionEn: 'Aviation aluminum, adjustable angle, foldable & portable, fits 4-12.9" devices', categoryId: catStands.id, brandId: brandUgreen.id, status: 'ACTIVE' },
      variants: [
        { attributes: { color: 'SLV' }, costPrice: 2.50, wholesalePrice: 6.00, retailPrice: 14.99 },
        { attributes: { color: 'GRY' }, costPrice: 2.50, wholesalePrice: 6.00, retailPrice: 14.99 },
      ],
    },
    {
      product: { name: '手机指环扣支架', nameEn: 'Phone Ring Holder Kickstand', description: '360°旋转，180°折叠，锌合金材质，3M强力背胶', descriptionEn: '360° rotation, 180° foldable, zinc alloy material, 3M strong adhesive', categoryId: catStands.id, brandId: brandMomax.id, status: 'ACTIVE' },
      variants: [
        { attributes: { color: 'BLK' }, costPrice: 0.50, wholesalePrice: 1.50, retailPrice: 4.99 },
        { attributes: { color: 'SLV' }, costPrice: 0.50, wholesalePrice: 1.50, retailPrice: 4.99 },
        { attributes: { color: 'GLD' }, costPrice: 0.50, wholesalePrice: 1.50, retailPrice: 4.99 },
      ],
    },

    // ---- Power Banks ----
    {
      product: { name: '20000mAh 65W 双向快充移动电源', nameEn: '20000mAh 65W Bi-directional Fast Charging Power Bank', description: '65W PD双向快充，可充MacBook，LED数显，飞机可带', descriptionEn: '65W PD bi-directional fast charge, MacBook compatible, LED display, airline approved', categoryId: catPowerBanks.id, brandId: brandAnker.id, status: 'ACTIVE' },
      variants: [
        { attributes: { color: 'BLK', capacity: '20K' }, costPrice: 10.00, wholesalePrice: 22.00, retailPrice: 49.99 },
        { attributes: { color: 'WHT', capacity: '20K' }, costPrice: 10.00, wholesalePrice: 22.00, retailPrice: 49.99 },
      ],
    },
    {
      product: { name: '10000mAh 超薄磁吸移动电源', nameEn: '10000mAh Ultra-Slim MagSafe Power Bank', description: 'MagSafe磁吸设计，15mm超薄，支持边充边用', descriptionEn: 'MagSafe magnetic design, 15mm ultra-thin, charge while using', categoryId: catPowerBanks.id, brandId: brandBaseus.id, status: 'ACTIVE' },
      variants: [
        { attributes: { color: 'BLK', capacity: '10K' }, costPrice: 6.00, wholesalePrice: 14.00, retailPrice: 29.99 },
        { attributes: { color: 'WHT', capacity: '10K' }, costPrice: 6.00, wholesalePrice: 14.00, retailPrice: 29.99 },
        { attributes: { color: 'BLU', capacity: '10K' }, costPrice: 6.00, wholesalePrice: 14.00, retailPrice: 29.99 },
      ],
    },
    {
      product: { name: '5000mAh MagSafe 迷你充电宝', nameEn: '5000mAh MagSafe Mini Power Bank', description: '超小巧卡片大小，磁吸即充，重量仅115g', descriptionEn: 'Card-size compact, magnetic snap-on charging, weighs only 115g', categoryId: catPowerBanks.id, brandId: brandAnker.id, status: 'ACTIVE' },
      variants: [
        { attributes: { color: 'BLK' }, costPrice: 4.00, wholesalePrice: 10.00, retailPrice: 22.99 },
        { attributes: { color: 'WHT' }, costPrice: 4.00, wholesalePrice: 10.00, retailPrice: 22.99 },
        { attributes: { color: 'PUR' }, costPrice: 4.00, wholesalePrice: 10.00, retailPrice: 22.99 },
        { attributes: { color: 'GRN' }, costPrice: 4.00, wholesalePrice: 10.00, retailPrice: 22.99 },
      ],
    },

    // ---- Tablet Accessories ----
    {
      product: { name: 'iPad Air M2 磁吸保护套', nameEn: 'iPad Air M2 Magnetic Smart Case', description: '磁吸翻盖，自动休眠唤醒，三折支架，支持Apple Pencil磁吸充电', descriptionEn: 'Magnetic flip cover, auto sleep/wake, tri-fold stand, Apple Pencil magnetic charging support', categoryId: catTabletAcc.id, brandId: brandESR.id, status: 'ACTIVE' },
      variants: [
        { attributes: { color: 'BLK', size: '11IN' }, costPrice: 3.50, wholesalePrice: 9.00, retailPrice: 21.99 },
        { attributes: { color: 'NAV', size: '11IN' }, costPrice: 3.50, wholesalePrice: 9.00, retailPrice: 21.99 },
        { attributes: { color: 'BLK', size: '13IN' }, costPrice: 4.00, wholesalePrice: 10.00, retailPrice: 24.99 },
      ],
    },
    {
      product: { name: 'Samsung Galaxy Tab S9 FE 书本式保护套', nameEn: 'Samsung Galaxy Tab S9 FE Book Cover Case', description: '仿皮革材质，内置S Pen收纳槽，多角度支撑', descriptionEn: 'Faux leather material, built-in S Pen slot, multi-angle stand', categoryId: catTabletAcc.id, brandId: brandSamsung.id, status: 'ACTIVE' },
      variants: [
        { attributes: { color: 'BLK' }, costPrice: 3.00, wholesalePrice: 7.50, retailPrice: 18.99 },
        { attributes: { color: 'GRY' }, costPrice: 3.00, wholesalePrice: 7.50, retailPrice: 18.99 },
      ],
    },

    // ---- Watch Accessories ----
    {
      product: { name: 'Apple Watch Ultra 2 钛金属表带', nameEn: 'Apple Watch Ultra 2 Titanium Metal Band', description: '钛合金材质，蝴蝶扣，适配49mm表盘', descriptionEn: 'Titanium alloy material, butterfly clasp, fits 49mm case', categoryId: catWatchAcc.id, brandId: brandApple?.id, status: 'ACTIVE' },
      variants: [
        { attributes: { color: 'SLV', size: '49MM' }, costPrice: 5.00, wholesalePrice: 12.00, retailPrice: 29.99 },
        { attributes: { color: 'BLK', size: '49MM' }, costPrice: 5.00, wholesalePrice: 12.00, retailPrice: 29.99 },
      ],
    },
    {
      product: { name: 'Apple Watch 运动硅胶表带', nameEn: 'Apple Watch Sport Silicone Band', description: '亲肤硅胶材质，快拆设计，适配41/45mm', descriptionEn: 'Skin-friendly silicone, quick-release design, fits 41/45mm', categoryId: catWatchAcc.id, brandId: brandUgreen.id, status: 'PRE_ORDER' },
      variants: [
        { attributes: { color: 'BLK', size: '45MM' }, costPrice: 1.00, wholesalePrice: 3.00, retailPrice: 7.99 },
        { attributes: { color: 'WHT', size: '45MM' }, costPrice: 1.00, wholesalePrice: 3.00, retailPrice: 7.99 },
        { attributes: { color: 'RED', size: '45MM' }, costPrice: 1.00, wholesalePrice: 3.00, retailPrice: 7.99 },
        { attributes: { color: 'BLU', size: '45MM' }, costPrice: 1.00, wholesalePrice: 3.00, retailPrice: 7.99 },
        { attributes: { color: 'BLK', size: '41MM' }, costPrice: 1.00, wholesalePrice: 3.00, retailPrice: 7.99 },
        { attributes: { color: 'WHT', size: '41MM' }, costPrice: 1.00, wholesalePrice: 3.00, retailPrice: 7.99 },
      ],
    },

    // ---- Other Accessories ----
    {
      product: { name: 'USB-C 扩展坞 7合1', nameEn: 'USB-C Hub 7-in-1 Docking Station', description: 'HDMI 4K@60Hz + USB-A×2 + USB-C PD 100W + SD/TF读卡 + 千兆网口', descriptionEn: 'HDMI 4K@60Hz + USB-A×2 + USB-C PD 100W + SD/TF card reader + Gigabit Ethernet', categoryId: catOther.id, brandId: brandUgreen.id, status: 'ACTIVE' },
      variants: [
        { attributes: { color: 'GRY' }, costPrice: 8.00, wholesalePrice: 18.00, retailPrice: 39.99 },
      ],
    },
    {
      product: { name: '蓝牙自拍杆三脚架', nameEn: 'Bluetooth Selfie Stick Tripod', description: '蓝牙遥控，铝合金可伸缩杆，三脚架模式，最长100cm', descriptionEn: 'Bluetooth remote, aluminum extendable pole, tripod mode, max length 100cm', categoryId: catOther.id, brandId: brandMomax.id, status: 'ACTIVE' },
      variants: [
        { attributes: { color: 'BLK' }, costPrice: 2.50, wholesalePrice: 6.00, retailPrice: 14.99 },
        { attributes: { color: 'WHT' }, costPrice: 2.50, wholesalePrice: 6.00, retailPrice: 14.99 },
      ],
    },
    {
      product: { name: 'IPX8 手机防水袋', nameEn: 'IPX8 Universal Waterproof Phone Pouch', description: 'IPX8级防水，支持水下触屏，适配6.9寸以下手机，含挂绳', descriptionEn: 'IPX8 waterproof rating, underwater touch screen, fits phones up to 6.9", lanyard included', categoryId: catOther.id, brandId: brandBaseus.id, status: 'ACTIVE' },
      variants: [
        { attributes: { color: 'BLK', size: 'UNI' }, costPrice: 0.80, wholesalePrice: 2.00, retailPrice: 5.99 },
        { attributes: { color: 'CLR', size: 'UNI' }, costPrice: 0.80, wholesalePrice: 2.00, retailPrice: 5.99 },
      ],
    },
  ];

  let productCount = 0;
  let skuCount = 0;

  for (const { product: productData, variants } of products) {
    if (!productData.categoryId || !productData.brandId) {
      console.log(`   ⚠️  Skipping "${productData.name}" (missing category or brand)`);
      continue;
    }

    try {
      const product = await api('POST', '/products', productData);
      productCount++;

      const skus = await api('POST', '/skus/bulk', {
        productId: product.id,
        variants,
      });
      skuCount += skus.length;

      console.log(`   ✅ ${productData.name} → ${skus.length} SKUs (${skus.map((s: { code: string }) => s.code).join(', ')})`);
    } catch (err) {
      console.log(`   ❌ Failed: ${productData.name} - ${(err as Error).message}`);
    }
  }

  console.log(`\n🎉 Seed complete!`);
  console.log(`   📦 Products created: ${productCount}`);
  console.log(`   🏷️  SKUs created: ${skuCount}`);
  console.log(`   📁 Categories: ~20`);
  console.log(`   🏷️  Brands: 15`);
}

main().catch(console.error);
