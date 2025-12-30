/**
 * @swagger
 * /api/service/repair-orders/{id}/items:
 *   post:
 *     summary: Add items to repair order
 *     tags: [Service]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Item added successfully
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { query, transaction } from '@/lib/db';
import { validateRequiredFields } from '@/lib/validation';
import { checkPermission } from '@/lib/permissions';
import { calculateRepairOrderTotal } from '@/lib/calculations';

export async function POST(request, { params }) {
  try {
    const user = await requireAuth(request);
    checkPermission(user, 'EDIT_REPAIR_ORDERS');

    const { id } = params;
    const body = await request.json();
    const { type, description, quantity, unit_price, part_id, labor_hours } = body;

    const missing = validateRequiredFields(body, ['type', 'description', 'quantity', 'unit_price']);
    if (missing) {
      return NextResponse.json(
        { success: false, error: `Missing required fields: ${missing.join(', ')}` },
        { status: 400 }
      );
    }

    const result = await transaction(async (client) => {
      // Check repair order exists
      const roCheck = await client.query(
        'SELECT status FROM repair_orders WHERE repair_order_id = $1',
        [id]
      );

      if (roCheck.rows.length === 0) {
        throw new Error('Repair order not found');
      }

      if (roCheck.rows[0].status === 'Completed') {
        throw new Error('Cannot add items to completed repair orders');
      }

      const totalPrice = parseFloat(quantity) * parseFloat(unit_price);

      // Add item
      const itemResult = await client.query(
        `INSERT INTO repair_order_items (
          item_id, repair_order_id, type, description, quantity,
          unit_price, total_price, part_id, labor_hours
        ) VALUES (
          gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8
        ) RETURNING *`,
        [
          id,
          type,
          description,
          quantity,
          unit_price,
          totalPrice,
          part_id || null,
          labor_hours || null
        ]
      );

      // Update part inventory if part item
      if (type === 'part' && part_id) {
        await client.query(
          'UPDATE parts SET quantity_on_hand = quantity_on_hand - $1, updated_at = NOW() WHERE part_id = $2',
          [quantity, part_id]
        );
      }

      // Recalculate repair order totals
      const allItems = await client.query(
        'SELECT * FROM repair_order_items WHERE repair_order_id = $1',
        [id]
      );

      const totals = calculateRepairOrderTotal(allItems.rows);

      await client.query(
        `UPDATE repair_orders 
         SET labor_total = $1, parts_total = $2, tax = $3, total_amount = $4, updated_at = NOW()
         WHERE repair_order_id = $5`,
        [totals.laborTotal, totals.partsTotal, totals.tax, totals.total, id]
      );

      return itemResult.rows[0];
    });

    return NextResponse.json(
      {
        success: true,
        data: result,
        message: 'Item added successfully'
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in POST /api/service/repair-orders/[id]/items:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to add item' },
      { status: 500 }
    );
  }
}