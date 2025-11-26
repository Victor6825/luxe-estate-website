export default async function handler(req, res) {
  return res.status(200).json({ 
    status: 'ok',
    message: 'LuxeEstate API is running',
    timestamp: new Date().toISOString()
  });
}

