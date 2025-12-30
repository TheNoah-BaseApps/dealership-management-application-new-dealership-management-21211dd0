/**
 * @swagger
 * /api/ai/lead-scoring:
 *   post:
 *     summary: AI-powered lead scoring
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lead scoring completed
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { query } from '@/lib/db';
import { scoreLeads } from '@/lib/ai';
import { checkPermission } from '@/lib/permissions';

export async function POST(request) {
  try {
    const user = await requireAuth(request);
    checkPermission(user, 'VIEW_LEADS');

    const body = await request.json();
    const { lead_ids } = body;

    let leadsResult;
    if (lead_ids && lead_ids.length > 0) {
      leadsResult = await query(
        'SELECT * FROM leads WHERE lead_id = ANY($1)',
        [lead_ids]
      );
    } else {
      leadsResult = await query(
        'SELECT * FROM leads WHERE lead_status IN ($1, $2)',
        ['New', 'Contacted']
      );
    }

    const scoredLeads = await scoreLeads(leadsResult.rows);

    return NextResponse.json(
      {
        success: true,
        data: scoredLeads,
        message: 'Lead scoring completed successfully'
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in POST /api/ai/lead-scoring:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to score leads' },
      { status: 500 }
    );
  }
}