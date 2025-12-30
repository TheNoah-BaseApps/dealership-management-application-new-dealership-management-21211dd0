/**
 * @swagger
 * /api/service/appointments:
 *   get:
 *     summary: Get all service appointments
 *     tags: [Service]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Appointments retrieved successfully
 *   post:
 *     summary: Schedule service appointment
 *     tags: [Service]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Appointment scheduled successfully
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { query } from '@/lib/db';
import { validateRequiredFields, sanitizeInput } from '@/lib/validation';
import { checkPermission } from '@/lib/permissions';
import { logCreate } from '@/lib/audit';

export async function GET(request) {
  try {
    const user = await requireAuth(request);
    checkPermission(user, 'VIEW_APPOINTMENTS');

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const technicianId = searchParams.get('technician_id');

    let queryText = `
      SELECT sa.*, 
             c.name as customer_name, c.phone as customer_phone,
             v.make, v.model, v.year, v.vin,
             u.name as technician_name
      FROM service_appointments sa
      LEFT JOIN customers c ON sa.customer_id = c.customer_id
      LEFT JOIN vehicles v ON sa.vehicle_id = v.vehicle_id
      LEFT JOIN users u ON sa.assigned_technician_id = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (status) {
      queryText += ` AND sa.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (technicianId) {
      queryText += ` AND sa.assigned_technician_id = $${paramIndex}`;
      params.push(technicianId);
      paramIndex++;
    }

    queryText += ' ORDER BY sa.appointment_date ASC';

    const result = await query(queryText, params);

    return NextResponse.json(
      {
        success: true,
        data: result.rows,
        message: 'Appointments retrieved successfully'
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in GET /api/service/appointments:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to retrieve appointments' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const user = await requireAuth(request);
    checkPermission(user, 'CREATE_APPOINTMENTS');

    const body = await request.json();
    const {
      customer_id, vehicle_id, appointment_date, service_type,
      assigned_technician_id, estimated_completion, notes
    } = body;

    const missing = validateRequiredFields(body, [
      'customer_id', 'vehicle_id', 'appointment_date', 'service_type'
    ]);
    if (missing) {
      return NextResponse.json(
        { success: false, error: `Missing required fields: ${missing.join(', ')}` },
        { status: 400 }
      );
    }

    // Check for technician conflicts
    if (assigned_technician_id) {
      const conflicts = await query(
        `SELECT appointment_id FROM service_appointments 
         WHERE assigned_technician_id = $1 
         AND status IN ('Scheduled', 'In Progress')
         AND appointment_date = $2`,
        [assigned_technician_id, appointment_date]
      );

      if (conflicts.rows.length > 0) {
        return NextResponse.json(
          { success: false, error: 'Technician already has an appointment at this time' },
          { status: 409 }
        );
      }
    }

    const result = await query(
      `INSERT INTO service_appointments (
        appointment_id, customer_id, vehicle_id, appointment_date, service_type,
        assigned_technician_id, status, estimated_completion, notes, created_at
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5, 'Scheduled', $6, $7, NOW()
      ) RETURNING *`,
      [
        customer_id,
        vehicle_id,
        appointment_date,
        sanitizeInput(service_type),
        assigned_technician_id || null,
        estimated_completion || null,
        sanitizeInput(notes) || null
      ]
    );

    const newAppt = result.rows[0];
    await logCreate(user.id, 'APPOINTMENT', newAppt.appointment_id, newAppt, request);

    return NextResponse.json(
      {
        success: true,
        data: newAppt,
        message: 'Appointment scheduled successfully'
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in POST /api/service/appointments:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to schedule appointment' },
      { status: 500 }
    );
  }
}