// Updated: 2026-02-28T10:10:00
'use client';

import { useState, useEffect, useCallback } from 'react';
import { QrCode, Barcode, Printer, Plus, Trash2, Loader2, Check, ChevronsUpDown } from 'lucide-react';
import { toast } from 'sonner';

import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';

// ─── Constants ───────────────────────────────────────────────

type BarcodeMode = 'code128' | 'qr';
const LABEL_SIZES = [
  { value: '40x30', label: '40×30mm', width: 40, height: 30 },
  { value: '50x30', label: '50×30mm', width: 50, height: 30 },
  { value: '100x60', label: '100×60mm', width: 100, height: 60 },
] as const;

interface SkuOption {
  id: string;
  code: string;
  product: { name: string };
}

// ─── Sku Combobox for auto-suggest ────────────────────────────

function SkuCombobox({
  value,
  onSelect,
  onInputChange,
  placeholder = '输入 SKU 或商品名...',
}: {
  value: string;
  onSelect: (text: string) => void;
  onInputChange?: (text: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [options, setOptions] = useState<SkuOption[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSkus = useCallback(async () => {
    const q = search.trim();
    if (!q) {
      setOptions([]);
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.get<{ data: SkuOption[] }>('/skus', {
        params: { search: q, limit: 20, page: 1 },
      });
      setOptions(data?.data ?? []);
    } catch {
      setOptions([]);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const t = setTimeout(() => fetchSkus(), 300);
    return () => clearTimeout(t);
  }, [fetchSkus]);

  const handleSelect = (sku: SkuOption) => {
    onSelect(sku.code);
    onInputChange?.(sku.code);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative">
          <Input
            value={value}
            onChange={(e) => {
              onInputChange?.(e.target.value);
              setSearch(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder={placeholder}
          />
          <ChevronsUpDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="输入 SKU 编码或商品名..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>{loading ? '加载中...' : '未找到 SKU'}</CommandEmpty>
            <CommandGroup>
              {options.map((sku) => (
                <CommandItem
                  key={sku.id}
                  value={sku.id}
                  onSelect={() => handleSelect(sku)}
                >
                  <Check className="opacity-0 mr-2 h-4 w-4" />
                  {sku.code} - {sku.product.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ─── Main Component ───────────────────────────────────────────

export default function BarcodePage() {
  const [mode, setMode] = useState<BarcodeMode>('code128');
  const [singleText, setSingleText] = useState('');
  const [singlePreview, setSinglePreview] = useState<string | null>(null);
  const [singleLoading, setSingleLoading] = useState(false);

  const [batchText, setBatchText] = useState('');
  const [batchPreview, setBatchPreview] = useState<string[]>([]);
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchMode, setBatchMode] = useState(false);

  const [labelSize, setLabelSize] = useState<string>('40x30');

  // ─── Fetch single barcode ───

  const fetchSingleBarcode = useCallback(async () => {
    const text = singleText.trim();
    if (!text) {
      setSinglePreview(null);
      return;
    }
    setSingleLoading(true);
    try {
      const endpoint =
        mode === 'code128' ? '/barcode/code128/dataurl' : '/barcode/qr/dataurl';
      const { data } = await api.get<string>(endpoint, { params: { text } });
      setSinglePreview(data ?? null);
    } catch {
      toast.error('生成条码失败');
      setSinglePreview(null);
    } finally {
      setSingleLoading(false);
    }
  }, [mode, singleText]);

  useEffect(() => {
    const t = setTimeout(() => fetchSingleBarcode(), 400);
    return () => clearTimeout(t);
  }, [fetchSingleBarcode]);

  // ─── Fetch batch barcodes ───

  const fetchBatchBarcodes = useCallback(async () => {
    const lines = batchText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    if (lines.length === 0) {
      setBatchPreview([]);
      return;
    }
    setBatchLoading(true);
    try {
      const endpoint =
        mode === 'code128' ? '/barcode/code128/dataurl' : '/barcode/qr/dataurl';
      const results: string[] = [];
      for (const text of lines) {
        const { data } = await api.get<string>(endpoint, { params: { text } });
        results.push(data ?? '');
      }
      setBatchPreview(results);
    } catch {
      toast.error('批量生成条码失败');
      setBatchPreview([]);
    } finally {
      setBatchLoading(false);
    }
  }, [mode, batchText]);

  const handleBatchGenerate = () => {
    const lines = batchText.split('\n').map((s) => s.trim()).filter(Boolean);
    if (lines.length === 0) {
      toast.error('请输入至少一条编码');
      return;
    }
    fetchBatchBarcodes();
  };

  // ─── Print ───

  const handlePrint = () => {
    const sizeCfg = LABEL_SIZES.find((s) => s.value === labelSize) ?? LABEL_SIZES[0];
    const widthMm = sizeCfg.width;
    const heightMm = sizeCfg.height;

    // Build print content from current state
    let printContent = '';
    if (batchMode && batchPreview.length > 0) {
      const lines = batchText.split('\n').map((s) => s.trim()).filter(Boolean);
      printContent = batchPreview
        .map((dataUrl, i) => {
          const label = lines[i] ?? '';
          return `<div class="label"><img src="${dataUrl}" alt="" /><span>${label}</span></div>`;
        })
        .join('');
    } else if (!batchMode && singlePreview && singleText) {
      printContent = `<div class="label"><img src="${singlePreview}" alt="" /><span>${singleText}</span></div>`;
    }

    if (!printContent) {
      toast.error('无可打印内容');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('无法打开打印窗口');
      return;
    }
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>打印条码</title>
        <style>
          @page { size: ${widthMm}mm ${heightMm}mm; margin: 0; }
          body { margin: 0; padding: 2mm; font-size: 10px; }
          .label { width: ${widthMm - 4}mm; height: ${heightMm - 4}mm; display: flex; flex-direction: column; align-items: center; justify-content: center; break-inside: avoid; }
          .label img { max-width: 100%; max-height: 70%; object-fit: contain; }
          .label span { margin-top: 2mm; }
        </style>
      </head>
      <body>${printContent}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">条码打印</h1>
        <p className="text-muted-foreground">
          生成 Code128 条形码或二维码，支持单条与批量打印
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>生成条码</CardTitle>
          <CardDescription>输入文本或 SKU 编码生成 Code128 或 QR 码</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Mode selector */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant={mode === 'code128' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode('code128')}
            >
              <Barcode className="h-4 w-4" />
              Code128
            </Button>
            <Button
              variant={mode === 'qr' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode('qr')}
            >
              <QrCode className="h-4 w-4" />
              二维码
            </Button>
          </div>

          {/* Single mode */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Button
                variant={!batchMode ? 'default' : 'outline'}
                size="sm"
                onClick={() => setBatchMode(false)}
              >
                单条
              </Button>
              <Button
                variant={batchMode ? 'default' : 'outline'}
                size="sm"
                onClick={() => setBatchMode(true)}
              >
                <Plus className="h-4 w-4" />
                批量
              </Button>
            </div>

            {!batchMode ? (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>输入文本 / SKU</Label>
                  <SkuCombobox
                    value={singleText}
                    onSelect={setSingleText}
                    onInputChange={setSingleText}
                    placeholder="输入或搜索 SKU..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>预览</Label>
                  <div className="flex min-h-[120px] items-center justify-center rounded-md border bg-muted/30 p-4">
                    {singleLoading ? (
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    ) : singlePreview ? (
                      <div className="flex flex-col items-center gap-2">
                        <img
                          src={singlePreview}
                          alt="条码预览"
                          className="max-h-32 max-w-full object-contain"
                        />
                        <span className="text-xs text-muted-foreground">{singleText}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        输入内容后自动生成
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>批量输入（每行一条）</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setBatchText('');
                        setBatchPreview([]);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                      清空
                    </Button>
                  </div>
                  <Textarea
                    value={batchText}
                    onChange={(e) => setBatchText(e.target.value)}
                    placeholder="每行输入一条编码&#10;SKU001&#10;SKU002&#10;..."
                    rows={6}
                  />
                </div>
                <Button onClick={handleBatchGenerate} disabled={batchLoading}>
                  {batchLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                  生成全部
                </Button>
                {batchPreview.length > 0 && (
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                    {batchPreview.map((dataUrl, i) => {
                      const lines = batchText.split('\n').map((s) => s.trim()).filter(Boolean);
                      const label = lines[i] ?? '';
                      return (
                        <div
                          key={i}
                          className="flex flex-col items-center gap-2 rounded border p-3"
                        >
                          <img
                            src={dataUrl}
                            alt={`条码 ${i + 1}`}
                            className="max-h-24 max-w-full object-contain"
                          />
                          <span className="text-xs text-muted-foreground truncate w-full text-center">
                            {label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Label size & Print */}
          <div className="flex flex-wrap items-center gap-4 border-t pt-4">
            <div className="flex items-center gap-2">
              <Label>标签尺寸</Label>
              <Select value={labelSize} onValueChange={setLabelSize}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LABEL_SIZES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handlePrint}>
              <Printer className="h-4 w-4" />
              打印
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
