import { Request, Response } from 'express';

export const healthCheck = async (req: Request, res: Response) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    pid: process.pid,
    instance: process.env.INSTANCE_ID || 'unknown'
  };

  res.status(200).json(health);
};