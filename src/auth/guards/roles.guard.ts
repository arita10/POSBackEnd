import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * @class RolesGuard
 * @description Checks if the logged-in user has the required role.
 * Applied GLOBALLY after JwtAuthGuard.
 *
 * RULES:
 *   - OWNER: Can access ALL routes in their shop
 *   - STAFF: Can only access routes decorated with @Roles('OWNER', 'STAFF')
 *
 * If a route has no @Roles() decorator, ANY authenticated user can access it.
 *
 * TENANCY SAFETY:
 *   The shopId in the URL must match the shopId in the JWT token.
 *   This prevents Shop 1's staff from accessing Shop 2's data.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Skip roles check for public routes (no JWT required)
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    // Get the required roles for this route
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // If no @Roles() set, any authenticated user can access
    if (!requiredRoles || requiredRoles.length === 0) return true;

    // Check role
    if (!requiredRoles.includes(user?.role)) {
      throw new ForbiddenException(
        `Access denied. Required role: ${requiredRoles.join(' or ')}. Your role: ${user?.role}`,
      );
    }

    // TENANCY CHECK: shopId in URL must match shopId in JWT token
    // This prevents: staff of shop 1 calling /shops/2/products
    const urlShopId = parseInt(request.params?.shopId);
    if (urlShopId && user?.shopId !== urlShopId) {
      throw new ForbiddenException(
        'Access denied. You can only access your own shop data.',
      );
    }

    return true;
  }
}
