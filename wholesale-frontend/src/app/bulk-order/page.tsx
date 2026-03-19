// 2026-03-17T03:30:00 - Bulk Order: Excel-like matrix with fuzzy SKU autocomplete
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Grid3X3,
  Plus,
  Trash2,
  Search,
  ShoppingCart,
  X,
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
  Keyboard,
} from 'lucide-react';
import { toast } from 'sonner';

import { useAuthStore } from '@/lib/auth-store';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { AuthGuard } from '@/components/auth-guard';

type BulkLineItem = {
  id: string;
  skuInput: string;
  qty: number;
  resolved: boolean;
  resolvedName: string;
  resolvedPrice: number;
  resolvedStock: number;
  error: string;
};

type SkuSuggestion = {
  code: string;
  name: string;
  brandName?: string | null;
  price: number;
  stock: number;
};

let lineIdCounter = 0;
function createEmptyLine(): BulkLineItem {
  lineIdCounter += 1;
  return {
    id: `line-${lineIdCounter}`,
    skuInput: '',
    qty: 1,
    resolved: false,
    resolvedName: '',
    resolvedPrice: 0,
    resolvedStock: 0,
    error: '',
  };
}

// SKU demo database for offline resolution
const DEMO_SKUS: Record<string, { name: string; price: number; stock: number }> = {
  'CASE-IP16P-BLK': { name: 'iPhone 16 Pro Silicone Case - Black', price: 3.5, stock: 500 },
  'CASE-IP16P-CLR': { name: 'iPhone 16 Pro Crystal Clear Case', price: 2.8, stock: 800 },
  'CASE-IP16-BLU': { name: 'iPhone 16 Silicone Case - Blue', price: 3.2, stock: 600 },
  'CASE-S24U-BLK': { name: 'Samsung Galaxy S24 Ultra Case - Black', price: 3.8, stock: 400 },
  'CABLE-TC-1M': { name: 'Type-C Fast Charging Cable 1m', price: 1.2, stock: 2000 },
  'CABLE-TC-2M': { name: 'Type-C Fast Charging Cable 2m', price: 1.8, stock: 1200 },
  'CABLE-LTN-1M': { name: 'Lightning Cable 1m MFi', price: 2.0, stock: 1500 },
  'CABLE-LTN-2M': { name: 'Lightning Cable 2m MFi', price: 2.8, stock: 800 },
  'GLASS-IP16PM': { name: 'Tempered Glass iPhone 16 Pro Max', price: 0.85, stock: 3000 },
  'GLASS-IP16P': { name: 'Tempered Glass iPhone 16 Pro', price: 0.8, stock: 2500 },
  'GLASS-IP16': { name: 'Tempered Glass iPhone 16', price: 0.75, stock: 2800 },
  'GLASS-S24U': { name: 'Tempered Glass Samsung S24 Ultra', price: 0.9, stock: 1800 },
  'CHG-20W-USB': { name: '20W USB-C PD Charger', price: 4.5, stock: 600 },
  'CHG-65W-GAN': { name: '65W GaN USB-C Charger', price: 8.9, stock: 300 },
  'CHG-140W-GAN': { name: '140W GaN USB-C Charger', price: 14.5, stock: 150 },
  'EARB-BT-BLK': { name: 'Wireless Earbuds Bluetooth - Black', price: 6.5, stock: 400 },
  'EARB-BT-WHT': { name: 'Wireless Earbuds Bluetooth - White', price: 6.5, stock: 350 },
  'STAND-MAG': { name: 'MagSafe Car Phone Mount', price: 5.2, stock: 350 },
  'PB-10K-BLK': { name: 'Power Bank 10000mAh - Black', price: 7.8, stock: 500 },
  'PB-20K-BLK': { name: 'Power Bank 20000mAh - Black', price: 11.5, stock: 300 },
};

// 2026-03-17T03:31:00 - Fuzzy match: search both SKU code and product name
function fuzzyMatch(query: string): SkuSuggestion[] {
  if (!query || query.length < 1) return [];
  const q = query.toLowerCase();
  const results: Array<SkuSuggestion & { score: number }> = [];

  for (const [code, info] of Object.entries(DEMO_SKUS)) {
    const codeLower = code.toLowerCase();
    const nameLower = info.name.toLowerCase();

    let score = 0;
    if (codeLower === q) {
      score = 100;
    } else if (codeLower.startsWith(q)) {
      score = 80;
    } else if (codeLower.includes(q)) {
      score = 60;
    } else if (nameLower.includes(q)) {
      score = 40;
    } else {
      const words = q.split(/[\s\-]+/);
      const allMatch = words.every(
        (w) => codeLower.includes(w) || nameLower.includes(w)
      );
      if (allMatch) score = 30;
    }

    if (score > 0) {
      results.push({ code, name: info.name, price: info.price, stock: info.stock, score });
    }
  }

  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map(({ score, ...rest }) => rest);
}

