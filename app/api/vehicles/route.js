/**
 * @swagger
 * /api/vehicles:
 *   get:
 *     summary: Get all vehicles with filters
 *     tags: [Vehicles]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Vehicles retrieved successfully
 *   post:
 *     summary: Add vehicle to inventory
 *     tags: [Vehicles]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Vehicle added successfully
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { query } from '@/lib/db';
import { validateVIN, validateRequiredFields, sanitizeInput } from '@/lib/validation';
import { checkPermission } from '@/lib/permissions';
import { logCreate } from '@/lib/audit';

export async function GET(request) {
  try {
    const user = await requireAuth(request);
    checkPermission(user, 'VIEW_VEHICLES');

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const make = searchParams.get('make');

    let queryText = 'SELECT * FROM vehicles WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (status) {
      queryText += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (type) {
      queryText += ` AND type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }

    if (make) {
      queryText += ` AND make ILIKE $${paramIndex}`;
      params.push(`%${make}%`);
      paramIndex++;
    }

    queryText += ' ORDER BY created_at DESC';

    const result = await query(queryText, params);

    return NextResponse.json(
      {
        success: true,
        data: result.rows,
        message: 'Vehicles retrieved successfully'
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in GET /api/vehicles:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to retrieve vehicles' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const user = await requireAuth(request);
    checkPermission(user, 'CREATE_VEHICLES');

    const body = await request.json();
    const {
      vin, make, model, year, color, mileage, status = 'Available',
      type, purchase_price, sale_price, stock_number, location, condition
    } = body;

    const missing = validateRequiredFields(body, ['vin', 'make', 'model', 'year']);
    if (missing) {
      return NextResponse.json(
        { success: false, error: `Missing required fields: ${missing.join(', ')}` },
        { status: 400 }
      );
    }

    if (!validateVIN(vin)) {
      return NextResponse.json(
        { success: false, error: 'Invalid VIN format' },
        { status: 400 }
      );
    }

    // Check for duplicate VIN
    const duplicate = await query(
      'SELECT vehicle_id FROM vehicles WHERE vin = $1',
      [vin.toUpperCase()]
    );

    if (duplicate.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Vehicle with this VIN already exists' },
        { status: 409 }
      );
    }

    const result = await query(
      `INSERT INTO vehicles (
        vehicle_id, vin, make, model, year, color, mileage, status, type,
        purchase_price, sale_price, stock_number, location, condition, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW()
      ) RETURNING *`,
      [
        vin.toUpperCase(),
        sanitizeInput(make),
        sanitizeInput(model),
        year,
        sanitizeInput(color) || null,
        mileage || 0,
        status,
        sanitizeInput(type) || null,
        purchase_price || null,
        sale_price || null,
        sanitizeInput(stock_number) || null,
        sanitizeInput(location) || null,
        sanitizeInput(condition) || null
      ]
    );

    const newVehicle = result.rows[0];
    await logCreate(user.id, 'VEHICLE', newVehicle.vehicle_id, newVehicle, request);

    return NextResponse.json(
      {
        success: true,
        data: newVehicle,
        message: 'Vehicle added successfully'
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in POST /api/vehicles:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to add vehicle' },
      { status: 500 }
    );
  }
}