import { SetMetadata } from '@nestjs/common';

/**
 * @decorator Roles
 * @description Specify which roles can access a route.
 *
 * Examples:
 *   @Roles('OWNER')              → Only shop owners
 *   @Roles('OWNER', 'STAFF')     → Both owners and staff
 */
export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
