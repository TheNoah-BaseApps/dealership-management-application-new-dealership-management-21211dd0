/**
 * @swagger
 * /api/leads:
 *   get:
 *     summary: Get all leads with filters
 *     tags: [Leads]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: assigned_to
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Leads retrieved successfully
 *   post:
 *     summary: Create a new lead
 *     tags: [Leads]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Lead created successfully
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { query } from '@/lib/db';
import { validateEmail, validatePhone, validateRequiredFields, sanitizeInput } from '@/lib/validation';
import { checkPermission } from '@/lib/permissions';
import { logCreate } from '@/lib/audit';

export async function GET(request) {
  try {
    const user = await requireAuth(request);
    checkPermission(user, 'VIEW_LEADS');

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const assignedTo = searchParams.get('assigned_to');

    let queryText = `
      SELECT l.*, u.name as assigned_to_name
      FROM leads l
      LEFT JOIN users u ON l.assigned_to = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (status) {
      queryText += ` AND l.lead_status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (assignedTo) {
      queryText += ` AND l.assigned_to = $${paramIndex}`;
      params.push(assignedTo);
      paramIndex++;
    }

    // Non-admin users only see their own leads
    if (user.role !== 'admin') {
      queryText += ` AND l.assigned_to = $${paramIndex}`;
      params.push(user.id);
      paramIndex++;
    }

    queryText += ' ORDER BY l.created_at DESC';

    const result = await query(queryText, params);

    return NextResponse.json(
      {
        success: true,
        data: result.rows,
        message: 'Leads retrieved successfully'
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in GET /api/leads:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to retrieve leads' },
      { status: error.message === 'Unauthorized' ? 401 : 500 }
    );
  }
}

export async function POST(request) {
  try {
    const user = await requireAuth(request);
    checkPermission(user, 'CREATE_LEADS');

    const body = await request.json();
    const {
      lead_source,
      lead_status = 'New',
      contact_name,
      contact_phone,
      contact_email,
      vehicle_interested,
      inquiry_date,
      follow_up_date,
      assigned_to,
      estimated_value,
      notes
    } = body;

    // Validate required fields
    const missing = validateRequiredFields(body, ['contact_name', 'lead_source']);
    if (missing) {
      return NextResponse.json(
        { success: false, error: `Missing required fields: ${missing.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate email if provided
    if (contact_email && !validateEmail(contact_email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate phone if provided
    if (contact_phone && !validatePhone(contact_phone)) {
      return NextResponse.json(
        { success: false, error: 'Invalid phone number format' },
        { status: 400 }
      );
    }

    // Check for duplicate lead
    if (contact_email || contact_phone) {
      const duplicateCheck = await query(
        'SELECT lead_id FROM leads WHERE contact_email = $1 OR contact_phone = $2',
        [contact_email || null, contact_phone || null]
      );

      if (duplicateCheck.rows.length > 0) {
        return NextResponse.json(
          { success: false, error: 'A lead with this email or phone already exists' },
          { status: 409 }
        );
      }
    }

    const result = await query(
      `INSERT INTO leads (
        lead_id, lead_source, lead_status, contact_name, contact_phone, contact_email,
        vehicle_interested, inquiry_date, follow_up_date, assigned_to, estimated_value,
        notes, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW()
      ) RETURNING *`,
      [
        sanitizeInput(lead_source),
        lead_status,
        sanitizeInput(contact_name),
        contact_phone || null,
        contact_email || null,
        sanitizeInput(vehicle_interested) || null,
        inquiry_date || new Date(),
        follow_up_date || null,
        assigned_to || user.id,
        estimated_value || null,
        sanitizeInput(notes) || null
      ]
    );

    const newLead = result.rows[0];

    // Log creation
    await logCreate(user.id, 'LEAD', newLead.lead_id, newLead, request);

    return NextResponse.json(
      {
        success: true,
        data: newLead,
        message: 'Lead created successfully'
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in POST /api/leads:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create lead' },
      { status: error.message?.includes('permission') ? 403 : 500 }
    );
  }
}