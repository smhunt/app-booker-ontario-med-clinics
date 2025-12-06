import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth';
import { requireAdmin } from '../../middleware/rbac';
import { AuditService } from '../../services/auditService';

const router = Router();

// Audit logs are admin-only
router.use(authenticate);
router.use(requireAdmin);

const querySchema = z.object({
  userId: z.string().uuid().optional(),
  resource: z.string().optional(),
  resourceId: z.string().uuid().optional(),
  startDate: z.string().transform((s) => new Date(s)).optional(),
  endDate: z.string().transform((s) => new Date(s)).optional(),
  limit: z.string().transform((s) => parseInt(s, 10)).optional(),
  offset: z.string().transform((s) => parseInt(s, 10)).optional(),
});

/**
 * @swagger
 * /admin/audit-logs:
 *   get:
 *     summary: Query audit logs (Admin)
 *     description: Returns audit logs with optional filters. Requires admin role.
 *     tags: [Admin - Audit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by user ID
 *       - in: query
 *         name: resource
 *         schema:
 *           type: string
 *         description: Filter by resource type (e.g., booking, user)
 *       - in: query
 *         name: resourceId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by resource ID
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter logs from this date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter logs until this date
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *         description: Maximum number of logs to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of logs to skip
 *     responses:
 *       200:
 *         description: Audit logs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *                 offset:
 *                   type: integer
 *                 logs:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/AuditLog'
 *       400:
 *         description: Invalid query parameters
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires admin role
 *       500:
 *         description: Server error
 */
router.get('/', async (req, res): Promise<void> => {
  try {
    const filters = querySchema.parse(req.query);

    const result = await AuditService.query(filters);

    res.json({
      total: result.total,
      limit: filters.limit || 100,
      offset: filters.offset || 0,
      logs: result.logs,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Invalid query parameters',
        details: error.errors,
      });
      return;
    }

    res.status(500).json({
      error: 'Failed to fetch audit logs',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
