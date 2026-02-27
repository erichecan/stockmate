// Updated: 2026-02-27T04:40:00
'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
  Plus,
  Search,
  X,
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
  Loader2,
  Package,
  ChevronLeft,
  ChevronRight,
  Layers,
  Barcode,
} from 'lucide-react';

import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

// ─── Types ───────────────────────────────────────────────

type ProductStatus = 'DRAFT' | 'PRE_ORDER' | 'ACTIVE' | 'DISCONTINUED';

interface Category {
  id: string;
  name: string;
  nameEn: string;
  code: string;
  parentId: string | null;
  tenantId: string;
  sortOrder: number;
  isActive: boolean;
}

interface Brand {
  id: string;
  name: string;
  code: string;
  tenantId: string;
  logoUrl: string | null;
  isActive: boolean;
}

interface Sku {
  id: string;
  code: string;
  productId: string;
  tenantId: string;
  variantAttributes: Record<string, string>;
  barcode: string | null;
  costPrice: number | null;
  wholesalePrice: number | null;
  retailPrice: number | null;
  weight: number | null;
  images: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Product {
  id: string;
  name: string;
  nameEn: string | null;
  description: string | null;
  descriptionEn: string | null;
  categoryId: string;
  brandId: string | null;
  tenantId: string;
  status: ProductStatus;
  images: string[];
  createdAt: string;
  updatedAt: string;
  category?: Category;
  brand?: Brand;
  skus?: Sku[];
  _count?: { skus: number };
}

interface ProductForm {
  name: string;
  nameEn: string;
  description: string;
  descriptionEn: string;
  categoryId: string;
  brandId: string;
  status: ProductStatus;
}

interface VariantRow {
  name: string;
  values: string;
}

// ─── Constants ───────────────────────────────────────────

const STATUS_OPTIONS: { value: ProductStatus; label: string }[] = [
  { value: 'DRAFT', label: '草稿' },
  { value: 'PRE_ORDER', label: '预售' },
  { value: 'ACTIVE', label: '在售' },
  { value: 'DISCONTINUED', label: '停产' },
];

const STATUS_BADGE_CONFIG: Record<
  ProductStatus,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; className?: string }
> = {
  DRAFT: { label: '草稿', variant: 'secondary' },
  PRE_ORDER: { label: '预售', variant: 'outline', className: 'border-yellow-500 text-yellow-700 dark:text-yellow-400' },
  ACTIVE: { label: '在售', variant: 'default', className: 'bg-green-600 hover:bg-green-600' },
  DISCONTINUED: { label: '停产', variant: 'destructive' },
};

const EMPTY_FORM: ProductForm = {
  name: '',
  nameEn: '',
  description: '',
  descriptionEn: '',
  categoryId: '',
  brandId: '',
  status: 'DRAFT',
};

const PAGE_SIZE = 20;

// ─── Helpers ─────────────────────────────────────────────

