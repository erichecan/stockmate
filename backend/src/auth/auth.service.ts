// Updated: 2026-03-14T18:10:00 - 批发站 P0: 支持批发站登录/注册与 customer 绑定
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { CustomerTier, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from './strategies/jwt.strategy';
import { CustomersService } from '../customers/customers.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private customersService: CustomersService,
  ) {}

  private mapLoginUserInput(user: {
    id: string;
    email: string;
    role: UserRole;
    tenantId: string;
    customerId?: string | null;
    customerTier?: CustomerTier | null;
    audience?: 'BACKOFFICE' | 'WHOLESALE';
  }) {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      customerId: user.customerId ?? undefined,
      customerTier: user.customerTier ?? undefined,
      audience:
        user.audience ??
        (user.customerId ? ('WHOLESALE' as const) : ('BACKOFFICE' as const)),
    };
  }

  /** 验证用户：tenantSlug 可选；不填时按邮箱查找，仅当唯一匹配时通过 */
  async validateUser(email: string, password: string, tenantSlug?: string) {
    let user: {
      id: string;
      email: string;
      tenantId: string;
      passwordHash: string;
      isActive: boolean;
      firstName: string | null;
      lastName: string | null;
      role: UserRole;
    } | null = null;

    if (tenantSlug?.trim()) {
      const tenant = await this.prisma.tenant.findUnique({
        where: { slug: tenantSlug.trim() },
      });
      if (!tenant || tenant.status !== 'ACTIVE') {
        throw new UnauthorizedException('Tenant not found or inactive');
      }
      user = await this.prisma.user.findUnique({
        where: { email_tenantId: { email, tenantId: tenant.id } },
      });
    } else {
      const users = await this.prisma.user.findMany({
        where: { email, isActive: true },
        include: { tenant: true },
      });
      const activeUsers = users.filter((u) => u.tenant?.status === 'ACTIVE');
      if (activeUsers.length === 0) {
        throw new UnauthorizedException('Invalid credentials');
      }
      if (activeUsers.length > 1) {
        const tenants = activeUsers.map((u) => ({
          slug: u.tenant.slug,
          name: u.tenant.name,
        }));
        throw new UnauthorizedException(
          JSON.stringify({ code: 'MULTIPLE_TENANTS', tenants }),
        );
      }
      user = activeUsers[0];
    }

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      firstName: user.firstName,
      lastName: user.lastName,
      customerId: (user as any).customerId ?? null,
    };
  }

  async login(user: {
    id: string;
    email: string;
    role: string;
    tenantId: string;
    customerId?: string;
    customerTier?: CustomerTier;
    audience?: 'BACKOFFICE' | 'WHOLESALE';
  }) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      role: user.role,
      customerId: user.customerId,
      customerTier: user.customerTier,
      audience:
        user.audience ??
        (user.customerId ? ('WHOLESALE' as const) : ('BACKOFFICE' as const)),
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload as unknown as Record<string, unknown>, {
        secret: this.configService.get<string>('jwt.accessSecret'),
        expiresIn: this.configService.get('jwt.accessExpiration', '15m'),
      }),
      this.jwtService.signAsync(payload as unknown as Record<string, unknown>, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
        expiresIn: this.configService.get('jwt.refreshExpiration', '7d'),
      }),
    ]);

    await this.updateRefreshToken(user.id, refreshToken);

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: user.tenantId },
      select: { slug: true },
    });
    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
        tenantSlug: tenant?.slug,
        customerId: user.customerId,
        customerTier: user.customerTier,
        audience: payload.audience,
      },
    };
  }

  async refreshTokens(userId: string, refreshToken: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user || !user.refreshToken) {
      throw new ForbiddenException('Access denied');
    }

    const isTokenValid = await bcrypt.compare(refreshToken, user.refreshToken);
    if (!isTokenValid) {
      throw new ForbiddenException('Access denied');
    }

    return this.login({
      id: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      customerId: user.customerId ?? undefined,
    });
  }

  async register(dto: RegisterDto) {
    const existingTenant = await this.prisma.tenant.findUnique({
      where: { slug: dto.tenantSlug },
    });
    if (existingTenant) {
      throw new ConflictException('Tenant slug already exists');
    }

    const hashedPassword = await this.hashPassword(dto.password);
    const dbName = `stockflow_${dto.tenantSlug.replace(/-/g, '_')}`;

    const tenant = await this.prisma.tenant.create({
      data: {
        name: dto.tenantName,
        slug: dto.tenantSlug,
        dbName,
        email: dto.email,
        users: {
          create: {
            email: dto.email,
            passwordHash: hashedPassword,
            firstName: dto.firstName,
            lastName: dto.lastName,
            role: UserRole.ADMIN,
          },
        },
      },
      include: { users: true },
    });

    const adminUser = tenant.users[0];
    return this.login(
      this.mapLoginUserInput({
        id: adminUser.id,
        email: adminUser.email,
        role: adminUser.role,
        tenantId: adminUser.tenantId,
      }),
    );
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }

  async updateRefreshToken(userId: string, refreshToken: string) {
    const hashedToken = await bcrypt.hash(refreshToken, 12);
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: hashedToken },
    });
  }

  async logout(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        tenantId: true,
        createdAt: true,
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
            plan: true,
            status: true,
          },
        },
      },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  // Updated: 2026-03-14T18:10:00 - 批发站 P0: 批发站登录
  async wholesaleLogin(dto: LoginDto) {
    const user = await this.validateUser(
      dto.email,
      dto.password,
      dto.tenantSlug?.trim(),
    );

    // 2026-03-15 若无绑定客户则先按邮箱查找；若仍无则自动创建默认客户，便于测试账号 admin@test.com 登录批发站
    let customerId: string | undefined = (user as any).customerId ?? undefined;
    if (!customerId) {
      let guessed = await this.prisma.customer.findFirst({
        where: {
          email: user.email,
          tenantId: user.tenantId,
          isActive: true,
        },
      });
      if (!guessed) {
        const baseCode = `WH-${user.id.slice(0, 8).toUpperCase()}`;
        const finalCode = `${baseCode}-${Date.now().toString(36).slice(-6)}`;
        const displayName =
          (user as any).firstName || (user as any).lastName
            ? `${((user as any).firstName ?? '').trim()} ${((user as any).lastName ?? '').trim()}`.trim()
            : '批发客户';
        try {
          guessed = await this.prisma.customer.create({
            data: {
              name: displayName || '批发客户',
              code: finalCode,
              email: user.email,
              tenantId: user.tenantId,
              isActive: true,
            },
          });
        } catch (e) {
          this.logger.warn(
            `wholesaleLogin: create customer failed for ${user.email}: ${e instanceof Error ? e.message : String(e)}`,
          );
          if (e instanceof Error && e.stack) this.logger.debug(e.stack);
          throw new ForbiddenException(
            '无法创建批发客户记录，请稍后重试或联系管理员',
          );
        }
      }
      customerId = guessed.id;
      await this.prisma.user.update({
        where: { id: user.id },
        data: { customerId },
      });
    }

    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId: user.tenantId, isActive: true },
    });
    if (!customer) {
      throw new ForbiddenException('Customer not found or inactive');
    }

    return this.login({
      id: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      customerId: customer.id,
      customerTier: customer.tier,
      audience: 'WHOLESALE',
    });
  }
}
