// 打印方案：按单据类型取模板、替换占位符、调起浏览器打印
// Updated: 2026-03-14
import type { AxiosInstance } from 'axios';

export type PrintDocumentType = 'OUTBOUND_SHEET' | 'INBOUND_SHEET' | 'PICK_LIST';

interface PrintSolutionRow {
  id: string;
  documentType: string;
  name: string;
  templateBody: string;
  isDefault?: boolean;
  sortOrder?: number;
}

/**
 * 根据单据类型获取打印方案模板，替换占位符后在新窗口中打印
 * @param api - axios 实例（带鉴权）
 * @param documentType - 出库单 / 入库单 / 拣货单
 * @param data - 占位符键值，如 { orderNumber, customerName, items, totalQty }
 * @returns 无模板时 resolve(false)，成功打印 resolve(true)
 */
export async function printWithTemplate(
  api: AxiosInstance,
  documentType: PrintDocumentType,
  data: Record<string, string>,
): Promise<boolean> {
  try {
    const { data: solutions } = await api.get<PrintSolutionRow[]>(
      `/print-solutions/by-type/${documentType}`,
    );
    const list = Array.isArray(solutions) ? solutions : [];
    const template = list.find((s) => s.isDefault) ?? list[0];
    if (!template?.templateBody) {
      return false;
    }
    let html = template.templateBody;
    for (const [key, value] of Object.entries(data)) {
      html = html.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value ?? '');
    }
    const win = window.open('', '_blank');
    if (!win) {
      return false;
    }
    win.document.write(html);
    win.document.close();
    win.focus();
    win.onafterprint = () => win.close();
    setTimeout(() => win.print(), 100);
    return true;
  } catch {
    return false;
  }
}
