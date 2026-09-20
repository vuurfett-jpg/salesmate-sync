export default async function handler(req, res) {
  const accessKey = process.env.SALESMATE_ACCESS_KEY;
  const secretKey = process.env.SALESMATE_SECRET_KEY;

  if (!accessKey || !secretKey) {
    return res.status(500).json({ error: 'Missing Salesmate credentials' });
  }

  const auth = Buffer.from(`${accessKey}:${secretKey}`).toString('base64');
  let allAccounts = [];
  let offset = 0;

  try {
    while (true) {
      const response = await fetch(
        `https://visionsalesgroup.salesmate.io/api/v2/accounts?offset=${offset}&limit=100`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Salesmate API returned ${response.status}`);
      }

      const data = await response.json();
      const accounts = data.data || [];

      if (!Array.isArray(accounts) || accounts.length === 0) break;

      allAccounts = allAccounts.concat(accounts);
      offset += 100;
    }

    return res.status(200).json({
      timestamp: new Date().toISOString(),
      totalAccounts: allAccounts.length,
      data: allAccounts,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
