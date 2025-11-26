import { sql } from '@vercel/postgres';
import { authenticateRequest } from '../../lib/auth.js';
import { parseBody } from '../../lib/http.js';

export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Property ID is required' });
  }

  try {
    switch (req.method) {
      case 'GET':
        return await getProperty(req, res, id);
      case 'PUT': {
        const user = await authenticateRequest(req, ['admin', 'editor']);
        return await updateProperty(req, res, id, user);
      }
      case 'DELETE': {
        await authenticateRequest(req, ['admin']);
        return await deleteProperty(req, res, id);
      }
      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
        return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}

async function getProperty(req, res, id) {
  try {
    const result = await sql`SELECT * FROM properties WHERE id = ${id}`;
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Property not found' });
    }

    return res.status(200).json({ property: result.rows[0] });
  } catch (error) {
    console.error('Get property error:', error);
    return res.status(500).json({ error: 'Failed to fetch property' });
  }
}

async function updateProperty(req, res, id, user) {
  try {
    const { title, location, type, price, bedrooms, bathrooms, sqft, description, image, status, featured } = parseBody(req);

    const updates = [];
    const values = [];
    let paramCount = 0;

    if (title !== undefined) {
      paramCount++;
      updates.push(`title = $${paramCount}`);
      values.push(title);
    }
    if (location !== undefined) {
      paramCount++;
      updates.push(`location = $${paramCount}`);
      values.push(location);
    }
    if (type !== undefined) {
      paramCount++;
      updates.push(`type = $${paramCount}`);
      values.push(type);
    }
    if (price !== undefined) {
      paramCount++;
      updates.push(`price = $${paramCount}`);
      values.push(price);
    }
    if (bedrooms !== undefined) {
      paramCount++;
      updates.push(`bedrooms = $${paramCount}`);
      values.push(bedrooms);
    }
    if (bathrooms !== undefined) {
      paramCount++;
      updates.push(`bathrooms = $${paramCount}`);
      values.push(bathrooms);
    }
    if (sqft !== undefined) {
      paramCount++;
      updates.push(`sqft = $${paramCount}`);
      values.push(sqft);
    }
    if (description !== undefined) {
      paramCount++;
      updates.push(`description = $${paramCount}`);
      values.push(description);
    }
    if (image !== undefined) {
      paramCount++;
      updates.push(`image = $${paramCount}`);
      values.push(image);
    }
    if (status !== undefined) {
      paramCount++;
      updates.push(`status = $${paramCount}`);
      values.push(status);
    }
    if (typeof featured === 'boolean') {
      paramCount++;
      updates.push(`featured = $${paramCount}`);
      values.push(featured);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    paramCount++;
    values.push(id);

    // Use sql.unsafe for dynamic queries
    const setClause = updates.join(', ');
    updates.push(`updated_by = $${paramCount + 1}`);
    values.push(user.id);
    paramCount++;

    const query = `UPDATE properties SET ${setClause}, updated_at = NOW() WHERE id = $${paramCount + 1} RETURNING *`;
    values.push(id);
    const result = await sql.unsafe(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Property not found' });
    }

    return res.status(200).json({ property: result.rows[0] });
  } catch (error) {
    console.error('Update property error:', error);
    return res.status(500).json({ error: 'Failed to update property' });
  }
}

async function deleteProperty(req, res, id) {
  try {
    const result = await sql`DELETE FROM properties WHERE id = ${id} RETURNING *`;

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Property not found' });
    }

    return res.status(200).json({ message: 'Property deleted successfully', property: result.rows[0] });
  } catch (error) {
    console.error('Delete property error:', error);
    return res.status(500).json({ error: 'Failed to delete property' });
  }
}

