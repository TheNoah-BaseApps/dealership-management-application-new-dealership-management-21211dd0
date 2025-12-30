/**
 * @swagger
 * /api/documents:
 *   get:
 *     summary: Get all documents
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Documents retrieved successfully
 *   post:
 *     summary: Upload document
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Document uploaded successfully
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { query } from '@/lib/db';
import { validateRequiredFields, sanitizeInput } from '@/lib/validation';
import { checkPermission } from '@/lib/permissions';

export async function GET(request) {
  try {
    const user = await requireAuth(request);
    checkPermission(user, 'VIEW_DOCUMENTS');

    const { searchParams } = new URL(request.url);
    const referenceId = searchParams.get('reference_id');
    const referenceType = searchParams.get('reference_type');

    let queryText = `
      SELECT d.*, u.name as uploaded_by_name
      FROM documents d
      LEFT JOIN users u ON d.uploaded_by = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (referenceId) {
      queryText += ` AND d.reference_id = $${paramIndex}`;
      params.push(referenceId);
      paramIndex++;
    }

    if (referenceType) {
      queryText += ` AND d.reference_type = $${paramIndex}`;
      params.push(referenceType);
      paramIndex++;
    }

    queryText += ' ORDER BY d.upload_date DESC';

    const result = await query(queryText, params);

    return NextResponse.json(
      {
        success: true,
        data: result.rows,
        message: 'Documents retrieved successfully'
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in GET /api/documents:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to retrieve documents' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const user = await requireAuth(request);
    checkPermission(user, 'UPLOAD_DOCUMENTS');

    const body = await request.json();
    const { type, reference_id, reference_type, file_name, file_path, description } = body;

    const missing = validateRequiredFields(body, ['type', 'file_name', 'file_path']);
    if (missing) {
      return NextResponse.json(
        { success: false, error: `Missing required fields: ${missing.join(', ')}` },
        { status: 400 }
      );
    }

    const result = await query(
      `INSERT INTO documents (
        document_id, type, reference_id, reference_type, file_name,
        file_path, uploaded_by, upload_date, description
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW(), $7
      ) RETURNING *`,
      [
        sanitizeInput(type),
        reference_id || null,
        sanitizeInput(reference_type) || null,
        sanitizeInput(file_name),
        sanitizeInput(file_path),
        user.id,
        sanitizeInput(description) || null
      ]
    );

    return NextResponse.json(
      {
        success: true,
        data: result.rows[0],
        message: 'Document uploaded successfully'
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in POST /api/documents:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to upload document' },
      { status: 500 }
    );
  }
}