// 2026-03-17T03:35:00 - Highlight matched substring in suggestion text
function highlightText(text: string, query: string) {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <span className="font-semibold text-primary underline decoration-primary/30">
        {text.slice(idx, idx + query.length)}
      </span>
      {text.slice(idx + query.length)}
    </>
  );
}

function BulkOrderContent() {
  const { isAuthenticated } = useAuthStore();
  const [lines, setLines] = useState<BulkLineItem[]>(() =>
    Array.from({ length: 5 }, () => createEmptyLine())
  );
  const [submitting, setSubmitting] = useState(false);
  const [showKeyboard, setShowKeyboard] = useState(true);
  const skuInputRefs = useRef<Map<string, HTMLInputElement>>(new Map());
  const qtyInputRefs = useRef<Map<string, HTMLInputElement>>(new Map());

  // 2026-03-17T03:32:00 - Autocomplete state per line
  const [activeSuggestionLine, setActiveSuggestionLine] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<SkuSuggestion[]>([]);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const suggestionsRef = useRef<HTMLDivElement | null>(null);
  const suggestionRequestIdRef = useRef(0);
  const suggestionTimerRef = useRef<number | null>(null);

  const loadSuggestions = useCallback(async (lineId: string, keyword: string) => {
    const q = keyword.trim();
    if (!q) {
      setSuggestions([]);
      setActiveSuggestionLine(null);
      setHighlightIndex(-1);
      return;
    }
    const requestId = ++suggestionRequestIdRef.current;
    try {
      // Updated: 2026-03-19T12:20:40 - 批量下单联动后端模糊检索，支持 SKU/品名/品牌/条码
      const { data } = await api.get('/products/search/suggestions', {
        params: { q, limit: 8 },
      });
      if (requestId !== suggestionRequestIdRef.current) return;
      const remote = Array.isArray(data) ? (data as SkuSuggestion[]) : [];
      if (remote.length > 0) {
        setSuggestions(remote);
        setActiveSuggestionLine(lineId);
        setHighlightIndex(-1);
        return;
      }
    } catch {
      // ignore and fallback to local demo suggestions
    }
    const local = fuzzyMatch(q);
    if (requestId !== suggestionRequestIdRef.current) return;
    setSuggestions(local);
    setActiveSuggestionLine(lineId);
    setHighlightIndex(-1);
  }, []);

  useEffect(() => {
    return () => {
      if (suggestionTimerRef.current) {
        window.clearTimeout(suggestionTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    // Updated: 2026-03-19T12:22:20 - 点击下拉外部时收起建议列表
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (suggestionsRef.current && target && !suggestionsRef.current.contains(target)) {
        setActiveSuggestionLine(null);
        setSuggestions([]);
        setHighlightIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const selectSuggestion = useCallback((lineId: string, suggestion: SkuSuggestion) => {
    setLines((prev) =>
      prev.map((line) =>
        line.id === lineId
          ? {
              ...line,
              skuInput: suggestion.code,
              resolved: true,
              resolvedName: suggestion.name,
              resolvedPrice: suggestion.price,
              resolvedStock: suggestion.stock,
              error: '',
            }
          : line
      )
    );
    setActiveSuggestionLine(null);
    setSuggestions([]);
    setHighlightIndex(-1);
    setTimeout(() => {
      qtyInputRefs.current.get(lineId)?.focus();
      qtyInputRefs.current.get(lineId)?.select();
    }, 50);
  }, []);

  const resolveSku = useCallback(async (lineId: string, sku: string) => {
    if (!sku.trim()) return;
    const keyword = sku.trim();
    const upperSku = keyword.toUpperCase();

    try {
      const { data } = await api.get(`/products/sku/${encodeURIComponent(keyword)}`);
      if (data) {
        setLines((prev) =>
          prev.map((line) =>
            line.id === lineId
              ? {
                  ...line,
                  skuInput: data.code || upperSku,
                  resolved: true,
                  resolvedName: data.name,
                  resolvedPrice: Number(data.wholesalePrice),
                  resolvedStock: data.stock ?? 999,
                  error: '',
                }
              : line
          )
        );
        return;
      }
    } catch {
      // Fallback to demo database
    }

    const demo = DEMO_SKUS[upperSku];
    if (demo) {
      setLines((prev) =>
        prev.map((line) =>
          line.id === lineId
            ? {
                ...line,
                resolved: true,
                resolvedName: demo.name,
                resolvedPrice: demo.price,
                resolvedStock: demo.stock,
                error: '',
              }
            : line
        )
      );
    } else {
      setLines((prev) =>
        prev.map((line) =>
          line.id === lineId
            ? { ...line, resolved: false, error: 'SKU not found' }
            : line
        )
      );
    }
  }, []);

  const updateLine = (lineId: string, field: 'skuInput' | 'qty', value: string | number) => {
    setLines((prev) =>
      prev.map((line) =>
        line.id === lineId
          ? {
              ...line,
              [field]: value,
              ...(field === 'skuInput' ? { resolved: false, error: '' } : {}),
            }
          : line
      )
    );

    // 2026-03-17T03:33:00 - Trigger fuzzy suggestions on SKU input change
    if (field === 'skuInput') {
      const q = String(value).trim();
      if (suggestionTimerRef.current) {
        window.clearTimeout(suggestionTimerRef.current);
      }
      if (q.length >= 1) {
        suggestionTimerRef.current = window.setTimeout(() => {
          loadSuggestions(lineId, q);
        }, 200);
      } else {
        setSuggestions([]);
        setActiveSuggestionLine(null);
      }
    }
  };

  const handleSkuKeyDown = (lineId: string, e: React.KeyboardEvent<HTMLInputElement>) => {
    // 2026-03-17T03:34:00 - Keyboard nav for autocomplete dropdown
    if (activeSuggestionLine === lineId && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightIndex((prev) =>
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        return;
      }
      if (e.key === 'Enter' && highlightIndex >= 0) {
        e.preventDefault();
        selectSuggestion(lineId, suggestions[highlightIndex]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setActiveSuggestionLine(null);
        setSuggestions([]);
        return;
      }
    }

    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      setActiveSuggestionLine(null);
      setSuggestions([]);
      const skuValue = (e.target as HTMLInputElement).value;
      if (skuValue.trim()) {
        resolveSku(lineId, skuValue);
        setTimeout(() => {
          qtyInputRefs.current.get(lineId)?.focus();
          qtyInputRefs.current.get(lineId)?.select();
        }, 50);
      }
    }
  };

  const handleQtyKeyDown = (lineId: string, e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const nextIndex = index + 1;
      if (nextIndex >= lines.length) {
        const newLine = createEmptyLine();
        setLines((prev) => [...prev, newLine]);
        setTimeout(() => {
          skuInputRefs.current.get(newLine.id)?.focus();
        }, 50);
      } else {
        skuInputRefs.current.get(lines[nextIndex].id)?.focus();
      }
    }
  };

  const removeLine = (lineId: string) => {
    setLines((prev) => {
      const filtered = prev.filter((l) => l.id !== lineId);
      return filtered.length === 0 ? [createEmptyLine()] : filtered;
    });
  };

  const addLines = (count: number) => {
    setLines((prev) => [
      ...prev,
      ...Array.from({ length: count }, () => createEmptyLine()),
    ]);
  };

  const clearAll = () => {
    lineIdCounter = 0;
    setLines(Array.from({ length: 5 }, () => createEmptyLine()));
  };

  const resolvedLines = lines.filter((l) => l.resolved);
  const totalAmount = resolvedLines.reduce(
    (sum, l) => sum + l.resolvedPrice * l.qty,
    0
  );
  const totalUnits = resolvedLines.reduce((sum, l) => sum + l.qty, 0);

  const handleSubmit = async () => {
    if (resolvedLines.length === 0) return;
    setSubmitting(true);
    try {
      for (const line of resolvedLines) {
        await api.post('/cart/items', {
          skuCode: line.skuInput.toUpperCase(),
          qty: line.qty,
        });
      }
      toast.success(`${resolvedLines.length} items added to cart`);
      window.location.href = '/cart';
    } catch {
      toast.error('Failed to submit bulk order');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/"
          className="mb-3 flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <Grid3X3 className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                Bulk Order
              </h1>
              <p className="text-sm text-muted-foreground">
                Type SKU or product name to fuzzy search — select from suggestions or enter exact code
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={clearAll} className="gap-1">
              <X className="h-3.5 w-3.5" />
              Clear
            </Button>
          </div>
        </div>
      </div>

      {/* Keyboard hints */}
      {showKeyboard && (
        <div className="mb-4 flex items-start gap-3 rounded-lg border border-blue-100 bg-blue-50/50 p-4">
          <Keyboard className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-500" />
          <div className="flex-1">
            <p className="text-sm font-medium text-blue-900">Keyboard Shortcuts</p>
            <div className="mt-1 flex flex-wrap gap-x-6 gap-y-1 text-xs text-blue-700">
              <span>Type to fuzzy search SKU or product name</span>
              <span><kbd className="rounded bg-white px-1.5 py-0.5 font-mono text-xs shadow-sm">↑↓</kbd> navigate suggestions</span>
              <span><kbd className="rounded bg-white px-1.5 py-0.5 font-mono text-xs shadow-sm">Enter</kbd> select / resolve & jump to Qty</span>
              <span><kbd className="rounded bg-white px-1.5 py-0.5 font-mono text-xs shadow-sm">Esc</kbd> dismiss suggestions</span>
              <span><kbd className="rounded bg-white px-1.5 py-0.5 font-mono text-xs shadow-sm">Enter</kbd> in Qty → next row</span>
            </div>
          </div>
          <button
            onClick={() => setShowKeyboard(false)}
            className="text-blue-400 transition-colors hover:text-blue-600"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Bulk table */}
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-0">
              {/* Table header */}
              <div className="grid grid-cols-[2rem_1fr_6rem_8rem_2rem] items-center gap-2 border-b border-border bg-muted/50 px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <span>#</span>
                <span>SKU / Barcode</span>
                <span className="text-center">Qty</span>
                <span className="text-right">Subtotal</span>
                <span />
              </div>

              {/* Rows */}
              <div className="divide-y divide-border">
                {lines.map((line, index) => (
                  <div
                    key={line.id}
                    className="grid grid-cols-[2rem_1fr_6rem_8rem_2rem] items-center gap-2 px-4 py-2"
                  >
                    <span className="text-xs text-muted-foreground">
                      {index + 1}
                    </span>

                    {/* SKU input with fuzzy autocomplete */}
                    <div className="relative">
                      <Input
                        ref={(el) => {
                          if (el) skuInputRefs.current.set(line.id, el);
                        }}
                        placeholder="Type SKU or product name..."
                        value={line.skuInput}
                        onChange={(e) =>
                          updateLine(line.id, 'skuInput', e.target.value)
                        }
                        onKeyDown={(e) => handleSkuKeyDown(line.id, e)}
                        onFocus={() => {
                          if (line.skuInput.trim().length >= 1 && !line.resolved) {
                            loadSuggestions(line.id, line.skuInput.trim());
                          }
                        }}
                        onBlur={() => {
                          setTimeout(() => {
                            if (activeSuggestionLine === line.id) {
                              setActiveSuggestionLine(null);
                              setSuggestions([]);
                            }
                            if (line.skuInput.trim() && !line.resolved) {
                              resolveSku(line.id, line.skuInput);
                            }
                          }, 200);
                        }}
                        autoComplete="off"
                        className={`h-9 text-sm ${
                          line.error
                            ? 'border-destructive'
                            : line.resolved
                              ? 'border-green-300'
                              : ''
                        }`}
                      />

                      {/* Autocomplete dropdown */}
                      {activeSuggestionLine === line.id && suggestions.length > 0 && !line.resolved && (
                        <div
                          ref={suggestionsRef}
                          className="absolute left-0 right-0 top-10 z-50 max-h-56 overflow-auto rounded-lg border border-border bg-card shadow-lg"
                          role="listbox"
                        >
                          {suggestions.map((s, idx) => {
                            const inputLower = line.skuInput.toLowerCase();
                            return (
                              <button
                                key={s.code}
                                type="button"
                                role="option"
                                aria-selected={idx === highlightIndex}
                                className={`flex w-full items-start gap-3 px-3 py-2 text-left transition-colors ${
                                  idx === highlightIndex
                                    ? 'bg-primary/10 text-foreground'
                                    : 'text-foreground hover:bg-accent'
                                }`}
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  selectSuggestion(line.id, s);
                                }}
                                onMouseEnter={() => setHighlightIndex(idx)}
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-xs font-semibold text-primary">
                                      {highlightText(s.code, inputLower)}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      €{s.price.toFixed(2)}
                                    </span>
                                  </div>
                                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                    {highlightText(s.name, inputLower)}
                                  </p>
                                  {s.brandName ? (
                                    <p className="mt-0.5 text-[10px] text-muted-foreground/80">
                                      Brand: {highlightText(s.brandName, inputLower)}
                                    </p>
                                  ) : null}
                                </div>
                                <span className="flex-shrink-0 text-[10px] text-muted-foreground">
                                  {s.stock} in stock
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {line.resolved && (
                        <div className="mt-0.5 flex items-center gap-1 text-xs text-green-600">
                          <CheckCircle2 className="h-3 w-3" />
                          {line.resolvedName} · €{line.resolvedPrice.toFixed(2)}
                        </div>
                      )}
                      {line.error && (
                        <div className="mt-0.5 flex items-center gap-1 text-xs text-destructive">
                          <AlertCircle className="h-3 w-3" />
                          {line.error}
                        </div>
                      )}
                    </div>

                    {/* Qty */}
                    <Input
                      ref={(el) => {
                        if (el) qtyInputRefs.current.set(line.id, el);
                      }}
                      type="number"
                      min={1}
                      value={line.qty}
                      onChange={(e) =>
                        updateLine(
                          line.id,
                          'qty',
                          Math.max(1, parseInt(e.target.value) || 1)
                        )
                      }
                      onKeyDown={(e) => handleQtyKeyDown(line.id, e, index)}
                      className="h-9 text-center text-sm"
                    />

                    {/* Subtotal */}
                    <div className="text-right text-sm font-medium text-foreground">
                      {line.resolved ? (
                        <span>
                          &euro;{(line.resolvedPrice * line.qty).toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </div>

                    {/* Remove */}
                    <button
                      onClick={() => removeLine(line.id)}
                      className="rounded p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      aria-label={`Remove line ${index + 1}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add rows */}
              <div className="flex items-center gap-2 border-t border-border px-4 py-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 text-xs"
                  onClick={() => addLines(1)}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Row
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 text-xs"
                  onClick={() => addLines(10)}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add 10 Rows
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Quick SKU reference */}
          <Card className="mt-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Popular SKU Codes (for demo)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(DEMO_SKUS).map(([code, info]) => (
                  <Badge
                    key={code}
                    variant="outline"
                    className="cursor-pointer font-mono text-xs transition-colors hover:bg-primary hover:text-primary-foreground"
                    onClick={() => {
                      const emptyLine = lines.find(
                        (l) => !l.skuInput.trim()
                      );
                      if (emptyLine) {
                        updateLine(emptyLine.id, 'skuInput', code);
                        resolveSku(emptyLine.id, code);
                      } else {
                        const newLine = createEmptyLine();
                        newLine.skuInput = code;
                        setLines((prev) => [...prev, newLine]);
                        setTimeout(() => resolveSku(newLine.id, code), 50);
                      }
                    }}
                  >
                    {code}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Summary */}
        <div className="lg:col-span-1">
          <Card className="sticky top-20">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Resolved items</span>
                  <span>
                    {resolvedLines.length} / {lines.filter((l) => l.skuInput.trim()).length}
                  </span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Total units</span>
                  <span>{totalUnits}</span>
                </div>
                {lines.some((l) => l.error) && (
                  <div className="flex justify-between text-destructive">
                    <span>Errors</span>
                    <span>{lines.filter((l) => l.error).length}</span>
                  </div>
                )}
              </div>
              <div className="border-t border-border pt-3">
                <div className="flex justify-between text-base font-semibold">
                  <span>Total</span>
                  <span className="text-primary">
                    &euro;{totalAmount.toFixed(2)}
                  </span>
                </div>
              </div>
              <Button
                size="lg"
                className="w-full gap-2"
                onClick={handleSubmit}
                disabled={resolvedLines.length === 0 || submitting}
              >
                {submitting ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                ) : (
                  <>
                    <ShoppingCart className="h-5 w-5" />
                    Add All to Cart
                  </>
                )}
              </Button>
              {resolvedLines.length === 0 && (
                <p className="text-center text-xs text-muted-foreground">
                  Enter SKU codes and press Enter to resolve
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function BulkOrderPage() {
  return (
    <AuthGuard>
      <BulkOrderContent />
    </AuthGuard>
  );
}
