/**
 * @swagger
 * /api/sales:
 *   get:
 *     summary: Get all sales with filters
 *     tags: [Sales]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sales retrieved successfully
 *   post:
 *     summary: Create sales transaction
 *     tags: [Sales]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Sale created successfully
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { query, transaction } from '@/lib/db';
import { validateRequiredFields } from '@/lib/validation';
import { checkPermission } from '@/lib/permissions';
import { logCreate } from '@/lib/audit';

export async function GET(request) {
  try {
    const user = await requireAuth(request);
    checkPermission(user, 'VIEW_SALES');

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const salespersonId = searchParams.get('salesperson_id');

    let queryText = `
      SELECT s.*, 
             c.name as customer_name,
             v.make, v.model, v.year, v.vin,
             u.name as salesperson_name
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.customer_id
      LEFT JOIN vehicles v ON s.vehicle_id = v.vehicle_id
      LEFT JOIN users u ON s.salesperson_id = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (status) {
      queryText += ` AND s.sale_status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (salespersonId) {
      queryText += ` AND s.salesperson_id = $${paramIndex}`;
      params.push(salespersonId);
      paramIndex++;
    }

    queryText += ' ORDER BY s.sale_date DESC';

    const result = await query(queryText, params);

    return NextResponse.json(
      {
        success: true,
        data: result.rows,
        message: 'Sales retrieved successfully'
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in GET /api/sales:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to retrieve sales' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const user = await requireAuth(request);
    checkPermission(user, 'CREATE_SALES');

    const body = await request.json();
    const {
      customer_id, vehicle_id, sale_price, financing_type,
      trade_in_vehicle_id, trade_in_value, delivery_date,
      warranty_package, down_payment
    } = body;

    const missing = validateRequiredFields(body, ['customer_id', 'vehicle_id', 'sale_price']);
    if (missing) {
      return NextResponse.json(
        { success: false, error: `Missing required fields: ${missing.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate vehicle is available
    const vehicleCheck = await query(
      'SELECT status FROM vehicles WHERE vehicle_id = $1',
      [vehicle_id]
    );

    if (vehicleCheck.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Vehicle not found' },
        { status: 404 }
      );
    }

    if (vehicleCheck.rows[0].status !== 'Available') {
      return NextResponse.json(
        { success: false, error: 'Vehicle is not available for sale' },
        { status: 400 }
      );
    }

    const result = await transaction(async (client) => {
      // Create sale
      const saleResult = await client.query(
        `INSERT INTO sales (
          sale_id, customer_id, vehicle_id, sale_date, sale_price,
          financing_type, salesperson_id, trade_in_vehicle_id, trade_in_value,
          delivery_date, warranty_package, sale_status, down_payment, created_at, updated_at
        ) VALUES (
          gen_random_uuid(), $1, $2, NOW(), $3, $4, $5, $6, $7, $8, $9, 'Pending', $10, NOW(), NOW()
        ) RETURNING *`,
        [
          customer_id,
          vehicle_id,
          sale_price,
          financing_type || null,
          user.id,
          trade_in_vehicle_id || null,
          trade_in_value || null,
          delivery_date || null,
          warranty_package || null,
          down_payment || null
        ]
      );

      // Update vehicle status
      await client.query(
        'UPDATE vehicles SET status = $1, updated_at = NOW() WHERE vehicle_id = $2',
        ['Sold', vehicle_id]
      );

      return saleResult.rows[0];
    });

    await logCreate(user.id, 'SALE', result.sale_id, result, request);

    return NextResponse.json(
      {
        success: true,
        data: result,
        message: 'Sale created successfully'
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in POST /api/sales:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create sale' },
      { status: 500 }
    );
  }
}