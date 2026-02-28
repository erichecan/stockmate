// Updated: 2026-02-26T23:15:00
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from './strategies/jwt.strategy';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  /** 验证用户：tenantSlug 可选；不填时按邮箱查找，仅当唯一匹配时通过 */
  async validateUser(email: string, password: string, tenantSlug?: string) {
    let user: { id: string; email: string; tenantId: string; passwordHash: string; isActive: boolean; firstName: string | null; lastName: string | null; role: UserRole } | null = null;

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
        const tenants = activeUsers.map((u) => ({ slug: u.tenant!.slug, name: u.tenant!.name }));
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
    };
  }

  async login(user: { id: string; email: string; role: string; tenantId: string }) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      role: user.role,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload as unknown as Record<string, unknown>, {
        secret: this.configService.get<string>('jwt.accessSecret'),
        expiresIn: this.configService.get('jwt.accessExpiration', '15m') as `${number}${'s' | 'm' | 'h' | 'd'}`,
      }),
      this.jwtService.signAsync(payload as unknown as Record<string, unknown>, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
        expiresIn: this.configService.get('jwt.refreshExpiration', '7d') as `${number}${'s' | 'm' | 'h' | 'd'}`,
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
    return this.login({
      id: adminUser.id,
      email: adminUser.email,
      role: adminUser.role,
      tenantId: adminUser.tenantId,
    });
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
}
