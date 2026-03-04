import { Request, Response } from 'express';
import { pool, isDatabaseConnected } from './db.js';

export const healthCheck = async (req: Request, res: Response) => {
  let dbOk = false;
  try {
    if (isDatabaseConnected()) {
      await pool.query('SELECT 1');
      dbOk = true;
    }
  } catch (_) { /* DB unreachable */ }

  const status = dbOk ? 'healthy' : 'degraded';
  const code = dbOk ? 200 : 503;

  res.status(code).json({
    status,
    timestamp: new Date().toISOString(),
  });
};