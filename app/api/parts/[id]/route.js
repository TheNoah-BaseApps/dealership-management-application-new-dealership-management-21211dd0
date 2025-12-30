/**
 * @swagger
 * /api/parts/{id}:
 *   put:
 *     summary: Update part information
 *     tags: [Parts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Part updated successfully
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { query } from '@/lib/db';
import { checkPermission } from '@/lib/permissions';
import { logUpdate } from '@/lib/audit';
import { sanitizeInput } from '@/lib/validation';

export async function PUT(request, { params }) {
  try {
    const user = await requireAuth(request);
    checkPermission(user, 'EDIT_PARTS');

    const { id } = params;
    const body = await request.json();

    const current = await query('SELECT * FROM parts WHERE part_id = $1', [id]);
    if (current.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Part not found' },
        { status: 404 }
      );
    }

    const updates = [];
    const values = [];
    let paramIndex = 1;

    const allowedFields = [
      'part_number', 'description', 'category', 'quantity_on_hand',
      'reorder_level', 'cost', 'retail_price', 'supplier', 'location'
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
      `UPDATE parts SET ${updates.join(', ')} WHERE part_id = $${paramIndex} RETURNING *`,
      values
    );

    const updatedPart = result.rows[0];
    await logUpdate(user.id, 'PART', id, current.rows[0], updatedPart, request);

    return NextResponse.json(
      {
        success: true,
        data: updatedPart,
        message: 'Part updated successfully'
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in PUT /api/parts/[id]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update part' },
      { status: 500 }
    );
  }
}