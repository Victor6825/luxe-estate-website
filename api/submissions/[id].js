import { sql } from '@vercel/postgres';
import { authenticateRequest } from '../../lib/auth.js';
import { parseBody } from '../../lib/http.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { id } = req.query;
  if (!id) {
    return res.status(400).json({ error: 'Submission ID is required' });
  }

  try {
    await authenticateRequest(req, ['admin', 'editor']);

    switch (req.method) {
      case 'PUT':
        return await updateSubmission(req, res, id);
      case 'DELETE':
        await authenticateRequest(req, ['admin']);
        return await deleteSubmission(req, res, id);
      default:
        res.setHeader('Allow', ['PUT', 'DELETE']);
        return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
  } catch (error) {
    console.error('Submission detail error:', error);
    return res.status(error.status || 500).json({ error: error.message || 'Server error' });
  }
}

async function updateSubmission(req, res, id) {
  const { status, notes, assigned_to } = parseBody(req);
  const updates = [];
  const values = [];
  let paramCount = 0;

  if (status) {
    paramCount++;
    updates.push(`status = $${paramCount}`);
    values.push(status);
  }
  if (notes !== undefined) {
    paramCount++;
    updates.push(`notes = $${paramCount}`);
    values.push(notes);
  }
  if (assigned_to !== undefined) {
    paramCount++;
    updates.push(`assigned_to = $${paramCount}`);
    values.push(assigned_to);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  paramCount++;
  values.push(id);

  const query = `UPDATE submissions SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${paramCount} RETURNING *`;
  const result = await sql.unsafe(query, values);

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Submission not found' });
  }

  return res.status(200).json({ submission: result.rows[0] });
}

async function deleteSubmission(req, res, id) {
  const result = await sql`DELETE FROM submissions WHERE id = ${id} RETURNING id`;
  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Submission not found' });
  }
  return res.status(200).json({ success: true });
}

