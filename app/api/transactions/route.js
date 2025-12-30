/**
 * @swagger
 * /api/transactions:
 *   get:
 *     summary: Get all transactions with filters
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Transactions retrieved successfully
 *   post:
 *     summary: Record transaction
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Transaction recorded successfully
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
    checkPermission(user, 'VIEW_TRANSACTIONS');

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const status = searchParams.get('status');

    let queryText = `
      SELECT t.*, 
             c.name as customer_name,
             u.name as created_by_name
      FROM transactions t
      LEFT JOIN customers c ON t.customer_id = c.customer_id
      LEFT JOIN users u ON t.created_by = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (type) {
      queryText += ` AND t.type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }

    if (status) {
      queryText += ` AND t.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    queryText += ' ORDER BY t.transaction_date DESC';

    const result = await query(queryText, params);

    return NextResponse.json(
      {
        success: true,
        data: result.rows,
        message: 'Transactions retrieved successfully'
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in GET /api/transactions:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to retrieve transactions' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const user = await requireAuth(request);
    checkPermission(user, 'CREATE_TRANSACTIONS');

    const body = await request.json();
    const {
      type, reference_id, customer_id, amount, payment_method, description
    } = body;

    const missing = validateRequiredFields(body, ['type', 'amount', 'payment_method']);
    if (missing) {
      return NextResponse.json(
        { success: false, error: `Missing required fields: ${missing.join(', ')}` },
        { status: 400 }
      );
    }

    const result = await query(
      `INSERT INTO transactions (
        transaction_id, type, reference_id, customer_id, amount,
        payment_method, transaction_date, status, description, created_by
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5, NOW(), 'Completed', $6, $7
      ) RETURNING *`,
      [
        sanitizeInput(type),
        reference_id || null,
        customer_id || null,
        amount,
        sanitizeInput(payment_method),
        sanitizeInput(description) || null,
        user.id
      ]
    );

    const newTransaction = result.rows[0];
    await logCreate(user.id, 'TRANSACTION', newTransaction.transaction_id, newTransaction, request);

    return NextResponse.json(
      {
        success: true,
        data: newTransaction,
        message: 'Transaction recorded successfully'
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in POST /api/transactions:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to record transaction' },
      { status: 500 }
    );
  }
}