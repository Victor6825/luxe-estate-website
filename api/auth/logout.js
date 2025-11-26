import cookie from 'cookie';
import { clearAuthCookies, revokeRefreshToken } from '../../lib/auth.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const cookies = cookie.parse(req.headers.cookie || '');
    const refreshToken = cookies['luxeestate_refresh'];
    if (refreshToken) {
      await revokeRefreshToken(refreshToken);
    }
    res.setHeader('Set-Cookie', clearAuthCookies());
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({ error: 'Failed to logout' });
  }
}

