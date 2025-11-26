import { sql } from '@vercel/postgres';
import { authenticateRequest, hashPassword } from '../../lib/auth.js';
import { parseBody } from '../../lib/http.js';
import { getUserByEmail } from '../../lib/auth.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const currentUser = await authenticateRequest(req, ['admin']);

    switch (req.method) {
      case 'GET':
        return await listUsers(res);
      case 'POST':
        return await createUser(req, res);
      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.message || 'Server error' });
  }
}

async function listUsers(res) {
  const result = await sql`SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC`;
  return res.status(200).json({ users: result.rows });
}

async function createUser(req, res) {
  const { name, email, password, role = 'viewer' } = parseBody(req);
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required' });
  }

  const existing = await getUserByEmail(email.toLowerCase());
  if (existing) {
    return res.status(409).json({ error: 'User already exists' });
  }

  const passwordHash = await hashPassword(password);
  const result = await sql`
    INSERT INTO users (name, email, password_hash, role)
    VALUES (${name}, ${email.toLowerCase()}, ${passwordHash}, ${role})
    RETURNING id, name, email, role, created_at
  `;

  return res.status(201).json({ user: result.rows[0] });
}

