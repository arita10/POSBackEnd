import { SetMetadata } from '@nestjs/common';

/**
 * @decorator Public
 * @description Mark a route as public — skips JWT token check.
 *
 * Use on routes that don't require login:
 *   @Public()
 *   @Post('login')
 *   login() { ... }
 */
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
