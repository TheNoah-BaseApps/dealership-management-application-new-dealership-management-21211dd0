/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Authenticate user and return JWT token
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
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: MySecurePassword123
 *     responses:
 *       200:
 *         description: Login successful
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
 *                           type: integer
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
 *                   example: Login successful
 *       400:
 *         description: Invalid request - missing or invalid fields
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
 *                   example: Email and password are required
 *       401:
 *         description: Invalid credentials
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
 *                   example: Invalid email or password
 *       500:
 *         description: Server error
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
 *                   example: Failed to login
 */

import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { query } from '@/lib/db';
import { signToken } from '@/lib/jwt';
import { validateEmail } from '@/lib/validation';
import { logLogin } from '@/lib/audit';

export async function POST(request) {
  try {
    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error('Error parsing request body in POST /api/auth/login:', parseError);
      return NextResponse.json(
        { success: false, error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const { email, password } = body;

    // Validate required fields
    if (!email || !password) {
      console.error('Login attempt with missing fields:', { hasEmail: !!email, hasPassword: !!password });
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Validate email format
    if (!validateEmail(email)) {
      console.error('Login attempt with invalid email format:', email);
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Find user by email
    let result;
    try {
      result = await query(
        'SELECT id, email, password, name, role, phone FROM users WHERE email = $1',
        [email.toLowerCase()]
      );
    } catch (dbError) {
      console.error('Database error while fetching user in POST /api/auth/login:', dbError);
      return NextResponse.json(
        { success: false, error: 'Failed to login' },
        { status: 500 }
      );
    }

    // Check if user exists
    if (!result.rows || result.rows.length === 0) {
      console.error('Login attempt for non-existent user:', email);
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const user = result.rows[0];

    // Verify password exists
    if (!user.password) {
      console.error('User account has no password set:', email);
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Verify password using bcrypt
    let validPassword;
    try {
      validPassword = await bcrypt.compare(password, user.password);
    } catch (bcryptError) {
      console.error('Error comparing passwords in POST /api/auth/login:', bcryptError);
      return NextResponse.json(
        { success: false, error: 'Failed to verify credentials' },
        { status: 500 }
      );
    }

    if (!validPassword) {
      console.error('Invalid password attempt for user:', email);
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Generate JWT token
    let token;
    try {
      token = await signToken({
        userId: user.id,
        email: user.email,
        role: user.role
      });
    } catch (tokenError) {
      console.error('Error generating JWT token in POST /api/auth/login:', tokenError);
      return NextResponse.json(
        { success: false, error: 'Failed to generate authentication token' },
        { status: 500 }
      );
    }

    // Log successful login
    try {
      await logLogin(user.id, request);
    } catch (logError) {
      console.error('Error logging login in POST /api/auth/login:', logError);
      // Continue execution - logging failure shouldn't prevent login
    }

    // Remove password from response
    delete user.password;

    return NextResponse.json(
      {
        success: true,
        data: {
          user,
          token
        },
        message: 'Login successful'
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Unexpected error in POST /api/auth/login:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to login' },
      { status: 500 }
    );
  }
}