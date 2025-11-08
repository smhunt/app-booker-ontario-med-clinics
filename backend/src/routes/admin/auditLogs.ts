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
 * GET /admin/audit-logs
 * Query audit logs
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
