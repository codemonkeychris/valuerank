/**
 * Authentication middleware
 *
 * Validates JWT tokens and populates req.user with decoded payload
 * Also handles API key authentication (to be added later)
 */

import type { Request, Response, NextFunction } from 'express';

import { createLogger, AuthenticationError } from '@valuerank/shared';

import { verifyToken, extractBearerToken } from './services.js';
import type { AuthUser, AuthMethod } from './types.js';

const log = createLogger('auth:middleware');

// Extend Express Request to include auth info
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user: AuthUser | null;
      authMethod: AuthMethod | null;
    }
  }
}

/**
 * Extract and validate JWT from Authorization header
 *
 * Sets req.user and req.authMethod on success
 * Sets both to null if no token provided (allows unauthenticated requests through)
 */
export function authMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  // Initialize auth state
  req.user = null;
  req.authMethod = null;

  // Get Authorization header
  const authHeader = req.headers.authorization;
  const token = extractBearerToken(authHeader);

  if (!token) {
    // No token - allow through as unauthenticated
    // Individual routes/resolvers can require auth if needed
    next();
    return;
  }

  try {
    // Verify JWT (includes 30-second clock skew tolerance)
    const payload = verifyToken(token);

    // Populate request with user info
    req.user = {
      id: payload.sub,
      email: payload.email,
    };
    req.authMethod = 'jwt';

    log.debug({ userId: req.user.id }, 'JWT authentication successful');
    next();
  } catch (err) {
    // Token is invalid - pass error to error handler
    if (err instanceof AuthenticationError) {
      next(err);
    } else {
      log.error({ err }, 'Unexpected error during JWT validation');
      next(new AuthenticationError('Invalid token'));
    }
  }
}

/**
 * Require authentication middleware
 *
 * Use after authMiddleware to require valid auth
 * Returns 401 if not authenticated
 */
export function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    next(new AuthenticationError('Authentication required'));
    return;
  }
  next();
}

/**
 * Check if request is a GraphQL introspection query
 *
 * Introspection queries should be allowed without auth
 */
export function isIntrospectionQuery(req: Request): boolean {
  const body = req.body as { query?: string } | undefined;

  if (!body?.query) {
    return false;
  }

  // Check for introspection query patterns
  const query = body.query;
  return (
    query.includes('__schema') ||
    query.includes('__type') ||
    query.includes('IntrospectionQuery')
  );
}

/**
 * GraphQL auth middleware
 *
 * Applies auth check to GraphQL requests, but allows:
 * - Introspection queries (for schema discovery)
 * - Requests with valid authentication
 */
export function graphqlAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Always allow introspection queries
  if (isIntrospectionQuery(req)) {
    next();
    return;
  }

  // Require authentication for all other GraphQL operations
  if (!req.user) {
    next(new AuthenticationError('Authentication required'));
    return;
  }

  next();
}
