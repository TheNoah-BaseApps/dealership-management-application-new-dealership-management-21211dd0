/**
 * @swagger
 * /api/communications:
 *   get:
 *     summary: Get all communications
 *     tags: [Communications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Communications retrieved successfully
 *   post:
 *     summary: Send communication
 *     tags: [Communications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Communication sent successfully
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { query } from '@/lib/db';
import { validateRequiredFields, sanitizeInput } from '@/lib/validation';
import { checkPermission } from '@/lib/permissions';
import { sendEmail } from '@/lib/email';
import { sendSMS } from '@/lib/sms';

export async function GET(request) {
  try {
    const user = await requireAuth(request);
    checkPermission(user, 'VIEW_COMMUNICATIONS');

    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customer_id');

    let queryText = `
      SELECT c.*, 
             cust.name as customer_name,
             u.name as sent_by_name
      FROM communications c
      LEFT JOIN customers cust ON c.customer_id = cust.customer_id
      LEFT JOIN users u ON c.sent_by = u.id
      WHERE 1=1
    `;
    const params = [];

    if (customerId) {
      queryText += ` AND c.customer_id = $1`;
      params.push(customerId);
    }

    queryText += ' ORDER BY c.sent_date DESC';

    const result = await query(queryText, params);

    return NextResponse.json(
      {
        success: true,
        data: result.rows,
        message: 'Communications retrieved successfully'
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in GET /api/communications:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to retrieve communications' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const user = await requireAuth(request);
    checkPermission(user, 'SEND_COMMUNICATIONS');

    const body = await request.json();
    const { customer_id, type, subject, message } = body;

    const missing = validateRequiredFields(body, ['customer_id', 'type', 'message']);
    if (missing) {
      return NextResponse.json(
        { success: false, error: `Missing required fields: ${missing.join(', ')}` },
        { status: 400 }
      );
    }

    // Get customer details
    const customerResult = await query(
      'SELECT * FROM customers WHERE customer_id = $1',
      [customer_id]
    );

    if (customerResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Customer not found' },
        { status: 404 }
      );
    }

    const customer = customerResult.rows[0];

    // Send communication based on type
    let sendResult = null;
    if (type === 'email' && customer.email) {
      sendResult = await sendEmail({
        to: customer.email,
        subject: subject || 'Message from Dealership',
        body: message
      });
    } else if (type === 'sms' && customer.phone) {
      sendResult = await sendSMS({
        to: customer.phone,
        message
      });
    }

    // Log communication
    const result = await query(
      `INSERT INTO communications (
        communication_id, customer_id, type, subject, message,
        sent_by, sent_date, status, created_at
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5, NOW(), $6, NOW()
      ) RETURNING *`,
      [
        customer_id,
        type,
        sanitizeInput(subject) || null,
        sanitizeInput(message),
        user.id,
        sendResult?.success ? 'Sent' : 'Failed'
      ]
    );

    return NextResponse.json(
      {
        success: true,
        data: result.rows[0],
        message: 'Communication sent successfully'
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in POST /api/communications:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to send communication' },
      { status: 500 }
    );
  }
}