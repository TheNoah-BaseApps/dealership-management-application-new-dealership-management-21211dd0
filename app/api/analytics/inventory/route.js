/**
 * @swagger
 * /api/analytics/inventory:
 *   get:
 *     summary: Get inventory analytics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Inventory analytics retrieved successfully
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { query } from '@/lib/db';
import { checkPermission } from '@/lib/permissions';

export async function GET(request) {
  try {
    const user = await requireAuth(request);
    checkPermission(user, 'VIEW_VEHICLES');

    // Inventory by status
    const inventoryByStatus = await query(
      `SELECT 
         status,
         COUNT(*) as count,
         SUM(purchase_price) as total_value
       FROM vehicles
       GROUP BY status`
    );

    // Inventory by type
    const inventoryByType = await query(
      `SELECT 
         type,
         COUNT(*) as count,
         AVG(sale_price) as avg_price
       FROM vehicles
       WHERE status = 'Available'
       GROUP BY type`
    );

    // Parts low stock
    const lowStockParts = await query(
      `SELECT 
         part_number,
         description,
         quantity_on_hand,
         reorder_level
       FROM parts
       WHERE quantity_on_hand <= reorder_level
       ORDER BY quantity_on_hand ASC
       LIMIT 20`
    );

    return NextResponse.json(
      {
        success: true,
        data: {
          inventoryByStatus: inventoryByStatus.rows,
          inventoryByType: inventoryByType.rows,
          lowStockParts: lowStockParts.rows
        },
        message: 'Inventory analytics retrieved successfully'
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in GET /api/analytics/inventory:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to retrieve inventory analytics' },
      { status: 500 }
    );
  }
}