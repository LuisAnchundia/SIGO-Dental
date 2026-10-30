import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { authenticator } from 'otplib';
import * as QRCode from 'qrcode';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // RNF-05: MFA obligatorio cuando está activo para el usuario.
    if (user.mfaEnabled) {
      if (!dto.otp) {
        throw new UnauthorizedException('MFA_REQUIRED');
      }
      const valid = authenticator.verify({
        token: dto.otp,
        secret: user.mfaSecret ?? '',
      });
      if (!valid) {
        throw new UnauthorizedException('Código MFA inválido');
      }
    }

    const token = await this.jwt.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      accessToken: token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        mfaEnabled: user.mfaEnabled,
      },
    };
  }

  // Genera un secreto TOTP y el QR para configurar el autenticador.
  async setupMfa(userId: string, email: string) {
    const secret = authenticator.generateSecret();
    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaSecret: secret, mfaEnabled: false },
    });
    const otpauth = authenticator.keyuri(email, 'SIGO-Dental', secret);
    const qr = await QRCode.toDataURL(otpauth);
    return { otpauth, qr };
  }

  // Verifica el primer código y activa el MFA.
  async verifyMfa(userId: string, code: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.mfaSecret) {
      throw new BadRequestException('Primero configure el MFA');
    }
    const valid = authenticator.verify({ token: code, secret: user.mfaSecret });
    if (!valid) throw new BadRequestException('Código inválido');
    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaEnabled: true },
    });
    return { mfaEnabled: true };
  }

  async disableMfa(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaEnabled: false, mfaSecret: null },
    });
    return { mfaEnabled: false };
  }
}
