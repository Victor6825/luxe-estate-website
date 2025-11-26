import { createUploadUrl } from '@vercel/blob';
import { authenticateRequest } from '../../lib/auth.js';
import { parseBody } from '../../lib/http.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await authenticateRequest(req, ['admin', 'editor']);
    const { contentType = 'image/jpeg', pathname = `properties/${Date.now()}` } = parseBody(req);

    const uploadUrl = await createUploadUrl({
      contentType,
      pathname,
      access: 'public',
    });

    return res.status(200).json({ uploadUrl });
  } catch (error) {
    console.error('Blob upload URL error:', error);
    return res.status(500).json({ error: 'Failed to create upload URL' });
  }
}

