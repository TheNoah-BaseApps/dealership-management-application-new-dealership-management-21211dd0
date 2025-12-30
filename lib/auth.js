import { verifyToken, getTokenFromRequest } from './jwt';
import { query } from './db';

export async function authenticate(request) {
  try {
    const token = getTokenFromRequest(request);
    
    if (!token) {
      return { authenticated: false, user: null };
    }

    const payload = await verifyToken(token);
    
    if (!payload || !payload.userId) {
      return { authenticated: false, user: null };
    }

    const result = await query(
      'SELECT id, email, name, role, phone FROM users WHERE id = $1',
      [payload.userId]
    );

    if (result.rows.length === 0) {
      return { authenticated: false, user: null };
    }

    return {
      authenticated: true,
      user: result.rows[0]
    };
  } catch (error) {
    console.error('Authentication error:', error);
    return { authenticated: false, user: null };
  }
}

export async function requireAuth(request) {
  const { authenticated, user } = await authenticate(request);
  
  if (!authenticated) {
    throw new Error('Unauthorized');
  }
  
  return user;
}

export async function getUserFromRequest(request) {
  const { user } = await authenticate(request);
  return user;
}