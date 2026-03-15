/**
 * Mobigo 批发站导航类目导入脚本
 * 数据来源: https://www.mobigo.ie/ 左侧导航 (客户网站)
 * 用途: 将类目导入当前仓库管理系统，作为更真实的种子数据
 * 时间戳: 2026-03-14
 *
 * 使用: 确保后端 API 已启动，在 backend 目录执行
 *   npx tsx prisma/seed-mobigo-categories.ts
 */

import 'dotenv/config';
import * as path from 'path';
import * as fs from 'fs';

const API_BASE = process.env.SEED_API_BASE || 'http://localhost:3001/api';
let TOKEN = '';

async function api(method: string, pathUrl: string, body?: unknown) {
  const res = await fetch(`${API_BASE}${pathUrl}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${method} ${pathUrl} failed (${res.status}): ${text}`);
  }
  return res.json();
}

interface MobigoCategoryNode {
  name: string;
  nameEn?: string;
  code: string;
  sortOrder?: number;
  children?: MobigoCategoryNode[];
}

interface MobigoSeedData {
  source: string;
  description: string;
  categories: MobigoCategoryNode[];
}

async function main() {
  console.log('🌱 Mobigo 导航类目导入...\n');

  const dataPath = path.join(__dirname, 'seed-data', 'mobigo-categories.json');
  const raw = fs.readFileSync(dataPath, 'utf-8');
  const data: MobigoSeedData = JSON.parse(raw);

  // 登录
  console.log('🔑 登录...');
  const auth = await api('POST', '/auth/login', {
    email: process.env.SEED_EMAIL || 'admin@test.com',
    password: process.env.SEED_PASSWORD || 'Test1234!',
    tenantSlug: process.env.SEED_TENANT || 'test-company',
  });
  TOKEN = auth.accessToken;
  console.log(`   ✅ 已登录 ${auth.user?.email ?? 'OK'}\n`);

  const codeToId = new Map<string, string>();

  async function ensureCodeToIdFilled(): Promise<void> {
    const list = (await api('GET', '/categories?tree=true')) as Array<{
      id: string;
      code: string;
      children?: unknown[];
    }>;
    function walk(nodes: Array<{ id: string; code: string; children?: unknown[] }>): void {
      for (const n of nodes) {
        if (n.code && n.id) codeToId.set(n.code, n.id);
        if (Array.isArray(n.children) && n.children.length) walk(n.children as typeof nodes);
      }
    }
    walk(list);
  }

  async function createCategory(
    node: MobigoCategoryNode,
    parentId?: string,
    sortOrder = 0
  ): Promise<void> {
    const payload = {
      name: node.name,
      nameEn: node.nameEn ?? node.name,
      code: node.code,
      parentId: parentId ?? undefined,
      sortOrder: node.sortOrder ?? sortOrder,
    };

    // 2026-03-14T19:45:00 修复 strictNullChecks 下 created 可能为 null 的情况，仅在成功创建时写入 codeToId
    let created: { id: string } | null = null;
    try {
      created = await api('POST', '/categories', payload);
      if (created) {
        codeToId.set(node.code, created.id);
      }
      console.log(`   ✅ [${node.code}] ${node.name}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('already exists') || msg.includes('409')) {
        console.log(`   ⏭️  [${node.code}] 已存在，跳过`);
        await ensureCodeToIdFilled();
        if (!codeToId.has(node.code)) {
          console.warn(`   ⚠️ 未找到已存在类目 ${node.code} 的 id，子类目可能重复创建`);
        }
      } else {
        throw e;
      }
    }

    const selfId = created?.id ?? codeToId.get(node.code);
    if (node.children?.length && selfId) {
      for (let i = 0; i < node.children.length; i++) {
        await createCategory(node.children[i], selfId, i + 1);
      }
    }
  }

  // 先创建根级，再递归子级（递归内会拿到 created.id，需在 createCategory 内用 codeToId 取 parentId）
  console.log('📁 创建类目树...');
  for (let i = 0; i < data.categories.length; i++) {
    await createCategory(data.categories[i], undefined, i + 1);
  }

  console.log('\n🎉 Mobigo 类目导入完成');
  console.log(`   共处理 ${data.categories.length} 个一级类目及其子类目`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
