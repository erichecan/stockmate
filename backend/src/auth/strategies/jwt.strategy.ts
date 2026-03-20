// Updated: 2026-03-14T18:05:00 - 批发站 P0: JWT 载荷增加 customer 信息与 audience
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface JwtPayload {
  sub: string;
  email: string;
  tenantId: string;
  role: string;
  customerId?: string;
  customerTier?: string;
  audience?: 'BACKOFFICE' | 'WHOLESALE';
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.accessSecret')!,
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { tenant: true, customer: true },
    });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      firstName: user.firstName,
      lastName: user.lastName,
      tenant: user.tenant,
      customerId: user.customer?.id ?? payload.customerId,
      customerTier: user.customer?.tier ?? payload.customerTier,
      // 2026-03-19T12:00:00 - 与 AuthService.resolveJwtAudience 一致：仅 VIEWER+B2B 客户为 WHOLESALE，避免后台员工带 customerId 被误判
      // 2026-03-20T16:35:00 - RETAIL_BUYER 同 VIEWER
      audience:
        payload.audience ??
        ((user.role === UserRole.VIEWER || user.role === UserRole.RETAIL_BUYER) &&
        user.customerId
          ? ('WHOLESALE' as const)
          : ('BACKOFFICE' as const)),
    };
  }
}
