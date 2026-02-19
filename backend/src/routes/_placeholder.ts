import { Router, Request, Response } from 'express';

/**
 * Creates a temporary placeholder router for a route group.
 * Returns 501 Not Implemented for every request, signalling that the
 * full route handlers have not been wired up yet.
 *
 * Replace each usage in src/index.ts with the real router module once
 * the route file is written.
 */
export function createPlaceholderRouter(name: string): Router {
  const router = Router();

  router.all('*', (_req: Request, res: Response) => {
    res.status(501).json({
      success: false,
      error: {
        code: 'NOT_IMPLEMENTED',
        message: `The /${name} route group is not yet implemented`,
      },
    });
  });

  // Also handle root path of the group
  router.all('/', (_req: Request, res: Response) => {
    res.status(501).json({
      success: false,
      error: {
        code: 'NOT_IMPLEMENTED',
        message: `The /${name} route group is not yet implemented`,
      },
    });
  });

  return router;
}
