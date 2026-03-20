// Updated: 2026-03-20T15:48:00 - Demo 角色账号（已去掉与老板重复的经理/OPERATIONS demo）
// Updated: 2026-03-20T16:45:00 - RETAIL_BUYER、CATALOG_ADMIN 演示账号
import 'dotenv/config';
import { UserRole } from '@prisma/client';

const API_BASE = process.env.SEED_API_BASE || 'http://localhost:3001/api';
const DEMO_PASSWORD = process.env.DEMO_USERS_PASSWORD || 'Demo1234!';
const DEMO_TENANT_SLUG = process.env.DEMO_TENANT_SLUG || 'test-company';
const ADMIN_EMAIL = process.env.SEED_EMAIL || 'admin@test.com';
const ADMIN_PASSWORD = process.env.SEED_PASSWORD || 'Test1234!';

let token = '';

async function api(method: string, path: string, body?: unknown) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
  // Updated: 2026-03-19T15:37:42 - 先登录管理员，再调用用户管理接口创建角色账号
  const auth = await api('POST', '/auth/login', {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    tenantSlug: DEMO_TENANT_SLUG,
  });
  token = auth.accessToken as string;

  const users: Array<{
    email: string;
    firstName: string;
    role: UserRole;
  }> = [
    { email: 'boss.demo@test.com', firstName: 'Boss', role: UserRole.ADMIN },
    { email: 'warehouse.supervisor.demo@test.com', firstName: 'Warehouse Supervisor', role: UserRole.WAREHOUSE },
    { email: 'wholesale.supervisor.demo@test.com', firstName: 'Wholesale Supervisor', role: UserRole.SALES_SUPERVISOR },
    { email: 'order.processor.demo@test.com', firstName: 'Order Processor', role: UserRole.SALES },
    { email: 'returns.specialist.demo@test.com', firstName: 'Returns Specialist', role: UserRole.RETURN_SPECIALIST },
    { email: 'picker.demo@test.com', firstName: 'Picker', role: UserRole.PICKER },
    {
      email: 'retail.buyer.demo@test.com',
      firstName: 'Retail Buyer',
      role: UserRole.RETAIL_BUYER,
    },
    {
      email: 'catalog.admin.demo@test.com',
      firstName: 'Catalog Admin',
      role: UserRole.CATALOG_ADMIN,
    },
  ];

  for (const u of users) {
    try {
      await api('POST', '/users', {
        email: u.email,
        password: DEMO_PASSWORD,
        firstName: u.firstName,
        lastName: 'Demo',
        role: u.role,
      });
      console.log(`created user: ${u.email} -> ${u.role}`);
    } catch (error) {
      const text = String(error);
      if (text.includes('already exists') || text.includes('409')) {
        console.log(`skip existing user: ${u.email}`);
        continue;
      }
      throw error;
    }
  }

  console.log(`done. demo password: ${DEMO_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
