// Health check endpoint
export default function handler(req, res) {
  res.status(200).json({ status: 'ok', endpoint: '/api/salesmate-fetch' });
}
