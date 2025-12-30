/**
 * @swagger
 * /api/customers/{id}:
 *   get:
 *     summary: Get customer details with history
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Customer details retrieved
 *   put:
 *     summary: Update customer information
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Customer updated successfully
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { query } from '@/lib/db';
import { checkPermission } from '@/lib/permissions';
import { logUpdate } from '@/lib/audit';
import { sanitizeInput } from '@/lib/validation';

export async function GET(request, { params }) {
  try {
    const user = await requireAuth(request);
    checkPermission(user, 'VIEW_CUSTOMERS');

    const { id } = params;

    // Get customer details
    const customerResult = await query(
      'SELECT * FROM customers WHERE customer_id = $1',
      [id]
    );

    if (customerResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Customer not found' },
        { status: 404 }
      );
    }

    const customer = customerResult.rows[0];

    // Get purchase history
    const salesResult = await query(
      `SELECT s.*, v.make, v.model, v.year, v.vin
       FROM sales s
       LEFT JOIN vehicles v ON s.vehicle_id = v.vehicle_id
       WHERE s.customer_id = $1
       ORDER BY s.sale_date DESC`,
      [id]
    );

    // Get service history
    const serviceResult = await query(
      `SELECT * FROM service_history
       WHERE customer_id = $1
       ORDER BY service_date DESC
       LIMIT 10`,
      [id]
    );

    // Get communications
    const commResult = await query(
      `SELECT * FROM communications
       WHERE customer_id = $1
       ORDER BY sent_date DESC
       LIMIT 10`,
      [id]
    );

    return NextResponse.json(
      {
        success: true,
        data: {
          customer,
          purchases: salesResult.rows,
          services: serviceResult.rows,
          communications: commResult.rows
        },
        message: 'Customer details retrieved successfully'
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in GET /api/customers/[id]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to retrieve customer' },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    const user = await requireAuth(request);
    checkPermission(user, 'EDIT_CUSTOMERS');

    const { id } = params;
    const body = await request.json();

    const current = await query('SELECT * FROM customers WHERE customer_id = $1', [id]);
    if (current.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Customer not found' },
        { status: 404 }
      );
    }

    const updates = [];
    const values = [];
    let paramIndex = 1;

    const allowedFields = [
      'name', 'email', 'phone', 'address', 'city', 'state', 'zip',
      'date_of_birth', 'drivers_license', 'preferred_contact'
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates.push(`${field} = $${paramIndex}`);
        values.push(typeof body[field] === 'string' ? sanitizeInput(body[field]) : body[field]);
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
      `UPDATE customers SET ${updates.join(', ')} WHERE customer_id = $${paramIndex} RETURNING *`,
      values
    );

    const updatedCustomer = result.rows[0];
    await logUpdate(user.id, 'CUSTOMER', id, current.rows[0], updatedCustomer, request);

    return NextResponse.json(
      {
        success: true,
        data: updatedCustomer,
        message: 'Customer updated successfully'
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in PUT /api/customers/[id]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update customer' },
      { status: 500 }
    );
  }
}