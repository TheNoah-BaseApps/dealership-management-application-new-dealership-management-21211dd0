/**
 * @swagger
 * /api/leads/{id}:
 *   get:
 *     summary: Get lead details by ID
 *     tags: [Leads]
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
 *         description: Lead details retrieved
 *       404:
 *         description: Lead not found
 *   put:
 *     summary: Update lead information
 *     tags: [Leads]
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
 *         description: Lead updated successfully
 *   delete:
 *     summary: Delete lead
 *     tags: [Leads]
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
 *         description: Lead deleted successfully
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
    checkPermission(user, 'VIEW_LEADS');

    const { id } = params;

    const result = await query(
      `SELECT l.*, u.name as assigned_to_name
       FROM leads l
       LEFT JOIN users u ON l.assigned_to = u.id
       WHERE l.lead_id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Lead not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: result.rows[0],
        message: 'Lead retrieved successfully'
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in GET /api/leads/[id]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to retrieve lead' },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    const user = await requireAuth(request);
    checkPermission(user, 'EDIT_LEADS');

    const { id } = params;
    const body = await request.json();

    // Get current lead
    const current = await query('SELECT * FROM leads WHERE lead_id = $1', [id]);
    if (current.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Lead not found' },
        { status: 404 }
      );
    }

    const updates = [];
    const values = [];
    let paramIndex = 1;

    const allowedFields = [
      'lead_source', 'lead_status', 'contact_name', 'contact_phone',
      'contact_email', 'vehicle_interested', 'inquiry_date', 'follow_up_date',
      'assigned_to', 'estimated_value', 'notes'
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
      `UPDATE leads SET ${updates.join(', ')} WHERE lead_id = $${paramIndex} RETURNING *`,
      values
    );

    const updatedLead = result.rows[0];

    // Log update
    await logUpdate(user.id, 'LEAD', id, current.rows[0], updatedLead, request);

    return NextResponse.json(
      {
        success: true,
        data: updatedLead,
        message: 'Lead updated successfully'
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in PUT /api/leads/[id]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update lead' },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const user = await requireAuth(request);
    checkPermission(user, 'DELETE_LEADS');

    const { id } = params;

    // Get current lead for audit
    const current = await query('SELECT * FROM leads WHERE lead_id = $1', [id]);
    if (current.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Lead not found' },
        { status: 404 }
      );
    }

    await query('DELETE FROM leads WHERE lead_id = $1', [id]);

    // Log deletion
    await logDelete(user.id, 'LEAD', id, current.rows[0], request);

    return NextResponse.json(
      {
        success: true,
        message: 'Lead deleted successfully'
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in DELETE /api/leads/[id]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete lead' },
      { status: 500 }
    );
  }
}