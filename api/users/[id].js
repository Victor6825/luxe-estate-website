import { sql } from '@vercel/postgres';
import { authenticateRequest, hashPassword } from '../../lib/auth.js';
import { parseBody } from '../../lib/http.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'User ID is required' });

  try {
    await authenticateRequest(req, ['admin']);

    switch (req.method) {
      case 'PUT':
        return await updateUser(req, res, id);
      case 'DELETE':
        return await deleteUser(res, id);
      default:
        res.setHeader('Allow', ['PUT', 'DELETE']);
        return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.message || 'Server error' });
  }
}

async function updateUser(req, res, id) {
  const { name, role, password } = parseBody(req);
  const updates = [];
  const values = [];
  let paramCount = 0;

  if (name) {
    paramCount++;
    updates.push(`name = $${paramCount}`);
    values.push(name);
  }
  if (role) {
    paramCount++;
    updates.push(`role = $${paramCount}`);
    values.push(role);
  }
  if (password) {
    paramCount++;
    const hash = await hashPassword(password);
    updates.push(`password_hash = $${paramCount}`);
    values.push(hash);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  paramCount++;
  values.push(id);

  const query = `UPDATE users SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${paramCount} RETURNING id, name, email, role, created_at`;
  const result = await sql.unsafe(query, values);

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'User not found' });
  }

  return res.status(200).json({ user: result.rows[0] });
}

async function deleteUser(res, id) {
  const result = await sql`DELETE FROM users WHERE id = ${id} RETURNING id`;
  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'User not found' });
  }
  return res.status(200).json({ success: true });
}

