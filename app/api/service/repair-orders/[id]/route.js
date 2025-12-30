/**
 * @swagger
 * /api/service/repair-orders/{id}:
 *   get:
 *     summary: Get repair order details
 *     tags: [Service]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Repair order details retrieved
 *   put:
 *     summary: Update repair order
 *     tags: [Service]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Repair order updated successfully
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { query, transaction } from '@/lib/db';
import { checkPermission } from '@/lib/permissions';
import { logUpdate } from '@/lib/audit';

export async function GET(request, { params }) {
  try {
    const user = await requireAuth(request);
    checkPermission(user, 'VIEW_REPAIR_ORDERS');

    const { id } = params;

    const roResult = await query(
      `SELECT ro.*, 
              c.name as customer_name, c.phone as customer_phone,
              v.make, v.model, v.year, v.vin,
              u.name as technician_name
       FROM repair_orders ro
       LEFT JOIN customers c ON ro.customer_id = c.customer_id
       LEFT JOIN vehicles v ON ro.vehicle_id = v.vehicle_id
       LEFT JOIN users u ON ro.technician_id = u.id
       WHERE ro.repair_order_id = $1`,
      [id]
    );

    if (roResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Repair order not found' },
        { status: 404 }
      );
    }

    // Get items
    const itemsResult = await query(
      `SELECT roi.*, p.part_number, p.description as part_description
       FROM repair_order_items roi
       LEFT JOIN parts p ON roi.part_id = p.part_id
       WHERE roi.repair_order_id = $1`,
      [id]
    );

    return NextResponse.json(
      {
        success: true,
        data: {
          ...roResult.rows[0],
          items: itemsResult.rows
        },
        message: 'Repair order retrieved successfully'
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in GET /api/service/repair-orders/[id]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to retrieve repair order' },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    const user = await requireAuth(request);
    checkPermission(user, 'EDIT_REPAIR_ORDERS');

    const { id } = params;
    const body = await request.json();

    const current = await query(
      'SELECT * FROM repair_orders WHERE repair_order_id = $1',
      [id]
    );

    if (current.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Repair order not found' },
        { status: 404 }
      );
    }

    // Prevent editing completed orders
    if (current.rows[0].status === 'Completed' && user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Cannot edit completed repair orders' },
        { status: 400 }
      );
    }

    const result = await transaction(async (client) => {
      const updates = [];
      const values = [];
      let paramIndex = 1;

      const allowedFields = ['status', 'close_date', 'mileage'];

      for (const field of allowedFields) {
        if (body[field] !== undefined) {
          updates.push(`${field} = $${paramIndex}`);
          values.push(body[field]);
          paramIndex++;
        }
      }

      // If completing order, create service history
      if (body.status === 'Completed' && current.rows[0].status !== 'Completed') {
        await client.query(
          `INSERT INTO service_history (
            history_id, vehicle_id, customer_id, service_date, mileage,
            service_type, description, technician_id, cost, repair_order_id
          ) VALUES (
            gen_random_uuid(), $1, $2, NOW(), $3, 'Repair', 'Service completed', $4, $5, $6
          )`,
          [
            current.rows[0].vehicle_id,
            current.rows[0].customer_id,
            current.rows[0].mileage,
            current.rows[0].technician_id,
            current.rows[0].total_amount,
            id
          ]
        );
      }

      if (updates.length > 0) {
        updates.push(`updated_at = NOW()`);
        values.push(id);

        const updateResult = await client.query(
          `UPDATE repair_orders SET ${updates.join(', ')} WHERE repair_order_id = $${paramIndex} RETURNING *`,
          values
        );

        return updateResult.rows[0];
      }

      return current.rows[0];
    });

    await logUpdate(user.id, 'REPAIR_ORDER', id, current.rows[0], result, request);

    return NextResponse.json(
      {
        success: true,
        data: result,
        message: 'Repair order updated successfully'
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in PUT /api/service/repair-orders/[id]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update repair order' },
      { status: 500 }
    );
  }
}