// 2026-03-20T18:22:10 - 网站管理：商品与主图维护列表 + PATCH 主数据（对齐后端 CATALOG_MAINTENANCE_ROLES）
// 2026-03-20T19:35:22 - 外层 min-w-0 + 表格 min-width，窄屏/演示 iframe 内可横向滚动看到「编辑」
// 2026-03-20T19:05:15 - 移除责任矩阵入口
// 2026-03-20T20:18:30 - 标准快速编辑：搜索、完整 SPU 字段、图片行编辑、SKU 只读、⌘↵ 保存
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  ArrowDown,
  ArrowUp,
  ExternalLink,
  Images,
  Loader2,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
} from 'lucide-react';

import { authApi } from '@/lib/api';
import { toImageProxyUrl } from '@/lib/image-proxy';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';

type ProductStatus = 'DRAFT' | 'PRE_ORDER' | 'ACTIVE' | 'DISCONTINUED';

const PRODUCT_STATUS_OPTIONS: { value: ProductStatus; label: string }[] = [
  { value: 'DRAFT', label: '草稿' },
  { value: 'PRE_ORDER', label: '预售' },
  { value: 'ACTIVE', label: '上架' },
  { value: 'DISCONTINUED', label: '停售' },
];

const BRAND_NONE = '__none__';

type ProductRow = {
  id: string;
  name: string;
  nameEn?: string | null;
  images?: string[] | null;
  status?: string;
  category?: { name?: string | null } | null;
  brand?: { name?: string | null } | null;
  _count?: { skus?: number };
};

type CategoryOption = { id: string; label: string };
type BrandOption = { id: string; name: string };

type SkuBrief = {
  id: string;
  code: string;
  minOrderQty?: number | null;
  moq?: number | null;
};

/** 2026-03-20T20:18:30 - Prisma Json 图片列兼容 */
function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === 'string');
}

