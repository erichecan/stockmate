// Updated: 2026-03-19T11:08:25 - 按场景选择图片规格（列表中图 / 详情高清 / 放大超清）
type ImageScene = 'list' | 'detail' | 'zoom';

function swapVolusionVariant(input: string, variant: '2' | '3' | '4' | '2T'): string {
  const withKnownVariant = input.replace(
    /-(?:2T|2|3|4)(\.(?:jpg|jpeg|png|webp)(?:\?.*)?)$/i,
    `-${variant}$1`,
  );
  if (withKnownVariant !== input) return withKnownVariant;
  // Updated: 2026-03-19T11:13:45 - 非标准后缀（如 -0.jpg）不做后缀拼接，避免生成不存在的 URL
  return input;
}

function toPreferredSourceUrl(input: string, scene: ImageScene): string {
  if (!/\/vspfiles\/photos\//i.test(input)) return input;
  // Volusion 规格经验：-2T(缩略图) < -2(中图) < -3(高清，部分存在) < -4(超清，少量存在)
  switch (scene) {
    case 'zoom':
      return swapVolusionVariant(input, '4');
    case 'detail':
      return swapVolusionVariant(input, '3');
    case 'list':
    default:
      return swapVolusionVariant(input, '2');
  }
}

export function toImageProxyUrl(
  rawUrl?: string | null,
  scene: ImageScene = 'list',
): string | undefined {
  if (!rawUrl) return undefined;
  const input = String(rawUrl).trim();
  if (!input) return undefined;
  if (input.startsWith('data:') || input.startsWith('blob:')) return input;
  if (input.includes('/api/wholesale/public/image?url=')) return input;

  if (/^https?:\/\//i.test(input)) {
    const preferred = toPreferredSourceUrl(input, scene);
    const base = process.env.NEXT_PUBLIC_API_BASE_URL || '';
    if (!base) return preferred;
    const normalized = base.endsWith('/') ? base.slice(0, -1) : base;
    return `${normalized}/public/image?url=${encodeURIComponent(preferred)}`;
  }

  return input;
}
