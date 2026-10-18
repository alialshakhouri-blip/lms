// Vercel Serverless Function: api/upload-file.js
// Uploads PPTX, PDF, and educational materials to Supabase Storage (bucket: 'lms-files')
// Returns a permanent, publicly accessible URL for permanent LMS archiving

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '25mb'
    }
  },
  maxDuration: 60
};

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed. Use POST.' });
  }

  try {
    const { filename, fileType, base64, courseKey, weekId, uploadedBy } = req.body || {};

    if (!base64 || !filename) {
      return res.status(400).json({
        success: false,
        error: 'بيانات الملف غير مكتملة (اسم الملف أو المحتوى Base64 مفقود).'
      });
    }

    const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '').trim().replace(/\/+$/, '');
    const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '').trim();

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({
        success: false,
        error: 'متغيرات بيئة Supabase غير معينة في Vercel (NEXT_PUBLIC_SUPABASE_URL و NEXT_PUBLIC_SUPABASE_ANON_KEY).'
      });
    }

    // Prepare buffer
    const fileBuffer = Buffer.from(base64, 'base64');
    const cleanFilename = filename.replace(/[^a-zA-Z0-9._\-\u0600-\u06FF]/g, '_');
    const folder = courseKey ? encodeURIComponent(courseKey.replace(/[^a-zA-Z0-9_\u0600-\u06FF]/g, '_')) : 'general';
    const uniquePath = `courses/${folder}/${Date.now()}_${cleanFilename}`;

    const mime = fileType || (filename.toLowerCase().endsWith('.pdf') 
      ? 'application/pdf' 
      : 'application/vnd.openxmlformats-officedocument.presentationml.presentation');

    // 1. Upload to Supabase Storage Bucket ('lms-files')
    const uploadUrl = `${supabaseUrl}/storage/v1/object/lms-files/${uniquePath}`;
    const uploadRes = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey,
        'Content-Type': mime,
        'x-upsert': 'true'
      },
      body: fileBuffer
    });

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      console.error('Supabase Storage upload error:', errText);
      throw new Error(`فشل رفع الملف إلى Supabase Storage: ${uploadRes.status} - ${errText}`);
    }

    // Permanent public URL
    const publicUrl = `${supabaseUrl}/storage/v1/object/public/lms-files/${uniquePath}`;

    // 2. Record metadata in lms_files table (fire-and-forget / non-blocking)
    try {
      const dbUrl = `${supabaseUrl}/rest/v1/lms_files`;
      await fetch(dbUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'apikey': supabaseKey,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify({
          id: 'file_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
          filename: cleanFilename,
          file_type: mime,
          file_size: fileBuffer.length,
          storage_path: uniquePath,
          public_url: publicUrl,
          course_key: courseKey || null,
          week_id: weekId || null,
          uploaded_by: uploadedBy || 'Trainer'
        })
      });
    } catch (dbErr) {
      console.warn('lms_files table insert warning (table might need creation):', dbErr);
    }

    return res.status(200).json({
      success: true,
      publicUrl,
      storagePath: uniquePath,
      filename: cleanFilename,
      sizeBytes: fileBuffer.length,
      sizeKB: Math.round(fileBuffer.length / 1024)
    });

  } catch (err) {
    console.error('api/upload-file fatal error:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'حدث خطأ داخلي أثناء رفع الملف إلى التخزين السحابي.'
    });
  }
}
