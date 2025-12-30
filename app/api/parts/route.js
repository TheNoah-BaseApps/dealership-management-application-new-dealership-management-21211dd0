/**
 * @swagger
 * /api/parts:
 *   get:
 *     summary: Get all parts with search
 *     tags: [Parts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Parts retrieved successfully
 *   post:
 *     summary: Add parts to inventory
 *     tags: [Parts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Part added successfully
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
    checkPermission(user, 'VIEW_PARTS');

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const category = searchParams.get('category');
    const lowStock = searchParams.get('low_stock');

    let queryText = 'SELECT * FROM parts WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (search) {
      queryText += ` AND (part_number ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (category) {
      queryText += ` AND category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    if (lowStock === 'true') {
      queryText += ` AND quantity_on_hand <= reorder_level`;
    }

    queryText += ' ORDER BY part_number ASC';

    const result = await query(queryText, params);

    return NextResponse.json(
      {
        success: true,
        data: result.rows,
        message: 'Parts retrieved successfully'
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in GET /api/parts:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to retrieve parts' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const user = await requireAuth(request);
    checkPermission(user, 'CREATE_PARTS');

    const body = await request.json();
    const {
      part_number, description, category, quantity_on_hand = 0,
      reorder_level = 10, cost, retail_price, supplier, location
    } = body;

    const missing = validateRequiredFields(body, ['part_number', 'description', 'category']);
    if (missing) {
      return NextResponse.json(
        { success: false, error: `Missing required fields: ${missing.join(', ')}` },
        { status: 400 }
      );
    }

    // Check for duplicate part number
    const duplicate = await query(
      'SELECT part_id FROM parts WHERE part_number = $1',
      [part_number]
    );

    if (duplicate.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Part with this number already exists' },
        { status: 409 }
      );
    }

    const result = await query(
      `INSERT INTO parts (
        part_id, part_number, description, category, quantity_on_hand,
        reorder_level, cost, retail_price, supplier, location, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW()
      ) RETURNING *`,
      [
        sanitizeInput(part_number),
        sanitizeInput(description),
        sanitizeInput(category),
        quantity_on_hand,
        reorder_level,
        cost || null,
        retail_price || null,
        sanitizeInput(supplier) || null,
        sanitizeInput(location) || null
      ]
    );

    const newPart = result.rows[0];
    await logCreate(user.id, 'PART', newPart.part_id, newPart, request);

    return NextResponse.json(
      {
        success: true,
        data: newPart,
        message: 'Part added successfully'
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in POST /api/parts:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to add part' },
      { status: 500 }
    );
  }
}