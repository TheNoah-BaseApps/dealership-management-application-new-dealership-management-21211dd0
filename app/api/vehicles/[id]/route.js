/**
 * @swagger
 * /api/vehicles/{id}:
 *   get:
 *     summary: Get vehicle details
 *     tags: [Vehicles]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Vehicle details retrieved
 *   put:
 *     summary: Update vehicle information
 *     tags: [Vehicles]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Vehicle updated successfully
 *   delete:
 *     summary: Remove vehicle
 *     tags: [Vehicles]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Vehicle removed successfully
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { query } from '@/lib/db';
import { checkPermission } from '@/lib/permissions';
import { logUpdate, logDelete } from '@/lib/audit';
import { sanitizeInput } from '@/lib/validation';

export async function GET(request, { params }) {
  try {
    const user = await requireAuth(request);
    checkPermission(user, 'VIEW_VEHICLES');

    const { id } = params;

    const result = await query(
      'SELECT * FROM vehicles WHERE vehicle_id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Vehicle not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: result.rows[0],
        message: 'Vehicle details retrieved successfully'
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in GET /api/vehicles/[id]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to retrieve vehicle' },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    const user = await requireAuth(request);
    checkPermission(user, 'EDIT_VEHICLES');

    const { id } = params;
    const body = await request.json();

    const current = await query('SELECT * FROM vehicles WHERE vehicle_id = $1', [id]);
    if (current.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Vehicle not found' },
        { status: 404 }
      );
    }

    const updates = [];
    const values = [];
    let paramIndex = 1;

    const allowedFields = [
      'make', 'model', 'year', 'color', 'mileage', 'status', 'type',
      'purchase_price', 'sale_price', 'stock_number', 'location', 'condition'
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
      `UPDATE vehicles SET ${updates.join(', ')} WHERE vehicle_id = $${paramIndex} RETURNING *`,
      values
    );

    const updatedVehicle = result.rows[0];
    await logUpdate(user.id, 'VEHICLE', id, current.rows[0], updatedVehicle, request);

    return NextResponse.json(
      {
        success: true,
        data: updatedVehicle,
        message: 'Vehicle updated successfully'
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in PUT /api/vehicles/[id]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update vehicle' },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const user = await requireAuth(request);
    checkPermission(user, 'DELETE_VEHICLES');

    const { id } = params;

    const current = await query('SELECT * FROM vehicles WHERE vehicle_id = $1', [id]);
    if (current.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Vehicle not found' },
        { status: 404 }
      );
    }

    // Check if vehicle is in any sales
    const salesCheck = await query(
      'SELECT sale_id FROM sales WHERE vehicle_id = $1',
      [id]
    );

    if (salesCheck.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete vehicle with associated sales' },
        { status: 400 }
      );
    }

    await query('DELETE FROM vehicles WHERE vehicle_id = $1', [id]);
    await logDelete(user.id, 'VEHICLE', id, current.rows[0], request);

    return NextResponse.json(
      {
        success: true,
        message: 'Vehicle removed successfully'
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in DELETE /api/vehicles/[id]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to remove vehicle' },
      { status: 500 }
    );
  }
}