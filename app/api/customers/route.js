/**
 * @swagger
 * /api/customers:
 *   get:
 *     summary: Get all customers with search
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Customers retrieved successfully
 *   post:
 *     summary: Create customer profile
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Customer created successfully
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
    checkPermission(user, 'VIEW_CUSTOMERS');

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');

    let queryText = 'SELECT * FROM customers WHERE 1=1';
    const params = [];

    if (search) {
      queryText += ` AND (name ILIKE $1 OR email ILIKE $1 OR phone ILIKE $1)`;
      params.push(`%${search}%`);
    }

    queryText += ' ORDER BY created_at DESC';

    const result = await query(queryText, params);

    return NextResponse.json(
      {
        success: true,
        data: result.rows,
        message: 'Customers retrieved successfully'
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in GET /api/customers:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to retrieve customers' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const user = await requireAuth(request);
    checkPermission(user, 'CREATE_CUSTOMERS');

    const body = await request.json();
    const {
      name, email, phone, address, city, state, zip,
      date_of_birth, drivers_license, preferred_contact
    } = body;

    const missing = validateRequiredFields(body, ['name', 'email', 'phone']);
    if (missing) {
      return NextResponse.json(
        { success: false, error: `Missing required fields: ${missing.join(', ')}` },
        { status: 400 }
      );
    }

    if (!validateEmail(email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      );
    }

    if (!validatePhone(phone)) {
      return NextResponse.json(
        { success: false, error: 'Invalid phone number format' },
        { status: 400 }
      );
    }

    // Check for duplicate
    const duplicate = await query(
      'SELECT customer_id FROM customers WHERE email = $1 OR phone = $2',
      [email, phone]
    );

    if (duplicate.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Customer with this email or phone already exists' },
        { status: 409 }
      );
    }

    const result = await query(
      `INSERT INTO customers (
        customer_id, name, email, phone, address, city, state, zip,
        date_of_birth, drivers_license, preferred_contact, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW()
      ) RETURNING *`,
      [
        sanitizeInput(name),
        email.toLowerCase(),
        phone,
        sanitizeInput(address) || null,
        sanitizeInput(city) || null,
        sanitizeInput(state) || null,
        zip || null,
        date_of_birth || null,
        sanitizeInput(drivers_license) || null,
        preferred_contact || 'email'
      ]
    );

    const newCustomer = result.rows[0];
    await logCreate(user.id, 'CUSTOMER', newCustomer.customer_id, newCustomer, request);

    return NextResponse.json(
      {
        success: true,
        data: newCustomer,
        message: 'Customer created successfully'
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in POST /api/customers:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create customer' },
      { status: 500 }
    );
  }
}