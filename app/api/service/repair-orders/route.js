/**
 * @swagger
 * /api/service/repair-orders:
 *   get:
 *     summary: Get all repair orders
 *     tags: [Service]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Repair orders retrieved successfully
 *   post:
 *     summary: Create repair order
 *     tags: [Service]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Repair order created successfully
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { query } from '@/lib/db';
import { validateRequiredFields } from '@/lib/validation';
import { checkPermission } from '@/lib/permissions';
import { logCreate } from '@/lib/audit';

export async function GET(request) {
  try {
    const user = await requireAuth(request);
    checkPermission(user, 'VIEW_REPAIR_ORDERS');

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    let queryText = `
      SELECT ro.*, 
             c.name as customer_name,
             v.make, v.model, v.year, v.vin,
             u.name as technician_name
      FROM repair_orders ro
      LEFT JOIN customers c ON ro.customer_id = c.customer_id
      LEFT JOIN vehicles v ON ro.vehicle_id = v.vehicle_id
      LEFT JOIN users u ON ro.technician_id = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (status) {
      queryText += ` AND ro.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    queryText += ' ORDER BY ro.open_date DESC';

    const result = await query(queryText, params);

    return NextResponse.json(
      {
        success: true,
        data: result.rows,
        message: 'Repair orders retrieved successfully'
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in GET /api/service/repair-orders:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to retrieve repair orders' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const user = await requireAuth(request);
    checkPermission(user, 'CREATE_REPAIR_ORDERS');

    const body = await request.json();
    const {
      appointment_id, customer_id, vehicle_id, technician_id, mileage
    } = body;

    const missing = validateRequiredFields(body, [
      'customer_id', 'vehicle_id', 'technician_id'
    ]);
    if (missing) {
      return NextResponse.json(
        { success: false, error: `Missing required fields: ${missing.join(', ')}` },
        { status: 400 }
      );
    }

    const result = await query(
      `INSERT INTO repair_orders (
        repair_order_id, appointment_id, customer_id, vehicle_id, open_date,
        status, labor_total, parts_total, tax, total_amount, technician_id, mileage, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, NOW(), 'Open', 0, 0, 0, 0, $4, $5, NOW(), NOW()
      ) RETURNING *`,
      [
        appointment_id || null,
        customer_id,
        vehicle_id,
        technician_id,
        mileage || null
      ]
    );

    const newRO = result.rows[0];
    await logCreate(user.id, 'REPAIR_ORDER', newRO.repair_order_id, newRO, request);

    return NextResponse.json(
      {
        success: true,
        data: newRO,
        message: 'Repair order created successfully'
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in POST /api/service/repair-orders:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create repair order' },
      { status: 500 }
    );
  }
}