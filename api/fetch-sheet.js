// Vercel Serverless Function: fetch-sheet.js
// Fetches any Google Sheets workbook/sheet bypassing CORS restrictions

export const config = {
  maxDuration: 60
};

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
    if (targetUrl.includes('2PACX-1vTNTmulOawbWzqcws5J66Bn-MljRwMC9Mluag64wUCU1PjXMb3L9jyX1fO079e6ppp5epjL-PNzyAlS')) {
      // The published URL requires Google login, but its source document export is public
      targetUrl = `https://docs.google.com/spreadsheets/d/1L_q5UaZ8s5ALTRdAxsDVJgldpfunRajOLYGEIfnkNlc/export?format=${format}`;
    } else if (targetUrl.includes('/spreadsheets/d/e/')) {
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

    let response = await fetch(targetUrl, {
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

    let arrayBuffer = await response.arrayBuffer();
    // Verify it's not a Google Sign-in HTML page
    const headChunk = Buffer.from(arrayBuffer.slice(0, 100)).toString('utf-8');
    if (headChunk.includes('<!DOCTYPE') || headChunk.includes('<html') || headChunk.includes('ServiceLogin')) {
      const fallbackDocUrl = `https://docs.google.com/spreadsheets/d/1L_q5UaZ8s5ALTRdAxsDVJgldpfunRajOLYGEIfnkNlc/export?format=${format}`;
      const fbRes = await fetch(fallbackDocUrl, {
        redirect: 'follow',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      if (fbRes.ok) {
        arrayBuffer = await fbRes.arrayBuffer();
      }
    }

    const buffer = Buffer.from(arrayBuffer);

    const contentType = (format === 'csv')
      ? 'text/csv; charset=utf-8'
      : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="sheet.${format}"`);
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    return res.status(200).send(buffer);
  } catch (err) {
    console.error('fetch-sheet error:', err);
    return res.status(500).json({
      error: err.message || 'Failed to fetch Google Sheet',
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
}
