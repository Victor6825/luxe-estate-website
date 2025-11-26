import { sql } from '@vercel/postgres';
import { authenticateRequest } from '../../lib/auth.js';
import { parseBody } from '../../lib/http.js';

export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    switch (req.method) {
      case 'GET':
        return await getProperties(req, res);
      case 'POST': {
        const user = await authenticateRequest(req, ['admin', 'editor']);
        return await createProperty(req, res, user);
      }
      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}

async function getProperties(req, res) {
  try {
    const { location, type, priceRange, bedrooms } = req.query;
    
    // Build query with conditions
    let conditions = [];
    let values = [];

    if (location && location !== '') {
      conditions.push(`location = $${conditions.length + 1}`);
      values.push(location);
    }

    if (type && type !== '') {
      conditions.push(`type = $${conditions.length + 1}`);
      values.push(type);
    }

    if (bedrooms && bedrooms !== '') {
      conditions.push(`bedrooms >= $${conditions.length + 1}`);
      values.push(parseInt(bedrooms));
    }

    if (priceRange && priceRange !== '') {
      const [min, max] = priceRange.split('-').map(p => p.replace(/[^0-9]/g, ''));
      if (min) {
        conditions.push(`price >= $${conditions.length + 1}`);
        values.push(parseInt(min) * 1000000); // Convert millions to actual price
      }
      if (max && max !== '+') {
        conditions.push(`price <= $${conditions.length + 1}`);
        values.push(parseInt(max) * 1000000);
      }
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const query = `SELECT * FROM properties ${whereClause} ORDER BY created_at DESC`;
    
    // Use sql.unsafe for dynamic queries with parameters
    const result = values.length > 0
      ? await sql.unsafe(query, values)
      : await sql`SELECT * FROM properties ORDER BY created_at DESC`;
    
    return res.status(200).json({ properties: result.rows || [] });
  } catch (error) {
    console.error('Get properties error:', error);
    return res.status(500).json({ error: 'Failed to fetch properties' });
  }
}

async function createProperty(req, res, user) {
  try {
    const body = parseBody(req);
    const { title, location, type, price, bedrooms, bathrooms, sqft, description, image, status = 'draft', featured = false } = body;

    if (!title || !location || !type || !price) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await sql`
      INSERT INTO properties (title, location, type, price, bedrooms, bathrooms, sqft, description, image, status, featured, created_by, updated_by, created_at, updated_at)
      VALUES (${title}, ${location}, ${type}, ${price}, ${bedrooms || null}, ${bathrooms || null}, ${sqft || null}, ${description || null}, ${image || null}, ${status}, ${featured}, ${user.id}, ${user.id}, NOW(), NOW())
      RETURNING *
    `;

    return res.status(201).json({ property: result.rows[0] });
  } catch (error) {
    console.error('Create property error:', error);
    return res.status(500).json({ error: 'Failed to create property' });
  }
}

