/**
 * @swagger
 * /api/audit-logs:
 *   get:
 *     summary: Retrieve audit trail
 *     tags: [Audit]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Audit logs retrieved successfully
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { query } from '@/lib/db';
import { checkPermission } from '@/lib/permissions';

export async function GET(request) {
  try {
    const user = await requireAuth(request);
    checkPermission(user, 'VIEW_AUDIT_LOGS');

    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get('entity_type');
    const entityId = searchParams.get('entity_id');
    const userId = searchParams.get('user_id');

    let queryText = `
      SELECT al.*, u.name as user_name, u.email as user_email
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (entityType) {
      queryText += ` AND al.entity_type = $${paramIndex}`;
      params.push(entityType);
      paramIndex++;
    }

    if (entityId) {
      queryText += ` AND al.entity_id = $${paramIndex}`;
      params.push(entityId);
      paramIndex++;
    }

    if (userId) {
      queryText += ` AND al.user_id = $${paramIndex}`;
      params.push(userId);
      paramIndex++;
    }

    queryText += ' ORDER BY al.timestamp DESC LIMIT 1000';

    const result = await query(queryText, params);

    return NextResponse.json(
      {
        success: true,
        data: result.rows,
        message: 'Audit logs retrieved successfully'
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in GET /api/audit-logs:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to retrieve audit logs' },
      { status: 500 }
    );
  }
}