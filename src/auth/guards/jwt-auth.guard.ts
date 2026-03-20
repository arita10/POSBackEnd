import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * @class JwtAuthGuard
 * @description Applied GLOBALLY — checks every incoming request for a valid JWT token.
 *
 * HOW IT WORKS:
 *   1. Read the Authorization header: "Bearer eyJhbGci..."
 *   2. Verify the token using JWT_SECRET
 *   3. Attach the decoded payload to request.user
 *   4. If token is missing/invalid → 401 Unauthorized
 *
 * EXCEPTIONS (Public routes — no token required):
 *   - POST /auth/login
 *   - POST /admin/shops  (protected by x-admin-key instead)
 *   - GET  /admin/shops
 *   These are marked with @Public() decorator.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // Always allow CORS preflight requests through
    if (request.method === 'OPTIONS') return true;

    // Check if this route is marked @Public() — skip token check
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('No token provided. Please login first.');
    }

    try {
      // Verify and decode the token
      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET ?? 'fallback-secret',
      });

      // Attach user info to request so controllers can read it
      // e.g. request.user.shopId, request.user.role
      request.user = payload;
    } catch {
      throw new UnauthorizedException('Invalid or expired token. Please login again.');
    }

    return true;
  }

  private extractToken(request: any): string | null {
    const authHeader = request.headers?.authorization;
    if (!authHeader) return null;

    const [type, token] = authHeader.split(' ');
    return type === 'Bearer' ? token : null;
  }
}
