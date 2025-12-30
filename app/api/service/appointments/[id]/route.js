/**
 * @swagger
 * /api/service/appointments/{id}:
 *   put:
 *     summary: Update appointment
 *     tags: [Service]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Appointment updated successfully
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
    checkPermission(user, 'EDIT_APPOINTMENTS');

    const { id } = params;
    const body = await request.json();

    const current = await query(
      'SELECT * FROM service_appointments WHERE appointment_id = $1',
      [id]
    );

    if (current.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Appointment not found' },
        { status: 404 }
      );
    }

    const updates = [];
    const values = [];
    let paramIndex = 1;

    const allowedFields = [
      'appointment_date', 'service_type', 'assigned_technician_id',
      'status', 'estimated_completion', 'notes'
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

    values.push(id);

    const result = await query(
      `UPDATE service_appointments SET ${updates.join(', ')} WHERE appointment_id = $${paramIndex} RETURNING *`,
      values
    );

    const updatedAppt = result.rows[0];
    await logUpdate(user.id, 'APPOINTMENT', id, current.rows[0], updatedAppt, request);

    return NextResponse.json(
      {
        success: true,
        data: updatedAppt,
        message: 'Appointment updated successfully'
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in PUT /api/service/appointments/[id]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update appointment' },
      { status: 500 }
    );
  }
}