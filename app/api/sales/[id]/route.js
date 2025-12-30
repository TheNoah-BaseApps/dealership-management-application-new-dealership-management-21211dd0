/**
 * @swagger
 * /api/sales/{id}:
 *   get:
 *     summary: Get sale details
 *     tags: [Sales]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sale details retrieved
 *   put:
 *     summary: Update sale status
 *     tags: [Sales]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sale updated successfully
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { query } from '@/lib/db';
import { checkPermission } from '@/lib/permissions';
import { logUpdate } from '@/lib/audit';

export async function GET(request, { params }) {
  try {
    const user = await requireAuth(request);
    checkPermission(user, 'VIEW_SALES');

    const { id } = params;

    const result = await query(
      `SELECT s.*, 
              c.name as customer_name, c.email as customer_email, c.phone as customer_phone,
              v.make, v.model, v.year, v.vin, v.color,
              u.name as salesperson_name
       FROM sales s
       LEFT JOIN customers c ON s.customer_id = c.customer_id
       LEFT JOIN vehicles v ON s.vehicle_id = v.vehicle_id
       LEFT JOIN users u ON s.salesperson_id = u.id
       WHERE s.sale_id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Sale not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: result.rows[0],
        message: 'Sale details retrieved successfully'
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in GET /api/sales/[id]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to retrieve sale' },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    const user = await requireAuth(request);
    checkPermission(user, 'EDIT_SALES');

    const { id } = params;
    const body = await request.json();

    const current = await query('SELECT * FROM sales WHERE sale_id = $1', [id]);
    if (current.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Sale not found' },
        { status: 404 }
      );
    }

    // Prevent editing completed sales
    if (current.rows[0].sale_status === 'Completed') {
      return NextResponse.json(
        { success: false, error: 'Cannot edit completed sales' },
        { status: 400 }
      );
    }

    const updates = [];
    const values = [];
    let paramIndex = 1;

    const allowedFields = [
      'sale_status', 'delivery_date', 'warranty_package', 'down_payment'
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates.push(`${field} = $${paramIndex}`);
        values.push(body[field]);
        paramIndex++;
      }
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const result = await query(
      `UPDATE sales SET ${updates.join(', ')} WHERE sale_id = $${paramIndex} RETURNING *`,
      values
    );

    const updatedSale = result.rows[0];
    await logUpdate(user.id, 'SALE', id, current.rows[0], updatedSale, request);

    return NextResponse.json(
      {
        success: true,
        data: updatedSale,
        message: 'Sale updated successfully'
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in PUT /api/sales/[id]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update sale' },
      { status: 500 }
    );
  }
}