import { sql } from '@vercel/postgres';
import { authenticateRequest } from '../../lib/auth.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await authenticateRequest(req, ['admin', 'editor']);

    const [{ rows: propertyRows }, { rows: submissionRows }, { rows: weeklyRows }] = await Promise.all([
      sql`SELECT COUNT(*)::int AS total FROM properties`,
      sql`SELECT COUNT(*)::int AS total FROM submissions`,
      sql`
        SELECT
          DATE_TRUNC('week', created_at) AS week,
          COUNT(*)::int AS inquiries
        FROM submissions
        WHERE created_at >= NOW() - INTERVAL '8 weeks'
        GROUP BY 1
        ORDER BY week ASC
      `,
    ]);

    return res.status(200).json({
      metrics: {
        totalProperties: propertyRows[0]?.total || 0,
        totalSubmissions: submissionRows[0]?.total || 0,
        weeklyInquiries: weeklyRows,
      },
    });
  } catch (error) {
    console.error('Dashboard metrics error:', error);
    return res.status(500).json({ error: 'Failed to load metrics' });
  }
}

