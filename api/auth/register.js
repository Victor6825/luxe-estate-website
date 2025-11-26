import { sql } from '@vercel/postgres';
import { hashPassword, getUserByEmail, issueAuthCookies, authenticateRequest, AuthError } from '../../lib/auth.js';
import { parseBody } from '../../lib/http.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { name, email, password, role = 'viewer' } = parseBody(req);

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ error: 'User already exists' });
    }

    const { rows } = await sql`SELECT COUNT(*)::int AS total FROM users`;
    const totalUsers = rows[0]?.total || 0;

    let assignedRole = role;

    if (totalUsers === 0) {
      assignedRole = 'admin';
    } else {
      const requester = await authenticateRequest(req, ['admin']);
      if (requester.role !== 'admin') {
        return res.status(403).json({ error: 'Only admins can create users' });
      }
      if (!['admin', 'editor', 'viewer'].includes(role)) {
        assignedRole = 'viewer';
      }
    }

    const passwordHash = await hashPassword(password);
    const result = await sql`
      INSERT INTO users (name, email, password_hash, role)
      VALUES (${name}, ${email.toLowerCase()}, ${passwordHash}, ${assignedRole})
      RETURNING id, name, email, role, created_at
    `;

    const user = result.rows[0];

    // Automatically sign in first user
    if (totalUsers === 0) {
      await issueAuthCookies(res, user);
    }

    return res.status(201).json({ user });
  } catch (error) {
    if (error instanceof AuthError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error('Register error:', error);
    return res.status(500).json({ error: 'Failed to create user' });
  }
}

