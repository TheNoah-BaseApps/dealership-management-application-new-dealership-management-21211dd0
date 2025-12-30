/**
 * @swagger
 * /api/service/history/{vehicleId}:
 *   get:
 *     summary: Get service history for vehicle
 *     tags: [Service]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Service history retrieved successfully
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET(request, { params }) {
  try {
    const user = await requireAuth(request);
    const { vehicleId } = params;

    const result = await query(
      `SELECT sh.*, 
              u.name as technician_name,
              c.name as customer_name
       FROM service_history sh
       LEFT JOIN users u ON sh.technician_id = u.id
       LEFT JOIN customers c ON sh.customer_id = c.customer_id
       WHERE sh.vehicle_id = $1
       ORDER BY sh.service_date DESC`,
      [vehicleId]
    );

    return NextResponse.json(
      {
        success: true,
        data: result.rows,
        message: 'Service history retrieved successfully'
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in GET /api/service/history/[vehicleId]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to retrieve service history' },
      { status: 500 }
    );
  }
}