function formatPrice(price: number | null | undefined): string {
  if (price == null) return '-';
  return `¥${Number(price).toFixed(2)}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('zh-CN');
}

function generateCombinations(rows: VariantRow[]): Record<string, string>[] {
  const valid = rows.filter((r) => r.name.trim() && r.values.trim());
  if (valid.length === 0) return [];
  return valid.reduce<Record<string, string>[]>((combos, row) => {
    const vals = row.values
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);
    if (combos.length === 0) return vals.map((v) => ({ [row.name.trim()]: v }));
    return combos.flatMap((c) => vals.map((v) => ({ ...c, [row.name.trim()]: v })));
  }, []);
}

// ─── Component ───────────────────────────────────────────

export default function ProductsPage() {
  // Product list
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Filters
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Reference data
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);

  // Product form dialog
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Delete product dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Product detail sheet
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // SKU form dialog (create / edit)
  const [skuFormOpen, setSkuFormOpen] = useState(false);
  const [editingSku, setEditingSku] = useState<Sku | null>(null);
  const [skuAttrRows, setSkuAttrRows] = useState<{ key: string; value: string }[]>([{ key: '', value: '' }]);
  const [skuPrices, setSkuPrices] = useState({ costPrice: '', wholesalePrice: '', retailPrice: '', weight: '' });
  const [savingSku, setSavingSku] = useState(false);

  // Delete SKU dialog
  const [deleteSkuOpen, setDeleteSkuOpen] = useState(false);
  const [deletingSkuTarget, setDeletingSkuTarget] = useState<Sku | null>(null);
  const [deletingSkuLoading, setDeletingSkuLoading] = useState(false);

  // Bulk create SKU dialog
  const [bulkOpen, setBulkOpen] = useState(false);
  const [variantRows, setVariantRows] = useState<VariantRow[]>([{ name: '', values: '' }]);
  const [bulkPrices, setBulkPrices] = useState({ costPrice: '', wholesalePrice: '', retailPrice: '' });
  const [bulkSaving, setBulkSaving] = useState(false);

  // ─── Data Fetching ───

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/products', {
        params: {
          page,
          limit: PAGE_SIZE,
          ...(search && { search }),
          ...(filterCategory && { categoryId: filterCategory }),
          ...(filterStatus && { status: filterStatus }),
        },
      });
      setProducts(data.data);
      setTotalPages(data.totalPages);
      setTotal(data.total);
    } catch {
      toast.error('加载产品列表失败');
    } finally {
      setLoading(false);
    }
  }, [page, search, filterCategory, filterStatus]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    const loadReferenceData = async () => {
      try {
        const [catRes, brandRes] = await Promise.all([
          api.get('/categories'),
          api.get('/brands'),
        ]);
        setCategories(Array.isArray(catRes.data) ? catRes.data : catRes.data.data ?? []);
        setBrands(Array.isArray(brandRes.data) ? brandRes.data : brandRes.data.data ?? []);
      } catch {
        toast.error('加载分类/品牌数据失败');
      }
    };
    loadReferenceData();
  }, []);

  // ─── Product Handlers ───

  const openCreateDialog = () => {
    setEditingProduct(null);
    setForm(EMPTY_FORM);
    setFormDialogOpen(true);
  };

  const openEditDialog = (product: Product) => {
    setEditingProduct(product);
    setForm({
      name: product.name,
      nameEn: product.nameEn ?? '',
      description: product.description ?? '',
      descriptionEn: product.descriptionEn ?? '',
      categoryId: product.categoryId,
      brandId: product.brandId ?? '',
      status: product.status,
    });
    setFormDialogOpen(true);
  };

  const handleSaveProduct = async () => {
    if (!form.name.trim()) {
      toast.error('请输入产品名称');
      return;
    }
    if (!form.categoryId) {
      toast.error('请选择产品分类');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        nameEn: form.nameEn.trim() || undefined,
        description: form.description.trim() || undefined,
        descriptionEn: form.descriptionEn.trim() || undefined,
        categoryId: form.categoryId,
        brandId: form.brandId || undefined,
        status: form.status,
      };
      if (editingProduct) {
        await api.patch(`/products/${editingProduct.id}`, payload);
        toast.success('产品更新成功');
      } else {
        await api.post('/products', payload);
        toast.success('产品创建成功');
      }
      setFormDialogOpen(false);
      fetchProducts();
    } catch {
      toast.error(editingProduct ? '更新产品失败' : '创建产品失败');
    } finally {
      setSaving(false);
    }
  };

  const confirmDeleteProduct = (product: Product) => {
    setDeletingProduct(product);
    setDeleteDialogOpen(true);
  };

  const handleDeleteProduct = async () => {
    if (!deletingProduct) return;
    setDeleting(true);
    try {
      await api.delete(`/products/${deletingProduct.id}`);
      toast.success('产品已删除');
      setDeleteDialogOpen(false);
      fetchProducts();
    } catch {
      toast.error('删除产品失败');
    } finally {
      setDeleting(false);
    }
  };

  // ─── Product Detail ───

  const openProductDetail = async (product: Product) => {
    setDetailOpen(true);
    setSelectedProduct(null);
    setLoadingDetail(true);
    try {
      const { data } = await api.get(`/products/${product.id}`);
      setSelectedProduct(data);
    } catch {
      toast.error('加载产品详情失败');
    } finally {
      setLoadingDetail(false);
    }
  };

  const refreshProductDetail = useCallback(async () => {
    if (!selectedProduct) return;
    try {
      const { data } = await api.get(`/products/${selectedProduct.id}`);
      setSelectedProduct(data);
    } catch {
      toast.error('刷新产品详情失败');
    }
  }, [selectedProduct]);

  // ─── SKU Handlers ───

  const openCreateSku = () => {
    setEditingSku(null);
    setSkuAttrRows([{ key: '', value: '' }]);
    setSkuPrices({ costPrice: '', wholesalePrice: '', retailPrice: '', weight: '' });
    setSkuFormOpen(true);
  };

  const openEditSku = (sku: Sku) => {
    setEditingSku(sku);
    setSkuPrices({
      costPrice: sku.costPrice?.toString() ?? '',
      wholesalePrice: sku.wholesalePrice?.toString() ?? '',
      retailPrice: sku.retailPrice?.toString() ?? '',
      weight: sku.weight?.toString() ?? '',
    });
    setSkuFormOpen(true);
  };

  const handleSaveSku = async () => {
    setSavingSku(true);
    try {
      if (editingSku) {
        await api.patch(`/skus/${editingSku.id}`, {
          ...(skuPrices.costPrice !== '' && { costPrice: Number(skuPrices.costPrice) }),
          ...(skuPrices.wholesalePrice !== '' && { wholesalePrice: Number(skuPrices.wholesalePrice) }),
          ...(skuPrices.retailPrice !== '' && { retailPrice: Number(skuPrices.retailPrice) }),
          ...(skuPrices.weight !== '' && { weight: Number(skuPrices.weight) }),
        });
        toast.success('SKU 更新成功');
      } else {
        const variantAttributes: Record<string, string> = {};
        skuAttrRows.forEach((r) => {
          if (r.key.trim() && r.value.trim()) variantAttributes[r.key.trim()] = r.value.trim();
        });
        if (Object.keys(variantAttributes).length === 0) {
          toast.error('请至少添加一个变体属性');
          setSavingSku(false);
          return;
        }
        await api.post('/skus', {
          productId: selectedProduct!.id,
          variantAttributes,
          ...(skuPrices.costPrice !== '' && { costPrice: Number(skuPrices.costPrice) }),
          ...(skuPrices.wholesalePrice !== '' && { wholesalePrice: Number(skuPrices.wholesalePrice) }),
          ...(skuPrices.retailPrice !== '' && { retailPrice: Number(skuPrices.retailPrice) }),
          ...(skuPrices.weight !== '' && { weight: Number(skuPrices.weight) }),
        });
        toast.success('SKU 创建成功');
      }
      setSkuFormOpen(false);
      refreshProductDetail();
      fetchProducts();
    } catch {
      toast.error(editingSku ? '更新 SKU 失败' : '创建 SKU 失败');
    } finally {
      setSavingSku(false);
    }
  };

  const confirmDeleteSku = (sku: Sku) => {
    setDeletingSkuTarget(sku);
    setDeleteSkuOpen(true);
  };

  const handleDeleteSku = async () => {
    if (!deletingSkuTarget) return;
    setDeletingSkuLoading(true);
    try {
      await api.delete(`/skus/${deletingSkuTarget.id}`);
      toast.success('SKU 已删除');
      setDeleteSkuOpen(false);
      refreshProductDetail();
      fetchProducts();
    } catch {
      toast.error('删除 SKU 失败');
    } finally {
      setDeletingSkuLoading(false);
    }
  };

  // ─── Bulk Create ───

  const openBulkCreate = () => {
    setVariantRows([{ name: '', values: '' }]);
    setBulkPrices({ costPrice: '', wholesalePrice: '', retailPrice: '' });
    setBulkOpen(true);
  };

  const combinations = generateCombinations(variantRows);

  const handleBulkCreate = async () => {
    if (combinations.length === 0) {
      toast.error('请添加变体属性并填写属性值');
      return;
    }
    setBulkSaving(true);
    try {
      await api.post('/skus/bulk', {
        productId: selectedProduct!.id,
        variants: combinations.map((attrs) => ({
          attributes: attrs,
          ...(bulkPrices.costPrice && { costPrice: Number(bulkPrices.costPrice) }),
          ...(bulkPrices.wholesalePrice && { wholesalePrice: Number(bulkPrices.wholesalePrice) }),
          ...(bulkPrices.retailPrice && { retailPrice: Number(bulkPrices.retailPrice) }),
        })),
      });
      toast.success(`成功创建 ${combinations.length} 个 SKU`);
      setBulkOpen(false);
      refreshProductDetail();
      fetchProducts();
    } catch {
      toast.error('批量创建 SKU 失败');
    } finally {
      setBulkSaving(false);
    }
  };

  // ─── Derived Values ───

  const hasFilters = search || filterCategory || filterStatus;
  const clearFilters = () => {
    setSearch('');
    setFilterCategory('');
    setFilterStatus('');
    setPage(1);
  };

  const startItem = (page - 1) * PAGE_SIZE + 1;
  const endItem = Math.min(page * PAGE_SIZE, total);

  const renderStatusBadge = (status: ProductStatus) => {
    const cfg = STATUS_BADGE_CONFIG[status];
    return (
      <Badge variant={cfg.variant} className={cfg.className}>
        {cfg.label}
      </Badge>
    );
  };

  // ─── Render ────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">产品管理</h1>
          <p className="text-muted-foreground">
            管理产品（SPU）信息，包括分类、品牌和 SKU。
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4" />
          新建产品
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="搜索产品名称..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>
        <Select
          value={filterCategory || 'all'}
          onValueChange={(v) => {
            setFilterCategory(v === 'all' ? '' : v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="全部分类" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部分类</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filterStatus || 'all'}
          onValueChange={(v) => {
            setFilterStatus(v === 'all' ? '' : v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="全部状态" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="h-4 w-4" />
            清除筛选
          </Button>
        )}
      </div>

      {/* Products Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>产品名称</TableHead>
              <TableHead>分类</TableHead>
              <TableHead>品牌</TableHead>
              <TableHead>状态</TableHead>
              <TableHead className="text-center">SKU 数</TableHead>
              <TableHead>创建时间</TableHead>
              <TableHead className="w-[60px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-40 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-40 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Package className="h-10 w-10" />
                    <p>暂无产品数据</p>
                    {hasFilters && (
                      <p className="text-xs">尝试修改筛选条件</p>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              products.map((product) => (
                <TableRow
                  key={product.id}
                  className="cursor-pointer"
                  onClick={() => openProductDetail(product)}
                >
                  <TableCell>
                    <div>
                      <p className="font-medium">{product.name}</p>
                      {product.nameEn && (
                        <p className="text-xs text-muted-foreground">
                          {product.nameEn}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{product.category?.name ?? '-'}</TableCell>
                  <TableCell>{product.brand?.name ?? '-'}</TableCell>
                  <TableCell>{renderStatusBadge(product.status)}</TableCell>
                  <TableCell className="text-center">
                    {product._count?.skus ?? 0}
                  </TableCell>
                  <TableCell>{formatDate(product.createdAt)}</TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-xs">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => openProductDetail(product)}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          查看详情
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => openEditDialog(product)}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          编辑
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => confirmDeleteProduct(product)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          删除
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 0 && !loading && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            显示 {total > 0 ? `${startItem}-${endItem}` : '0'} / 共 {total} 条
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
              上一页
            </Button>
            <span className="text-sm text-muted-foreground">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              下一页
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ═══ Product Create / Edit Dialog ═══ */}
      <Dialog open={formDialogOpen} onOpenChange={setFormDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? '编辑产品' : '新建产品'}
            </DialogTitle>
            <DialogDescription>
              {editingProduct
                ? '修改产品信息。'
                : '填写产品基本信息以创建新产品。'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2 max-h-[60vh] overflow-y-auto pr-1">
            <div className="grid gap-2">
              <Label htmlFor="prod-name">产品名称 *</Label>
              <Input
                id="prod-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="输入产品中文名称"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="prod-nameEn">英文名称</Label>
              <Input
                id="prod-nameEn"
                value={form.nameEn}
                onChange={(e) => setForm({ ...form, nameEn: e.target.value })}
                placeholder="Enter product name in English"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="prod-desc">产品描述</Label>
              <Textarea
                id="prod-desc"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="输入产品描述"
                rows={3}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="prod-descEn">英文描述</Label>
              <Textarea
                id="prod-descEn"
                value={form.descriptionEn}
                onChange={(e) =>
                  setForm({ ...form, descriptionEn: e.target.value })
                }
                placeholder="Enter product description in English"
                rows={3}
              />
            </div>
            <div className="grid gap-2">
              <Label>产品分类 *</Label>
              <Select
                value={form.categoryId}
                onValueChange={(v) => setForm({ ...form, categoryId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择分类" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>品牌</Label>
              <Select
                value={form.brandId || 'none'}
                onValueChange={(v) =>
                  setForm({ ...form, brandId: v === 'none' ? '' : v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择品牌（可选）" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">不选择品牌</SelectItem>
                  {brands.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>状态</Label>
              <Select
                value={form.status}
                onValueChange={(v) =>
                  setForm({ ...form, status: v as ProductStatus })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setFormDialogOpen(false)}
            >
              取消
            </Button>
            <Button onClick={handleSaveProduct} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editingProduct ? '保存' : '创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ Delete Product Dialog ═══ */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              确定要删除产品「{deletingProduct?.name}」吗？此操作不可撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteProduct}
              disabled={deleting}
            >
              {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ Product Detail Sheet ═══ */}
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>产品详情</SheetTitle>
            <SheetDescription>查看产品信息和 SKU 列表</SheetDescription>
          </SheetHeader>

          {loadingDetail ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : selectedProduct ? (
            <div className="space-y-6 px-1">
              {/* Product Info */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">
                    {selectedProduct.name}
                  </h3>
                  {renderStatusBadge(selectedProduct.status)}
                </div>
                {selectedProduct.nameEn && (
                  <p className="text-sm text-muted-foreground">
                    {selectedProduct.nameEn}
                  </p>
                )}
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">分类：</span>
                    {selectedProduct.category?.name ?? '-'}
                  </div>
                  <div>
                    <span className="text-muted-foreground">品牌：</span>
                    {selectedProduct.brand?.name ?? '-'}
                  </div>
                </div>
                {selectedProduct.description && (
                  <p className="text-sm text-muted-foreground">
                    {selectedProduct.description}
                  </p>
                )}
              </div>

              <Separator />

              {/* SKU Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">
                    SKU 列表 ({selectedProduct.skus?.length ?? 0})
                  </h4>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={openCreateSku}
                    >
                      <Plus className="h-4 w-4" />
                      添加 SKU
                    </Button>
                    <Button size="sm" onClick={openBulkCreate}>
                      <Layers className="h-4 w-4" />
                      批量创建
                    </Button>
                  </div>
                </div>

                {selectedProduct.skus && selectedProduct.skus.length > 0 ? (
                  <div className="rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>SKU 编码</TableHead>
                          <TableHead>变体属性</TableHead>
                          <TableHead className="text-right">成本价</TableHead>
                          <TableHead className="text-right">批发价</TableHead>
                          <TableHead className="text-right">零售价</TableHead>
                          <TableHead>状态</TableHead>
                          <TableHead className="w-[50px]" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedProduct.skus.map((sku) => (
                          <TableRow key={sku.id}>
                            <TableCell className="font-mono text-xs font-semibold">
                              {sku.code}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {Object.entries(
                                  sku.variantAttributes ?? {},
                                ).map(([k, v]) => (
                                  <Badge
                                    key={k}
                                    variant="outline"
                                    className="text-xs"
                                  >
                                    {k}: {v}
                                  </Badge>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              {formatPrice(sku.costPrice)}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatPrice(sku.wholesalePrice)}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatPrice(sku.retailPrice)}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  sku.isActive ? 'default' : 'secondary'
                                }
                                className={
                                  sku.isActive ? 'bg-green-600' : undefined
                                }
                              >
                                {sku.isActive ? '启用' : '禁用'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon-xs">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() => openEditSku(sku)}
                                  >
                                    <Pencil className="mr-2 h-4 w-4" />
                                    编辑
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onClick={() => confirmDeleteSku(sku)}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    删除
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
                    <Barcode className="h-8 w-8" />
                    <p className="text-sm">暂无 SKU，请添加或批量创建。</p>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      {/* ═══ SKU Create / Edit Dialog ═══ */}
      <Dialog open={skuFormOpen} onOpenChange={setSkuFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingSku ? '编辑 SKU' : '添加 SKU'}
            </DialogTitle>
            <DialogDescription>
              {editingSku
                ? `编辑 SKU: ${editingSku.code}`
                : '为当前产品添加一个新的 SKU。'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2 max-h-[60vh] overflow-y-auto">
            {/* Variant attributes – create mode only */}
            {!editingSku && (
              <div className="space-y-3">
                <Label>变体属性</Label>
                {skuAttrRows.map((row, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      placeholder="属性名 (如: color)"
                      value={row.key}
                      onChange={(e) => {
                        const next = [...skuAttrRows];
                        next[i] = { ...next[i], key: e.target.value };
                        setSkuAttrRows(next);
                      }}
                      className="flex-1"
                    />
                    <Input
                      placeholder="属性值 (如: BLU)"
                      value={row.value}
                      onChange={(e) => {
                        const next = [...skuAttrRows];
                        next[i] = { ...next[i], value: e.target.value };
                        setSkuAttrRows(next);
                      }}
                      className="flex-1"
                    />
                    {skuAttrRows.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() =>
                          setSkuAttrRows(
                            skuAttrRows.filter((_, idx) => idx !== i),
                          )
                        }
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setSkuAttrRows([...skuAttrRows, { key: '', value: '' }])
                  }
                >
                  <Plus className="h-4 w-4" />
                  添加属性
                </Button>
              </div>
            )}

            {/* Variant attributes – edit mode, read-only display */}
            {editingSku && (
              <div className="space-y-2">
                <Label>变体属性</Label>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(editingSku.variantAttributes ?? {}).map(
                    ([k, v]) => (
                      <Badge key={k} variant="outline">
                        {k}: {v}
                      </Badge>
                    ),
                  )}
                </div>
              </div>
            )}

            {/* Price fields */}
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>成本价</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={skuPrices.costPrice}
                  onChange={(e) =>
                    setSkuPrices({ ...skuPrices, costPrice: e.target.value })
                  }
                  placeholder="0.00"
                />
              </div>
              <div className="grid gap-2">
                <Label>批发价</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={skuPrices.wholesalePrice}
                  onChange={(e) =>
                    setSkuPrices({
                      ...skuPrices,
                      wholesalePrice: e.target.value,
                    })
                  }
                  placeholder="0.00"
                />
              </div>
              <div className="grid gap-2">
                <Label>零售价</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={skuPrices.retailPrice}
                  onChange={(e) =>
                    setSkuPrices({
                      ...skuPrices,
                      retailPrice: e.target.value,
                    })
                  }
                  placeholder="0.00"
                />
              </div>
              <div className="grid gap-2">
                <Label>重量 (g)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={skuPrices.weight}
                  onChange={(e) =>
                    setSkuPrices({ ...skuPrices, weight: e.target.value })
                  }
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSkuFormOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSaveSku} disabled={savingSku}>
              {savingSku && <Loader2 className="h-4 w-4 animate-spin" />}
              {editingSku ? '保存' : '创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ Delete SKU Dialog ═══ */}
      <Dialog open={deleteSkuOpen} onOpenChange={setDeleteSkuOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除 SKU</DialogTitle>
            <DialogDescription>
              确定要删除 SKU「{deletingSkuTarget?.code}」吗？此操作不可撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteSkuOpen(false)}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteSku}
              disabled={deletingSkuLoading}
            >
              {deletingSkuLoading && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ Bulk Create SKU Dialog ═══ */}
      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>批量创建 SKU</DialogTitle>
            <DialogDescription>
              为产品「{selectedProduct?.name}」批量生成 SKU 变体。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            {/* Variant dimensions */}
            <div className="space-y-3">
              <Label>变体维度</Label>
              {variantRows.map((row, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    placeholder="属性名 (如: color)"
                    value={row.name}
                    onChange={(e) => {
                      const next = [...variantRows];
                      next[i] = { ...next[i], name: e.target.value };
                      setVariantRows(next);
                    }}
                    className="w-[130px]"
                  />
                  <Input
                    placeholder="多个值用逗号分隔 (如: BLU,RED,BLK)"
                    value={row.values}
                    onChange={(e) => {
                      const next = [...variantRows];
                      next[i] = { ...next[i], values: e.target.value };
                      setVariantRows(next);
                    }}
                    className="flex-1"
                  />
                  {variantRows.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() =>
                        setVariantRows(
                          variantRows.filter((_, idx) => idx !== i),
                        )
                      }
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setVariantRows([...variantRows, { name: '', values: '' }])
                }
              >
                <Plus className="h-4 w-4" />
                添加维度
              </Button>
            </div>

            {/* Combination preview */}
            {combinations.length > 0 && (
              <div className="space-y-2">
                <Label>预览 ({combinations.length} 个 SKU)</Label>
                <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border p-3">
                  {combinations.map((combo, i) => (
                    <div key={i} className="flex flex-wrap gap-1">
                      {Object.entries(combo).map(([k, v]) => (
                        <Badge
                          key={k}
                          variant="outline"
                          className="text-xs"
                        >
                          {k}: {v}
                        </Badge>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Default prices */}
            <div className="space-y-2">
              <Label>默认价格（应用到所有 SKU）</Label>
              <div className="grid grid-cols-3 gap-3">
                <div className="grid gap-1">
                  <span className="text-xs text-muted-foreground">成本价</span>
                  <Input
                    type="number"
                    step="0.01"
                    value={bulkPrices.costPrice}
                    onChange={(e) =>
                      setBulkPrices({
                        ...bulkPrices,
                        costPrice: e.target.value,
                      })
                    }
                    placeholder="0.00"
                  />
                </div>
                <div className="grid gap-1">
                  <span className="text-xs text-muted-foreground">批发价</span>
                  <Input
                    type="number"
                    step="0.01"
                    value={bulkPrices.wholesalePrice}
                    onChange={(e) =>
                      setBulkPrices({
                        ...bulkPrices,
                        wholesalePrice: e.target.value,
                      })
                    }
                    placeholder="0.00"
                  />
                </div>
                <div className="grid gap-1">
                  <span className="text-xs text-muted-foreground">零售价</span>
                  <Input
                    type="number"
                    step="0.01"
                    value={bulkPrices.retailPrice}
                    onChange={(e) =>
                      setBulkPrices({
                        ...bulkPrices,
                        retailPrice: e.target.value,
                      })
                    }
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkOpen(false)}>
              取消
            </Button>
            <Button
              onClick={handleBulkCreate}
              disabled={bulkSaving || combinations.length === 0}
            >
              {bulkSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              创建 {combinations.length} 个 SKU
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
