import { sql } from '@vercel/postgres';
import { authenticateRequest } from '../../lib/auth.js';
import { parseBody } from '../../lib/http.js';
import { sendSubmissionNotification } from '../../lib/email.js';

export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    switch (req.method) {
      case 'GET': {
        await authenticateRequest(req, ['admin', 'editor']);
        return await getSubmissions(req, res);
      }
      case 'POST':
        return await createSubmission(req, res);
      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}

async function getSubmissions(req, res) {
  try {
    const result = await sql`SELECT * FROM submissions ORDER BY created_at DESC LIMIT 100`;
    return res.status(200).json({ submissions: result.rows });
  } catch (error) {
    console.error('Get submissions error:', error);
    return res.status(500).json({ error: 'Failed to fetch submissions' });
  }
}

async function createSubmission(req, res) {
  try {
    const { name, email, phone, service, message, formType } = parseBody(req);

    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

    const result = await sql`
      INSERT INTO submissions (name, email, phone, service, message, form_type, created_at)
      VALUES (${name}, ${email}, ${phone || null}, ${service || null}, ${message || null}, ${formType || 'contact'}, NOW())
      RETURNING *
    `;

    const submission = result.rows[0];

    await sendSubmissionNotification(submission);

    return res.status(201).json({ 
      success: true,
      message: 'Submission received successfully',
      submission
    });
  } catch (error) {
    console.error('Create submission error:', error);
    return res.status(500).json({ error: 'Failed to create submission' });
  }
}