function statusBadgeClass(status: string | undefined): string {
  switch (status) {
    case 'ACTIVE':
      return 'bg-emerald-600/15 text-emerald-800 dark:text-emerald-400';
    case 'PRE_ORDER':
      return 'bg-amber-500/15 text-amber-900 dark:text-amber-400';
    case 'DRAFT':
      return 'bg-muted text-muted-foreground';
    case 'DISCONTINUED':
      return 'bg-destructive/15 text-destructive';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

function statusLabel(status: string | undefined): string {
  const found = PRODUCT_STATUS_OPTIONS.find((o) => o.value === status);
  return found?.label ?? status ?? '—';
}

const PAGE_SIZE = 20;

export default function AdminProductsPage() {
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [rows, setRows] = useState<ProductRow[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');

  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [brands, setBrands] = useState<BrandOption[]>([]);

  const [editOpen, setEditOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formName, setFormName] = useState('');
  const [formNameEn, setFormNameEn] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formDescriptionEn, setFormDescriptionEn] = useState('');
  const [formCategoryId, setFormCategoryId] = useState('');
  const [formBrandId, setFormBrandId] = useState('');
  const [formStatus, setFormStatus] = useState<ProductStatus>('DRAFT');
  const [formImageUrls, setFormImageUrls] = useState<string[]>(['']);
  const [formSkus, setFormSkus] = useState<SkuBrief[]>([]);

  const saveEditRef = useRef<() => void>(() => {});

  useEffect(() => {
    const t = window.setTimeout(() => setSearchDebounced(searchInput.trim()), 320);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [searchDebounced]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [catRes, brandRes] = await Promise.all([
          authApi.get<unknown[]>('/categories'),
          authApi.get<unknown[]>('/brands'),
        ]);
        if (cancelled) return;
        const rawCats = Array.isArray(catRes.data) ? catRes.data : [];
        const catOpts: CategoryOption[] = rawCats.map((c) => {
          const r = c as { id?: string; name?: string; code?: string };
          return {
            id: r.id ?? '',
            label: r.code ? `${r.name ?? ''} (${r.code})` : (r.name ?? ''),
          };
        }).filter((c) => c.id);
        setCategories(catOpts);

        const rawBrands = Array.isArray(brandRes.data) ? brandRes.data : [];
        setBrands(
          rawBrands
            .map((b) => {
              const r = b as { id?: string; name?: string };
              return { id: r.id ?? '', name: r.name ?? '' };
            })
            .filter((b) => b.id),
        );
      } catch {
        if (!cancelled) toast.error('加载类目或品牌失败');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await authApi.get('/products', {
        params: {
          page,
          limit: PAGE_SIZE,
          ...(searchDebounced ? { search: searchDebounced } : {}),
        },
      });
      const list = Array.isArray(data?.data) ? data.data : [];
      setRows(list);
      const tp = typeof data?.totalPages === 'number' ? data.totalPages : 1;
      setTotalPages(Math.max(1, tp));
    } catch {
      toast.error('加载商品失败');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [page, searchDebounced]);

  useEffect(() => {
    void load();
  }, [load]);

  const previewMainImage = useMemo(() => {
    const first = formImageUrls.map((s) => s.trim()).find(Boolean);
    return first ? toImageProxyUrl(first, 'detail') : null;
  }, [formImageUrls]);

  const applyDetailToForm = useCallback(
    (data: {
      name?: string;
      nameEn?: string | null;
      description?: string | null;
      descriptionEn?: string | null;
      categoryId?: string;
      brandId?: string | null;
      status?: string;
      images?: unknown;
      skus?: SkuBrief[];
    }) => {
      setFormName(data.name ?? '');
      setFormNameEn(data.nameEn ?? '');
      setFormDescription(data.description ?? '');
      setFormDescriptionEn(data.descriptionEn ?? '');
      setFormCategoryId(data.categoryId ?? '');
      setFormBrandId(data.brandId ?? '');
      setFormStatus(
        PRODUCT_STATUS_OPTIONS.some((o) => o.value === data.status)
          ? (data.status as ProductStatus)
          : 'DRAFT',
      );
      const imgs = asStringArray(data.images);
      setFormImageUrls(imgs.length ? imgs : ['']);
      setFormSkus(Array.isArray(data.skus) ? data.skus : []);
    },
    [],
  );

  const openEdit = async (p: ProductRow) => {
    const id = p.id;
    setEditingId(id);
    setEditOpen(true);
    setDetailLoading(true);
    applyDetailToForm({
      name: p.name,
      nameEn: p.nameEn,
      categoryId: undefined,
      brandId: undefined,
      images: p.images,
      skus: [],
    });
    try {
      const { data } = await authApi.get(`/products/${id}`);
      applyDetailToForm({
        ...(data as Record<string, unknown>),
        skus: (data as { skus?: SkuBrief[] }).skus,
      });
    } catch {
      toast.error('加载商品详情失败');
      setEditOpen(false);
      setEditingId(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const saveEdit = async () => {
    if (!editingId || saving) return;
    const name = formName.trim();
    if (!name) {
      toast.error('商品名称不能为空');
      return;
    }
    if (!formCategoryId) {
      toast.error('请选择类目');
      return;
    }
    const images = formImageUrls.map((s) => s.trim()).filter(Boolean);
    setSaving(true);
    try {
      await authApi.patch(`/products/${editingId}`, {
        name,
        nameEn: formNameEn.trim() || undefined,
        description: formDescription.trim() || undefined,
        descriptionEn: formDescriptionEn.trim() || undefined,
        categoryId: formCategoryId,
        brandId: formBrandId ? formBrandId : null,
        status: formStatus,
        images,
      });
      toast.success('已保存');
      setEditOpen(false);
      setEditingId(null);
      await load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data
        ?.message;
      toast.error(typeof msg === 'string' ? msg : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  saveEditRef.current = () => {
    void saveEdit();
  };

  useEffect(() => {
    if (!editOpen || detailLoading) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        saveEditRef.current();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editOpen, detailLoading]);

  const updateImageRow = (index: number, value: string) => {
    setFormImageUrls((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const removeImageRow = (index: number) => {
    setFormImageUrls((prev) => (prev.length <= 1 ? [''] : prev.filter((_, i) => i !== index)));
  };

  const moveImageRow = (index: number, dir: -1 | 1) => {
    setFormImageUrls((prev) => {
      const j = index + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[j]] = [next[j], next[index]];
      return next;
    });
  };

  const addImageRow = () => setFormImageUrls((prev) => [...prev, '']);

  return (
    <div className="mx-auto max-w-6xl min-w-0 space-y-6 p-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Images className="h-7 w-7 text-primary" />
          商品管理
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          搜索定位、在编辑面板中一次性维护名称、类目、品牌、状态、描述与图片顺序；保存快捷键 ⌘/Ctrl + Enter。
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <CardTitle className="text-base">商品列表</CardTitle>
              <CardDescription>
                第 {page} / {totalPages} 页 · 每页 {PAGE_SIZE} 条
              </CardDescription>
            </div>
            <div className="flex w-full max-w-md flex-col gap-2 sm:w-auto">
              <Label htmlFor="prod-search" className="sr-only">
                搜索
              </Label>
              <Input
                id="prod-search"
                placeholder="按中文名、英文名模糊搜索…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              加载中…
            </div>
          ) : rows.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              {searchDebounced ? '没有匹配的商品' : '暂无商品'}
            </p>
          ) : (
            <>
              <Table className="min-w-[640px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[72px]">主图</TableHead>
                    <TableHead>名称</TableHead>
                    <TableHead className="hidden w-[100px] md:table-cell">状态</TableHead>
                    <TableHead className="hidden md:table-cell">类目</TableHead>
                    <TableHead className="hidden lg:table-cell">SKU 数</TableHead>
                    <TableHead className="w-[120px] text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((p) => {
                    const thumb = toImageProxyUrl(p.images?.[0], 'list');
                    return (
                      <TableRow key={p.id}>
                        <TableCell>
                          <div className="relative h-12 w-12 overflow-hidden rounded-md bg-muted">
                            {thumb ? (
                              <Image
                                src={thumb}
                                alt={p.nameEn || p.name}
                                fill
                                className="object-cover"
                                unoptimized
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center text-muted-foreground">
                                <Images className="h-5 w-5 opacity-30" />
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{p.name}</div>
                          {p.nameEn ? (
                            <div className="text-xs text-muted-foreground">{p.nameEn}</div>
                          ) : null}
                          <div className="mt-1 md:hidden">
                            <Badge className={cn('text-xs font-normal', statusBadgeClass(p.status))}>
                              {statusLabel(p.status)}
                            </Badge>
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground md:hidden">
                            {p.category?.name ?? '—'}
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Badge className={cn('font-normal', statusBadgeClass(p.status))}>
                            {statusLabel(p.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                          {p.category?.name ?? '—'}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm">
                          {p._count?.skus ?? '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" asChild title="前台预览">
                              <Link href={`/products/${p.id}`} target="_blank" rel="noreferrer">
                                <ExternalLink className="h-4 w-4" />
                              </Link>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => void openEdit(p)}
                              className="gap-1"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              编辑
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-t pt-4">
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 text-muted-foreground"
                  onClick={() => void load()}
                  disabled={loading}
                >
                  <RotateCcw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
                  刷新
                </Button>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1 || loading}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    上一页
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages || loading}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    下一页
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) setEditingId(null);
        }}
      >
        <DialogContent className="flex max-h-[92vh] max-w-3xl flex-col gap-0 overflow-hidden p-0">
          <DialogHeader className="shrink-0 border-b px-6 py-4">
            <DialogTitle>编辑商品</DialogTitle>
            <p className="text-xs text-muted-foreground">
              ⌘/Ctrl + Enter 保存 · 图片支持排序与逐条修改 URL
            </p>
          </DialogHeader>

          {detailLoading ? (
            <div className="flex items-center justify-center gap-2 py-20 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
              载入详情…
            </div>
          ) : (
            <>
              <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor="prod-name">中文名称</Label>
                        <Input
                          id="prod-name"
                          value={formName}
                          onChange={(e) => setFormName(e.target.value)}
                          autoComplete="off"
                        />
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor="prod-name-en">英文名称</Label>
                        <Input
                          id="prod-name-en"
                          value={formNameEn}
                          onChange={(e) => setFormNameEn(e.target.value)}
                          autoComplete="off"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>类目</Label>
                        <Select value={formCategoryId} onValueChange={setFormCategoryId}>
                          <SelectTrigger className="w-full min-w-0">
                            <SelectValue placeholder="选择类目" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>品牌</Label>
                        <Select
                          value={formBrandId || BRAND_NONE}
                          onValueChange={(v) => setFormBrandId(v === BRAND_NONE ? '' : v)}
                        >
                          <SelectTrigger className="w-full min-w-0">
                            <SelectValue placeholder="无品牌" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={BRAND_NONE}>无品牌</SelectItem>
                            {brands.map((b) => (
                              <SelectItem key={b.id} value={b.id}>
                                {b.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <Label>上架状态</Label>
                        <Select
                          value={formStatus}
                          onValueChange={(v) => setFormStatus(v as ProductStatus)}
                        >
                          <SelectTrigger className="w-full min-w-0">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PRODUCT_STATUS_OPTIONS.map((o) => (
                              <SelectItem key={o.value} value={o.value}>
                                {o.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <Label htmlFor="prod-desc">中文描述</Label>
                      <Textarea
                        id="prod-desc"
                        value={formDescription}
                        onChange={(e) => setFormDescription(e.target.value)}
                        rows={4}
                        className="resize-y text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="prod-desc-en">英文描述</Label>
                      <Textarea
                        id="prod-desc-en"
                        value={formDescriptionEn}
                        onChange={(e) => setFormDescriptionEn(e.target.value)}
                        rows={4}
                        className="resize-y text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label className="mb-2 block">主图预览</Label>
                      <div className="relative aspect-square w-full max-w-sm overflow-hidden rounded-lg border bg-muted">
                        {previewMainImage ? (
                          <Image
                            src={previewMainImage}
                            alt=""
                            fill
                            className="object-contain"
                            unoptimized
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                            填写下方首张有效 URL 后预览
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <Label>图片 URL（从上到下为轮播顺序）</Label>
                        <Button type="button" variant="outline" size="sm" onClick={addImageRow}>
                          <Plus className="mr-1 h-3.5 w-3.5" />
                          添加一行
                        </Button>
                      </div>
                      <div className="max-h-48 space-y-2 overflow-y-auto rounded-md border p-2">
                        {formImageUrls.map((url, index) => (
                          <div key={index} className="flex gap-1">
                            <Input
                              value={url}
                              onChange={(e) => updateImageRow(index, e.target.value)}
                              placeholder="https://…"
                              className="min-w-0 flex-1 font-mono text-xs"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="shrink-0"
                              title="上移"
                              disabled={index === 0}
                              onClick={() => moveImageRow(index, -1)}
                            >
                              <ArrowUp className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="shrink-0"
                              title="下移"
                              disabled={index === formImageUrls.length - 1}
                              onClick={() => moveImageRow(index, 1)}
                            >
                              <ArrowDown className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="shrink-0 text-destructive"
                              title="删除此行"
                              onClick={() => removeImageRow(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {formSkus.length > 0 ? (
                      <>
                        <Separator />
                        <div>
                          <Label className="mb-2 block text-muted-foreground">
                            SKU（只读，变体请在 ERP / 其他入口维护）
                          </Label>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>编码</TableHead>
                                <TableHead className="text-right">MOQ</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {formSkus.map((s) => (
                                <TableRow key={s.id}>
                                  <TableCell className="font-mono text-xs">{s.code}</TableCell>
                                  <TableCell className="text-right text-sm">
                                    {s.minOrderQty ?? s.moq ?? '—'}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </>
                    ) : null}
                  </div>
                </div>
              </div>

              <DialogFooter className="shrink-0 border-t bg-muted/30 px-6 py-4">
                <Button
                  variant="outline"
                  onClick={() => setEditOpen(false)}
                  disabled={saving}
                >
                  取消
                </Button>
                <Button onClick={() => void saveEdit()} disabled={saving}>
                  {saving ? '保存中…' : '保存'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
