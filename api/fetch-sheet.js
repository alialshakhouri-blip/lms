// Vercel Serverless Function: fetch-sheet.js
// Fetches any Google Sheets workbook/sheet bypassing CORS restrictions

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { url, format = 'xlsx' } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'Missing "url" query parameter' });
  }

  try {
    let targetUrl = decodeURIComponent(url).trim();
    
    // Convert Google Sheet URLs (edit, view, or web-published) to direct export URLs
    if (targetUrl.includes('/spreadsheets/d/e/')) {
      if (targetUrl.includes('/pubhtml')) {
        targetUrl = targetUrl.replace('/pubhtml', `/pub?output=${format}`);
      } else if (targetUrl.includes('/pub')) {
        if (!targetUrl.includes('output=')) {
          targetUrl += targetUrl.includes('?') ? `&output=${format}` : `?output=${format}`;
        }
      } else {
        targetUrl = targetUrl.replace(/\/+$/, '') + `/pub?output=${format}`;
      }
    } else {
      const gMatch = targetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      if (gMatch && gMatch[1] && gMatch[1] !== 'e' && !targetUrl.includes('/pub?')) {
        targetUrl = `https://docs.google.com/spreadsheets/d/${gMatch[1]}/export?format=${format}`;
      }
    }

    const response = await fetch(targetUrl, {
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({
        error: `Google Sheets responded with HTTP status ${response.status}`,
        url: targetUrl
      });
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const contentType = (format === 'csv')
      ? 'text/csv; charset=utf-8'
      : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="sheet.${format}"`);
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
    return res.status(200).send(buffer);
  } catch (err) {
    console.error('fetch-sheet error:', err);
    return res.status(500).json({
      error: err.message || 'Failed to fetch Google Sheet',
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
}
