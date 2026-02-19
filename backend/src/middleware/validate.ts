import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

/**
 * Targets that can be validated on the incoming request.
 */
type ValidationTarget = 'body' | 'query' | 'params';

interface ValidationSchemas {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

/**
 * Validation middleware factory.
 *
 * Accepts either a single Zod schema (applied to `req.body`) or an object
 * with `body`, `query`, and/or `params` schemas.
 *
 * @example
 *   // Validate body only
 *   router.post('/contacts', validate(createContactSchema), handler);
 *
 * @example
 *   // Validate body + query
 *   router.get('/contacts', validate({ query: listQuerySchema }), handler);
 */
export function validate(schemaOrSchemas: ZodSchema | ValidationSchemas) {
  // Normalise to the object form
  const schemas: ValidationSchemas =
    'body' in schemaOrSchemas || 'query' in schemaOrSchemas || 'params' in schemaOrSchemas
      ? (schemaOrSchemas as ValidationSchemas)
      : { body: schemaOrSchemas as ZodSchema };

  return (req: Request, res: Response, next: NextFunction): void => {
    const errors: Array<{ target: ValidationTarget; issues: ZodError['issues'] }> = [];

    for (const target of ['body', 'query', 'params'] as const) {
      const schema = schemas[target];
      if (!schema) continue;

      const result = schema.safeParse(req[target]);
      if (!result.success) {
        errors.push({ target, issues: result.error.issues });
      } else {
        // Replace the raw value with the parsed (coerced / defaulted) value
        (req as unknown as Record<string, unknown>)[target] = result.data;
      }
    }

    if (errors.length > 0) {
      const details = errors.flatMap(({ target, issues }) =>
        issues.map((issue) => ({
          target,
          path: issue.path.join('.'),
          message: issue.message,
          code: issue.code,
        })),
      );

      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details,
        },
      });
      return;
    }

    next();
  };
}
