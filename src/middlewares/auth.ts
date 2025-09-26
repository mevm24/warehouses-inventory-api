import { Request, Response, NextFunction } from 'express';
export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  // Simple stub: expect Authorization: Bearer <token>
  const auth = req.headers?.authorization;
  if (!auth) return res.status(401).json({ error: 'Missing Authorization header (use any token for dev)' });
  // In prod, validate JWT and scopes here.
  next();
}