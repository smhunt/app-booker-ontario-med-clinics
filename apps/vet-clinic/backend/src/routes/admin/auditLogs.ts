import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { requireAdmin } from '../../middleware/rbac';
import { AuditService } from '../../services/auditService';

const router = Router();

// All audit log routes require admin authentication
router.use(authenticate);
router.use(requireAdmin);

/**
 * GET /admin/audit-logs
 * Query audit logs with filters
 */
router.get('/', async (req, res) => {
  try {
    const {
      userId,
      resource,
      resourceId,
      startDate,
      endDate,
      limit,
      offset,
    } = req.query;

    const result = await AuditService.query({
      userId: userId as string,
      resource: resource as string,
      resourceId: resourceId as string,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    });

    res.json({
      total: result.total,
      logs: result.logs.map((log) => ({
        id: log.id,
        userId: log.userId,
        action: log.action,
        resourceType: log.resourceType,
        resourceId: log.resourceId,
        ipAddress: log.ipAddress,
        timestamp: log.timestamp,
        details: log.details,
      })),
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch audit logs',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
