/**
 * @swagger
 * /api/ai/engagement-recommendations:
 *   post:
 *     summary: Get customer engagement suggestions
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Recommendations generated
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { query } from '@/lib/db';
import { generateEngagementRecommendations } from '@/lib/ai';
import { checkPermission } from '@/lib/permissions';

export async function POST(request) {
  try {
    const user = await requireAuth(request);
    checkPermission(user, 'VIEW_CUSTOMERS');

    const body = await request.json();
    const { customer_id } = body;

    if (!customer_id) {
      return NextResponse.json(
        { success: false, error: 'customer_id is required' },
        { status: 400 }
      );
    }

    // Get customer
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

    // Get customer history
    const purchasesResult = await query(
      'SELECT * FROM sales WHERE customer_id = $1 ORDER BY sale_date DESC',
      [customer_id]
    );

    const servicesResult = await query(
      'SELECT * FROM service_history WHERE customer_id = $1 ORDER BY service_date DESC',
      [customer_id]
    );

    const communicationsResult = await query(
      'SELECT * FROM communications WHERE customer_id = $1 ORDER BY sent_date DESC',
      [customer_id]
    );

    const history = {
      purchases: purchasesResult.rows,
      services: servicesResult.rows,
      communications: communicationsResult.rows
    };

    const recommendations = await generateEngagementRecommendations(customer, history);

    return NextResponse.json(
      {
        success: true,
        data: {
          customer,
          recommendations
        },
        message: 'Engagement recommendations generated successfully'
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in POST /api/ai/engagement-recommendations:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to generate recommendations' },
      { status: 500 }
    );
  }
}