import cookie from 'cookie';
import { verifyRefreshToken, generateAccessToken, generateRefreshToken, serializeAuthCookies, storeRefreshToken, revokeRefreshToken } from '../../lib/auth.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const cookies = cookie.parse(req.headers.cookie || '');
    const refreshToken = cookies['luxeestate_refresh'];

    const stored = await verifyRefreshToken(refreshToken);

    if (!stored) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    // Rotate refresh token
    await revokeRefreshToken(refreshToken);
    const newRefresh = generateRefreshToken();
    await storeRefreshToken(stored.user_id, newRefresh);

    const user = {
      id: stored.user_id,
      email: stored.email,
      role: stored.role,
      name: stored.name,
    };

    const newAccess = generateAccessToken(user);
    res.setHeader('Set-Cookie', serializeAuthCookies(newAccess, newRefresh));

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Refresh token error:', error);
    return res.status(500).json({ error: 'Failed to refresh token' });
  }
}

