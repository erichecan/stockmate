// Updated: 2026-03-14T15:32:00 - 批发站 P0: 未登录公共类目接口（按租户 slug 返回类目树）
import { BadRequestException, Controller, Get, Query, Res } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { CategoriesService } from '../categories/categories.service';
import { TenantsService } from '../tenants/tenants.service';
import { PrismaService } from '../prisma/prisma.service';
import { Public } from '../common/decorators/public.decorator';

function isBlockedHost(hostname: string): boolean {
  const host = hostname.trim().toLowerCase();
  if (!host) return true;
  if (host === 'localhost' || host === '127.0.0.1' || host === '::1') return true;
  if (host.endsWith('.local')) return true;
  // Updated: 2026-03-19T01:12:40 - 防 SSRF：拦截常见私网 IPv4 网段
  if (
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(host) ||
    /^169\.254\./.test(host)
  ) {
    return true;
  }
  return false;
}

function buildImageFallbackUrls(originalUrl: string): string[] {
  const variants = ['-4', '-3', '-2', '-2T'] as const;
  const match = originalUrl.match(
    /^(.*?)(-(?:4|3|2|2T))(\.(?:jpg|jpeg|png|webp)(?:\?.*)?)$/i,
  );
  if (!match) return [];
  const prefix = match[1];
  const currentVariant = match[2].toUpperCase();
  const suffix = match[3];
  const currentIndex = variants.findIndex(
    (v) => v.toUpperCase() === currentVariant,
  );
  if (currentIndex < 0) return [];
  return variants
    .slice(currentIndex + 1)
    .map((v) => `${prefix}${v}${suffix}`);
}

@ApiTags('Wholesale Public')
@Controller('wholesale/public')
export class WholesalePublicController {
  constructor(
    private readonly categoriesService: CategoriesService,
    private readonly tenantsService: TenantsService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('categories')
  @Public()
  @ApiOperation({
    summary: 'Get public category tree for wholesale site by tenant slug',
  })
  @ApiQuery({
    name: 'tenantSlug',
    required: true,
    description: 'Tenant slug for which to load the category tree',
  })
  async getCategoryTree(@Query('tenantSlug') tenantSlug: string): Promise<any> {
    // Note: 2026-03-14T15:32:00 - 简化实现：根据 slug 解析租户，再复用现有类目树逻辑
    const tenant = await this.tenantsService.findBySlug(tenantSlug.trim());
    const tree = await this.categoriesService.findTree(tenant.id);
    // Updated: 2026-03-19T00:55:20 - 隐藏 Mobigo 导入临时根类目，前台仅展示业务类目树
    const stripMobigoRoot = (nodes: any[]): any[] =>
      (nodes || [])
        .filter(
          (n) =>
            n?.code !== 'MOBIGO_ROOT' &&
            String(n?.name || '').toLowerCase() !== 'mobigo imported',
        )
        .map((n) => ({
          ...n,
          children: stripMobigoRoot(Array.isArray(n?.children) ? n.children : []),
        }));
    const strippedTree = stripMobigoRoot(Array.isArray(tree) ? tree : []);
    // Updated: 2026-03-19T10:44:20 - 返回类目商品数（含子孙类目），前台用于展示「类目(数量)」
    const grouped = await this.prisma.product.groupBy({
      by: ['categoryId'],
      where: { tenantId: tenant.id, status: 'ACTIVE' },
      _count: { _all: true },
    });
    const directCountMap = new Map<string, number>(
      grouped.map((row) => [row.categoryId, row._count._all]),
    );
    const withProductCount = (nodes: any[]): any[] =>
      (nodes || []).map((node) => {
        const children = withProductCount(
          Array.isArray(node?.children) ? node.children : [],
        );
        const directProductCount = directCountMap.get(node.id) ?? 0;
        const childrenProductCount = children.reduce(
          (sum, child) => sum + Number(child?.productCount || 0),
          0,
        );
        return {
          ...node,
          directProductCount,
          productCount: directProductCount + childrenProductCount,
          children,
        };
      });
    return withProductCount(strippedTree);
  }

  @Get('image')
  @Public()
  @ApiOperation({
    summary: 'Proxy external product image for mobile compatibility',
  })
  @ApiQuery({
    name: 'url',
    required: true,
    description: 'External image URL to proxy',
  })
  async proxyImage(
    @Query('url') url: string,
    @Res() response: Response,
  ): Promise<void> {
    if (!url?.trim()) {
      throw new BadRequestException('url is required');
    }

    let target: URL;
    try {
      target = new URL(url.trim());
    } catch {
      throw new BadRequestException('invalid url');
    }

    if (!['http:', 'https:'].includes(target.protocol)) {
      throw new BadRequestException('unsupported protocol');
    }
    if (isBlockedHost(target.hostname)) {
      throw new BadRequestException('blocked host');
    }

    const fetchUpstreamImage = async (targetUrl: string) =>
      fetch(targetUrl, {
        headers: {
          Accept: 'image/avif,image/webp,image/*,*/*;q=0.8',
          'User-Agent': 'StockmateImageProxy/1.0',
        },
        signal: AbortSignal.timeout(15000),
      });

    let upstream = await fetchUpstreamImage(target.toString());
    if (!upstream.ok) {
      // Updated: 2026-03-19T11:09:35 - 图规格回退链：-4 -> -3 -> -2 -> -2T
      const fallbackUrls = buildImageFallbackUrls(target.toString());
      for (const fallbackUrl of fallbackUrls) {
        upstream = await fetchUpstreamImage(fallbackUrl);
        if (upstream.ok) break;
      }
    }
    if (!upstream.ok) {
      throw new BadRequestException(`upstream image error: ${upstream.status}`);
    }

    const contentType = upstream.headers.get('content-type') || 'image/jpeg';
    if (!contentType.toLowerCase().startsWith('image/')) {
      throw new BadRequestException('upstream is not an image');
    }

    const buffer = Buffer.from(await upstream.arrayBuffer());
    // Updated: 2026-03-19T01:12:40 - 代理图片统一缓存 1 天，降低重复拉取开销
    response.setHeader('Content-Type', contentType);
    response.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400');
    response.send(buffer);
  }
}
