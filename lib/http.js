export function parseBody(req) {
  if (!req.body) {
    return {};
  }

  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch (error) {
      return {};
    }
  }

  return req.body;
}

export function success(res, data, status = 200) {
  res.status(status).json({ success: true, ...data });
}

export function error(res, statusCode, message) {
  res.status(statusCode).json({ success: false, error: message });
}

