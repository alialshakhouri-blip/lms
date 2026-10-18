// Vercel Serverless Function: api/lms-sync.js
// Handles cloud synchronization for LMS courses, modules, and weeks with Supabase

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '15mb'
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

  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '').trim().replace(/\/+$/, '');
  const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '').trim();

  if (!supabaseUrl || !supabaseKey) {
    return res.status(200).json({
      success: false,
      isConfigured: false,
      message: 'Supabase credentials are not configured on Vercel yet.'
    });
  }

  const headers = {
    'Authorization': `Bearer ${supabaseKey}`,
    'apikey': supabaseKey,
    'Content-Type': 'application/json'
  };

  // ─── GET: Fetch all LMS Courses from Supabase ─────────────────────────────
  if (req.method === 'GET') {
    try {
      const url = `${supabaseUrl}/rest/v1/lms_courses?select=*&order=updated_at.desc`;
      const response = await fetch(url, { headers });

      if (!response.ok) {
        const errText = await response.text();
        return res.status(response.status).json({
          success: false,
          error: `Supabase query failed: ${errText}`
        });
      }

      const rows = await response.json();
      const coursesMap = {};
      for (const row of rows) {
        const key = row.course_key || row.id;
        coursesMap[key] = {
          courseTitle: row.title,
          trainerName: row.trainer_name,
          courseCode: row.course_code,
          weeks: row.weeks || [],
          metadata: row.metadata || {}
        };
      }

      return res.status(200).json({
        success: true,
        count: rows.length,
        courses: coursesMap
      });

    } catch (err) {
      console.error('lms-sync GET error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // ─── POST: Upsert LMS Course(s) to Supabase ──────────────────────────────
  if (req.method === 'POST') {
    try {
      const { courseKey, courseData, allCourses } = req.body || {};

      const rowsToUpsert = [];

      if (allCourses && typeof allCourses === 'object') {
        for (const [key, data] of Object.entries(allCourses)) {
          if (data && typeof data === 'object') {
            rowsToUpsert.push({
              id: key,
              course_key: key,
              title: data.courseTitle || key,
              trainer_name: data.trainerName || '',
              course_code: data.courseCode || '',
              weeks: Array.isArray(data.weeks) ? data.weeks : [],
              metadata: data.metadata || {},
              updated_at: new Date().toISOString()
            });
          }
        }
      } else if (courseKey && courseData) {
        rowsToUpsert.push({
          id: courseKey,
          course_key: courseKey,
          title: courseData.courseTitle || courseKey,
          trainer_name: courseData.trainerName || '',
          course_code: courseData.courseCode || '',
          weeks: Array.isArray(courseData.weeks) ? courseData.weeks : [],
          metadata: courseData.metadata || {},
          updated_at: new Date().toISOString()
        });
      } else {
        return res.status(400).json({
          success: false,
          error: 'بيانات الحفظ مفقودة. يرجى توفير courseKey و courseData أو allCourses.'
        });
      }

      const upsertUrl = `${supabaseUrl}/rest/v1/lms_courses?on_conflict=course_key`;
      const response = await fetch(upsertUrl, {
        method: 'POST',
        headers: {
          ...headers,
          'Prefer': 'resolution=merge-duplicates,return=representation'
        },
        body: JSON.stringify(rowsToUpsert)
      });

      if (!response.ok) {
        const errText = await response.text();
        return res.status(response.status).json({
          success: false,
          error: `فشل الحفظ في قاعدة بيانات Supabase: ${errText}`
        });
      }

      const saved = await response.json();
      return res.status(200).json({
        success: true,
        upsertedCount: rowsToUpsert.length,
        saved
      });

    } catch (err) {
      console.error('lms-sync POST error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  return res.status(405).json({ success: false, error: 'Method Not Allowed' });
}
