import { sql } from '@vercel/postgres';
import { authenticateRequest } from '../../lib/auth.js';
import { parseBody } from '../../lib/http.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { slug } = req.query;
  if (!slug) {
    return res.status(400).json({ error: 'Slug is required' });
  }

  try {
    switch (req.method) {
      case 'GET':
        return await getBlock(slug, res);
      case 'PUT': {
        const user = await authenticateRequest(req, ['admin', 'editor']);
        return await updateBlock(req, res, slug, user);
      }
      case 'DELETE': {
        await authenticateRequest(req, ['admin']);
        return await deleteBlock(res, slug);
      }
      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
        return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
  } catch (error) {
    console.error('Content block detail error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function getBlock(slug, res) {
  const result = await sql`SELECT * FROM content_blocks WHERE slug = ${slug} LIMIT 1`;
  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Content block not found' });
  }
  return res.status(200).json({ block: result.rows[0] });
}

async function updateBlock(req, res, slug, user) {
  const { title, content, published } = parseBody(req);
  const updates = [];
  const values = [];
  let paramCount = 0;

  if (title !== undefined) {
    paramCount++;
    updates.push(`title = $${paramCount}`);
    values.push(title);
  }
  if (content !== undefined) {
    paramCount++;
    updates.push(`content = $${paramCount}`);
    values.push(JSON.stringify(content));
  }
  if (published !== undefined) {
    paramCount++;
    updates.push(`published = $${paramCount}`);
    values.push(published);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  updates.push(`updated_by = $${paramCount + 1}`);
  values.push(user.id);
  paramCount++;

  const query = `UPDATE content_blocks SET ${updates.join(', ')}, updated_at = NOW() WHERE slug = $${paramCount + 1} RETURNING *`;
  values.push(slug);

  const result = await sql.unsafe(query, values);

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Content block not found' });
  }

  return res.status(200).json({ block: result.rows[0] });
}

async function deleteBlock(res, slug) {
  const result = await sql`DELETE FROM content_blocks WHERE slug = ${slug} RETURNING slug`;
  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Content block not found' });
  }
  return res.status(200).json({ success: true });
}

