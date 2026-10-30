import { SetMetadata } from '@nestjs/common';
import { Role } from '@prisma/client';

export const ROLES_KEY = 'roles';

// Restringe un endpoint a uno o más roles (RBAC — RNF-05).
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
