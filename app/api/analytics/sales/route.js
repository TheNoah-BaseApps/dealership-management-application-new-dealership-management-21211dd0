/**
 * @swagger
 * /api/analytics/sales:
 *   get:
 *     summary: Get sales analytics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sales analytics retrieved successfully
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { query } from '@/lib/db';
import { checkPermission } from '@/lib/permissions';

export async function GET(request) {
  try {
    const user = await requireAuth(request);
    checkPermission(user, 'VIEW_SALES');

    // Sales by month
    const monthlySales = await query(
      `SELECT 
         DATE_TRUNC('month', sale_date) as month,
         COUNT(*) as count,
         SUM(sale_price) as revenue
       FROM sales
       WHERE sale_date >= NOW() - INTERVAL '12 months'
       GROUP BY month
       ORDER BY month DESC`
    );

    // Sales by salesperson
    const salesBySalesperson = await query(
      `SELECT 
         u.name,
         COUNT(s.sale_id) as sales_count,
         SUM(s.sale_price) as total_revenue
       FROM sales s
       LEFT JOIN users u ON s.salesperson_id = u.id
       WHERE s.sale_date >= NOW() - INTERVAL '30 days'
       GROUP BY u.id, u.name
       ORDER BY total_revenue DESC`
    );

    // Top selling vehicles
    const topVehicles = await query(
      `SELECT 
         v.make,
         v.model,
         COUNT(s.sale_id) as sales_count,
         AVG(s.sale_price) as avg_price
       FROM sales s
       JOIN vehicles v ON s.vehicle_id = v.vehicle_id
       WHERE s.sale_date >= NOW() - INTERVAL '30 days'
       GROUP BY v.make, v.model
       ORDER BY sales_count DESC
       LIMIT 10`
    );

    return NextResponse.json(
      {
        success: true,
        data: {
          monthlySales: monthlySales.rows,
          salesBySalesperson: salesBySalesperson.rows,
          topVehicles: topVehicles.rows
        },
        message: 'Sales analytics retrieved successfully'
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in GET /api/analytics/sales:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to retrieve sales analytics' },
      { status: 500 }
    );
  }
}