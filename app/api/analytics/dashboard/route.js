/**
 * @swagger
 * /api/analytics/dashboard:
 *   get:
 *     summary: Get dashboard metrics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard metrics retrieved successfully
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET(request) {
  try {
    const user = await requireAuth(request);

    // Get sales metrics
    const salesResult = await query(
      `SELECT 
         COUNT(*) as total_sales,
         SUM(sale_price) as total_revenue,
         AVG(sale_price) as avg_sale_price
       FROM sales
       WHERE sale_date >= NOW() - INTERVAL '30 days'`
    );

    // Get leads metrics
    const leadsResult = await query(
      `SELECT 
         COUNT(*) as total_leads,
         COUNT(CASE WHEN lead_status = 'New' THEN 1 END) as new_leads,
         COUNT(CASE WHEN lead_status = 'Converted' THEN 1 END) as converted_leads
       FROM leads
       WHERE created_at >= NOW() - INTERVAL '30 days'`
    );

    // Get inventory metrics
    const inventoryResult = await query(
      `SELECT 
         COUNT(*) as total_vehicles,
         COUNT(CASE WHEN status = 'Available' THEN 1 END) as available_vehicles,
         COUNT(CASE WHEN status = 'Sold' THEN 1 END) as sold_vehicles
       FROM vehicles`
    );

    // Get service metrics
    const serviceResult = await query(
      `SELECT 
         COUNT(*) as total_appointments,
         COUNT(CASE WHEN status = 'Scheduled' THEN 1 END) as scheduled,
         COUNT(CASE WHEN status = 'Completed' THEN 1 END) as completed
       FROM service_appointments
       WHERE appointment_date >= NOW() - INTERVAL '30 days'`
    );

    return NextResponse.json(
      {
        success: true,
        data: {
          sales: salesResult.rows[0],
          leads: leadsResult.rows[0],
          inventory: inventoryResult.rows[0],
          service: serviceResult.rows[0]
        },
        message: 'Dashboard metrics retrieved successfully'
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in GET /api/analytics/dashboard:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to retrieve dashboard metrics' },
      { status: 500 }
    );
  }
}