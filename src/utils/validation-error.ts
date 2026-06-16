import { ZodError } from 'zod';

export interface ValidationIssue {
  path: string;
  message: string;
  code: string;
}

export function formatValidationError(error: unknown): unknown {
  if (error instanceof ZodError) {
    return error.issues.map((issue) => ({
      path: issue.path.join('.') || '(root)',
      message: issue.message,
      code: issue.code
    }));
  }

  return error;
}
