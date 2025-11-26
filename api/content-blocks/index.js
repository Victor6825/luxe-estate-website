import { sql } from '@vercel/postgres';
import { authenticateRequest } from '../../lib/auth.js';
import { parseBody } from '../../lib/http.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    switch (req.method) {
      case 'GET':
        return await getBlocks(req, res);
      case 'POST': {
        const user = await authenticateRequest(req, ['admin', 'editor']);
        return await createBlock(req, res, user);
      }
      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
  } catch (error) {
    console.error('Content block error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function getBlocks(req, res) {
  const { slug } = req.query;
  if (slug) {
    const result = await sql`SELECT * FROM content_blocks WHERE slug = ${slug} LIMIT 1`;
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Content block not found' });
    }
    return res.status(200).json({ block: result.rows[0] });
  }

  const result = await sql`SELECT * FROM content_blocks ORDER BY updated_at DESC`;
  return res.status(200).json({ blocks: result.rows });
}

async function createBlock(req, res, user) {
  const { slug, title, content, published = true } = parseBody(req);

  if (!slug || !content) {
    return res.status(400).json({ error: 'Slug and content are required' });
  }

  const result = await sql`
    INSERT INTO content_blocks (slug, title, content, updated_by, published, created_at, updated_at)
    VALUES (${slug}, ${title || null}, ${JSON.stringify(content)}, ${user.id}, ${published}, NOW(), NOW())
    ON CONFLICT (slug) DO UPDATE
      SET title = EXCLUDED.title,
          content = EXCLUDED.content,
          published = EXCLUDED.published,
          updated_by = ${user.id},
          updated_at = NOW()
    RETURNING *
  `;

  return res.status(200).json({ block: result.rows[0] });
}

