import { Request, Response } from 'express';
import { db, pool } from "./db"; // Your existing PostgreSQL connection
import { v4 as uuidv4 } from 'uuid';

export const startFlowWebhook = async (req: Request, res: Response) => {
  const { flowName, uniqueId, data } = req.body;

  if (!flowName || !uniqueId || !data) {
    return res.status(400).json({ error: 'flowName, uniqueId, and data are required.' });
  }

  try {
    const flowId = uuidv4();
    const currentTime = new Date().toISOString();

    // 1. Get first rule for this system/flowName with no currentTask/status (start point)
    const ruleRes = await pool.query(`
      SELECT * FROM "FlowRule"
      WHERE "system" = $1 AND ("currentTask" IS NULL OR "currentTask" = '')
      LIMIT 1
    `, [flowName]);

    if (ruleRes.rows.length === 0) {
      return res.status(404).json({ error: 'No starting rule found for this flowName.' });
    }

    const rule = ruleRes.rows[0];

    // 2. Insert initial task
    const taskId = uuidv4();
    const plannedTime = calculateTat(currentTime, rule.tat, rule.tatType);

    await pool.query(`
      INSERT INTO "Task" 
      ("id", "flowId", "taskName", "status", "plannedTime", "doerEmail", "formId", "system", "orderNumber", "flowDescription", "flowInitiatedAt", "flowInitiatedBy")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `, [
      taskId,
      flowId,
      rule.nextTask,
      'pending',
      plannedTime,
      rule.email,
      rule.formId,
      flowName,
      uniqueId,
      `Flow started via webhook`,
      currentTime,
      'Webhook'
    ]);

    // 3. Insert into FormResponse for initial data
    await pool.query(`
      INSERT INTO "FormResponse"
      ("responseId", "flowId", "taskId", "taskName", "formId", "formData", "submittedBy", "timestamp")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      `resp_${Date.now()}`,
      flowId,
      taskId,
      rule.nextTask,
      rule.formId,
      JSON.stringify(data),
      'Webhook',
      currentTime
    ]);

    return res.status(200).json({
      message: 'Flow started successfully',
      flowId,
      firstTask: {
        taskId,
        taskName: rule.nextTask,
        plannedTime,
        doerEmail: rule.email,
        formId: rule.formId
      }
    });

  } catch (err) {
    console.error('[Webhook Error]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

function calculateTat(start: string, tatValue: number, tatType: string) {
  const base = new Date(start);
  switch (tatType) {
    case 'hourtat':
      base.setHours(base.getHours() + tatValue);
      break;
    case 'daytat':
      base.setDate(base.getDate() + tatValue);
      break;
    case 'beforetat':
      base.setDate(base.getDate() - tatValue);
      break;
    case 'specifytat':
      return new Date(tatValue).toISOString();
    default:
      return base.toISOString();
  }
  return base.toISOString();
}
