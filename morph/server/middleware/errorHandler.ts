import type { NextFunction, Request, Response } from 'express';
// Returns friendly messages only; raw errors stay in server logs.
export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  const timeout = err?.name === 'TimeoutError';
  console.error(err?.message);
  res.status(timeout ? 504 : err?.status || 500).json({ error: timeout ? 'The AI took too long to respond.' : "Sorry, I couldn't connect to Morph AI. Please try again." });
}
