#!/bin/bash
# Seed phone case products

TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"Test1234!","tenantSlug":"test-company"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['accessToken'])")

BRANDS=$(curl -s http://localhost:3001/api/brands -H "Authorization: Bearer $TOKEN")
get_brand() { echo "$BRANDS" | python3 -c "import sys,json; [print(b['id']) for b in json.load(sys.stdin) if b['code']=='$1']"; }

CATS=$(curl -s http://localhost:3001/api/categories -H "Authorization: Bearer $TOKEN")
get_cat() { echo "$CATS" | python3 -c "import sys,json; [print(c['id']) for c in json.load(sys.stdin) if c['code']=='$1']"; }

ESR=$(get_brand ESR); SPG=$(get_brand SPG); AP=$(get_brand AP); OTB=$(get_brand OTB)
RGK=$(get_brand RGK); SAM=$(get_brand SAM); NLK=$(get_brand NLK); XM=$(get_brand XM); GGL=$(get_brand GGL)
IPCASE=$(get_cat IPCASE); SMCASE=$(get_cat SMCASE); XMCASE=$(get_cat XMCASE); PXCASE=$(get_cat PXCASE)

create_product() {
  local name="$1" nameEn="$2" desc="$3" descEn="$4" catId="$5" brandId="$6"
  curl -s -X POST http://localhost:3001/api/products \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "{\"name\":\"$name\",\"nameEn\":\"$nameEn\",\"description\":\"$desc\",\"descriptionEn\":\"$descEn\",\"categoryId\":\"$catId\",\"brandId\":\"$brandId\",\"status\":\"ACTIVE\"}" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])"
}

create_skus() {
  local productId="$1" variants="$2"
  curl -s -X POST http://localhost:3001/api/skus/bulk \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "{\"productId\":\"$productId\",\"variants\":$variants}" | python3 -c "import sys,json; skus=json.load(sys.stdin); print(f'{len(skus)} SKUs: ' + ', '.join(s['code'] for s in skus))"
}

echo "Creating iPhone cases..."

P1=$(create_product "iPhone 16 Pro Max 透明硅胶壳" "iPhone 16 Pro Max Clear Silicone Case" "超薄透明TPU材质防黄变" "Ultra-thin clear anti-yellowing TPU" "$IPCASE" "$ESR")
create_skus "$P1" '[{"attributes":{"color":"CLR","material":"TPU"},"costPrice":1.2,"wholesalePrice":3.5,"retailPrice":9.99},{"attributes":{"color":"BLU","material":"TPU"},"costPrice":1.3,"wholesalePrice":3.8,"retailPrice":10.99},{"attributes":{"color":"PNK","material":"TPU"},"costPrice":1.3,"wholesalePrice":3.8,"retailPrice":10.99}]'

P2=$(create_product "iPhone 16 Pro Max 碳纤维防摔壳" "iPhone 16 Pro Max Carbon Fiber Case" "碳纤维纹理四角气囊防摔" "Carbon fiber texture shock absorption" "$IPCASE" "$SPG")
create_skus "$P2" '[{"attributes":{"color":"BLK","material":"PC"},"costPrice":2.5,"wholesalePrice":6.99,"retailPrice":15.99},{"attributes":{"color":"NAV","material":"PC"},"costPrice":2.5,"wholesalePrice":6.99,"retailPrice":15.99}]'

P3=$(create_product "iPhone 16 Pro MagSafe 磁吸皮革壳" "iPhone 16 Pro MagSafe Leather Case" "真皮MagSafe磁吸环支持磁吸充电" "Genuine leather with MagSafe magnet ring" "$IPCASE" "$AP")
create_skus "$P3" '[{"attributes":{"color":"BLK","material":"LTH"},"costPrice":8,"wholesalePrice":18,"retailPrice":39.99},{"attributes":{"color":"BRN","material":"LTH"},"costPrice":8,"wholesalePrice":18,"retailPrice":39.99},{"attributes":{"color":"GRN","material":"LTH"},"costPrice":8,"wholesalePrice":18,"retailPrice":39.99}]'

P4=$(create_product "iPhone 15 Pro 军规防摔壳" "iPhone 15 Pro Military Grade Case" "MIL-STD-810G认证双层防护内置支架" "MIL-STD-810G certified dual-layer with kickstand" "$IPCASE" "$OTB")
create_skus "$P4" '[{"attributes":{"color":"BLK"},"costPrice":4.5,"wholesalePrice":12,"retailPrice":29.99},{"attributes":{"color":"BLU"},"costPrice":4.5,"wholesalePrice":12,"retailPrice":29.99}]'

P5=$(create_product "iPhone 15 超薄磨砂壳" "iPhone 15 Ultra-Thin Matte Case" "0.35mm超薄PP磨砂防指纹" "0.35mm ultra-thin PP matte anti-fingerprint" "$IPCASE" "$RGK")
create_skus "$P5" '[{"attributes":{"color":"BLK"},"costPrice":0.8,"wholesalePrice":2.5,"retailPrice":7.99},{"attributes":{"color":"WHT"},"costPrice":0.8,"wholesalePrice":2.5,"retailPrice":7.99},{"attributes":{"color":"BLU"},"costPrice":0.8,"wholesalePrice":2.5,"retailPrice":7.99},{"attributes":{"color":"GRN"},"costPrice":0.8,"wholesalePrice":2.5,"retailPrice":7.99}]'

echo ""
echo "Creating Samsung cases..."

P6=$(create_product "Samsung Galaxy S24 Ultra 透明防摔壳" "Samsung Galaxy S24 Ultra Clear Case" "高透明PC+TPU边框S Pen插槽" "High-transparency PC+TPU frame with S Pen slot" "$SMCASE" "$SPG")
create_skus "$P6" '[{"attributes":{"color":"CLR"},"costPrice":1.8,"wholesalePrice":4.99,"retailPrice":12.99},{"attributes":{"color":"MAT"},"costPrice":1.8,"wholesalePrice":4.99,"retailPrice":12.99}]'

P7=$(create_product "Samsung Galaxy S24 翻盖皮套" "Samsung Galaxy S24 Flip Leather Wallet Case" "翻盖设计3卡槽磁吸扣合可支架" "Flip cover 3 card slots magnetic clasp kickstand" "$SMCASE" "$SAM")
create_skus "$P7" '[{"attributes":{"color":"BLK","material":"PUL"},"costPrice":3,"wholesalePrice":8.5,"retailPrice":19.99},{"attributes":{"color":"BRN","material":"PUL"},"costPrice":3,"wholesalePrice":8.5,"retailPrice":19.99},{"attributes":{"color":"NAV","material":"PUL"},"costPrice":3,"wholesalePrice":8.5,"retailPrice":19.99}]'

P8=$(create_product "Samsung Galaxy S23 FE 液态硅胶壳" "Samsung Galaxy S23 FE Liquid Silicone Case" "亲肤液态硅胶超细纤维内衬" "Skin-friendly liquid silicone microfiber lining" "$SMCASE" "$NLK")
create_skus "$P8" '[{"attributes":{"color":"BLK"},"costPrice":1.6,"wholesalePrice":4.5,"retailPrice":11.99},{"attributes":{"color":"RED"},"costPrice":1.6,"wholesalePrice":4.5,"retailPrice":11.99},{"attributes":{"color":"GRY"},"costPrice":1.6,"wholesalePrice":4.5,"retailPrice":11.99}]'

echo ""
echo "Creating Xiaomi & Pixel cases..."

P9=$(create_product "Xiaomi 14 Ultra 素皮保护壳" "Xiaomi 14 Ultra Vegan Leather Case" "环保素皮Leica联名摄像头保护" "Eco-friendly vegan leather Leica co-branded" "$XMCASE" "$XM")
create_skus "$P9" '[{"attributes":{"color":"BLK"},"costPrice":3.5,"wholesalePrice":9,"retailPrice":22.99},{"attributes":{"color":"WHT"},"costPrice":3.5,"wholesalePrice":9,"retailPrice":22.99}]'

P10=$(create_product "Google Pixel 9 Pro 透明壳" "Google Pixel 9 Pro Crystal Clear Case" "高透明TPU+PC防黄变精准开孔" "High clarity TPU+PC anti-yellowing precise cutouts" "$PXCASE" "$RGK")
create_skus "$P10" '[{"attributes":{"color":"CLR"},"costPrice":1.5,"wholesalePrice":4.2,"retailPrice":10.99}]'

echo ""
echo "✅ All 10 phone case products created!"
