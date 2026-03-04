import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';

/**
 * @class AuthService
 * @description Handles user login and JWT token generation.
 *
 * FLOW:
 *   1. Frontend sends: { shopId, username, password }
 *   2. We find the user in DB (must match BOTH shopId AND username)
 *   3. We compare the plain password against the bcrypt hash in DB
 *   4. If valid, we return a JWT token + user info
 *   5. Frontend stores the token and sends it in future requests
 *
 * TENANCY: Login is scoped to a shop — "ali" from Shop 1 cannot
 * log in as Shop 2's "ali" even if they have the same username.
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * @function login
   * @description Validates credentials and returns a JWT token.
   * @param {LoginDto} dto - { shopId, username, password }
   * @returns JWT token + user info (id, shopId, role, username)
   * @throws {UnauthorizedException} If credentials are invalid.
   */
  async login(dto: LoginDto) {
    // Find user — must belong to the correct shop (tenancy check)
    const user = await this.prisma.user.findFirst({
      where: {
        shopId: Number(dto.shopId),
        username: dto.username,
      },
      include: {
        permission: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid username or password');
    }

    // Compare plain-text password against bcrypt hash
    const passwordValid = await bcrypt.compare(dto.password, user.password);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid username or password');
    }

    // Build the JWT payload — this is what gets decoded from the token later
    const payload = {
      sub: user.id,         // standard JWT "subject" = userId
      shopId: user.shopId,
      role: user.role,
      username: user.username,
    };

    const token = await this.jwtService.signAsync(payload);

    return {
      accessToken: token,
      user: {
        id: user.id,
        shopId: user.shopId,
        username: user.username,
        role: user.role,
        permission: user.permission,
      },
    };
  }
}
