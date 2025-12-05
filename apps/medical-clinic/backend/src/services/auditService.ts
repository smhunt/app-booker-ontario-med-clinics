import { PrismaClient } from '@prisma/client';
import { Request } from 'express';
import { redactObject } from '../utils/redactor';
import logger from '../utils/logger';

const prisma = new PrismaClient();

export interface AuditLogOptions {
  userId?: string;
  userRole?: string;
  action: string;
  resource: string;
  resourceId?: string;
  payload?: any;
  req?: Request;
}

/**
 * Audit Service
 * Creates immutable audit logs for all sensitive operations
 */
export class AuditService {
  /**
   * Create an audit log entry
   */
  static async log(options: AuditLogOptions): Promise<void> {
    try {
      // Redact PHI from payload
      const redactedPayload = options.payload
        ? redactObject(options.payload, { enabled: true, preserveStructure: true })
        : null;

      await prisma.auditLog.create({
        data: {
          userId: options.userId || null,
          userRole: options.userRole || null,
          action: options.action,
          resource: options.resource,
          resourceId: options.resourceId || null,
          payload: redactedPayload as any,
          ipAddress: options.req?.ip || null,
          userAgent: options.req?.get('user-agent') || null,
        },
      });

      logger.info('Audit log created', {
        action: options.action,
        resource: options.resource,
        userId: options.userId,
      });
    } catch (error) {
      logger.error('Failed to create audit log', {
        error: error instanceof Error ? error.message : 'Unknown error',
        action: options.action,
      });
      // Don't throw - audit log failure shouldn't break the operation
    }
  }

  /**
   * Query audit logs (admin only)
   */
  static async query(filters: {
    userId?: string;
    resource?: string;
    resourceId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }) {
    const where: any = {};

    if (filters.userId) where.userId = filters.userId;
    if (filters.resource) where.resource = filters.resource;
    if (filters.resourceId) where.resourceId = filters.resourceId;

    if (filters.startDate || filters.endDate) {
      where.timestamp = {};
      if (filters.startDate) where.timestamp.gte = filters.startDate;
      if (filters.endDate) where.timestamp.lte = filters.endDate;
    }

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: filters.limit || 100,
        skip: filters.offset || 0,
      }),
    ]);

    return { total, logs };
  }
}
