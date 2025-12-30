/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - name
 *               - role
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email address
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 6
 *                 description: User's password (will be hashed)
 *               name:
 *                 type: string
 *                 description: User's full name
 *               role:
 *                 type: string
 *                 enum: [admin, dispatcher, driver]
 *                 description: User's role in the system
 *               phone:
 *                 type: string
 *                 description: User's phone number (optional)
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         email:
 *                           type: string
 *                         name:
 *                           type: string
 *                         role:
 *                           type: string
 *                         phone:
 *                           type: string
 *                     token:
 *                       type: string
 *                       description: JWT authentication token
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid input - missing required fields or invalid format
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *       409:
 *         description: User with this email already exists
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *       500:
 *         description: Server error during registration
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 */

import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { query } from '@/lib/db';
import { signToken } from '@/lib/jwt';
import { validateEmail, validateRequiredFields, validateRole, sanitizeInput } from '@/lib/validation';

export async function POST(request) {
  try {
    const body = await request.json();
    const { email, password, name, role, phone } = body;

    // Validate required fields
    const missing = validateRequiredFields(body, ['email', 'password', 'name', 'role']);
    if (missing) {
      console.error('Registration failed: Missing required fields -', missing.join(', '));
      return NextResponse.json(
        { success: false, error: `Missing required fields: ${missing.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate email format
    if (!validateEmail(email)) {
      console.error('Registration failed: Invalid email format -', email);
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate password strength
    if (!password || password.length < 6) {
      console.error('Registration failed: Password too short');
      return NextResponse.json(
        { success: false, error: 'Password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    // Validate role
    if (!validateRole(role)) {
      console.error('Registration failed: Invalid role -', role);
      return NextResponse.json(
        { success: false, error: 'Invalid role. Must be one of: admin, dispatcher, driver' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      console.error('Registration failed: User already exists -', email);
      return NextResponse.json(
        { success: false, error: 'User with this email already exists' },
        { status: 409 }
      );
    }

    // Hash password with bcrypt (salt rounds: 10)
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user with parameterized query to prevent SQL injection
    const result = await query(
      `INSERT INTO users (id, email, password, name, role, phone, created_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW())
       RETURNING id, email, name, role, phone, created_at`,
      [email.toLowerCase(), hashedPassword, sanitizeInput(name), role, phone || null]
    );

    const user = result.rows[0];

    // Generate JWT token for immediate authentication
    const token = await signToken({
      userId: user.id,
      email: user.email,
      role: user.role
    });

    console.log('User registered successfully:', { email: user.email, role: user.role });

    return NextResponse.json(
      {
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            phone: user.phone
          },
          token
        },
        message: 'User registered successfully'
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in POST /api/auth/register:', error);
    console.error('Error stack:', error.stack);
    return NextResponse.json(
      { success: false, error: 'Failed to register user. Please try again later.' },
      { status: 500 }
    );
  }
}