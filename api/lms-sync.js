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
        const meta = row.metadata || {};
        coursesMap[key] = {
          courseTitle: row.title,
          trainer: row.trainer_name || meta.trainer || '',
          trainerName: row.trainer_name || meta.trainer || '',
          courseCode: row.course_code,
          room: meta.room || '',
          description: meta.description || '',
          weeks: row.weeks || [],
          metadata: meta
        };
      }

      // Also retrieve globally registered deleted item IDs (tombstones) from app_sync_state
      let deletedItemIds = [];
      try {
        const delRes = await fetch(`${supabaseUrl}/rest/v1/app_sync_state?key=eq.lms_deleted_items_v1&select=*`, { headers });
        if (delRes.ok) {
          const delRows = await delRes.json();
          if (delRows && delRows[0] && Array.isArray(delRows[0].data)) {
            deletedItemIds = delRows[0].data;
          }
        }
      } catch (delErr) {
        console.warn('Failed to fetch deleted items from cloud:', delErr);
      }

      return res.status(200).json({
        success: true,
        count: rows.length,
        courses: coursesMap,
        deletedItemIds
      });

    } catch (err) {
      console.error('lms-sync GET error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // ─── POST: Upsert LMS Course(s) to Supabase ──────────────────────────────
  if (req.method === 'POST') {
    try {
      const { courseKey, courseData, allCourses, deletedItemIds } = req.body || {};

      // If client sent deleted item IDs to persist in cloud tombstone
      if (Array.isArray(deletedItemIds) && deletedItemIds.length > 0) {
        try {
          await fetch(`${supabaseUrl}/rest/v1/app_sync_state?on_conflict=key`, {
            method: 'POST',
            headers: {
              ...headers,
              'Prefer': 'resolution=merge-duplicates,return=minimal'
            },
            body: JSON.stringify([{
              key: 'lms_deleted_items_v1',
              data: deletedItemIds,
              updated_at: new Date().toISOString()
            }])
          });
        } catch (delSaveErr) {
          console.warn('Failed to save deleted items to app_sync_state:', delSaveErr);
        }
      }

      const rowsToUpsert = [];

      if (allCourses && typeof allCourses === 'object') {
        for (const [key, data] of Object.entries(allCourses)) {
          if (data && typeof data === 'object') {
            const trName = data.trainerName || data.trainer || '';
            const meta = { ...(data.metadata || {}), room: data.room || data.metadata?.room || '', trainer: trName, description: data.description || '' };
            rowsToUpsert.push({
              id: key,
              course_key: key,
              title: data.courseTitle || key,
              trainer_name: trName,
              course_code: data.courseCode || '',
              weeks: Array.isArray(data.weeks) ? data.weeks : [],
              metadata: meta,
              updated_at: new Date().toISOString()
            });
          }
        }
      } else if (courseKey && courseData) {
        const trName = courseData.trainerName || courseData.trainer || '';
        const meta = { ...(courseData.metadata || {}), room: courseData.room || courseData.metadata?.room || '', trainer: trName, description: courseData.description || '' };
        rowsToUpsert.push({
          id: courseKey,
          course_key: courseKey,
          title: courseData.courseTitle || courseKey,
          trainer_name: trName,
          course_code: courseData.courseCode || '',
          weeks: Array.isArray(courseData.weeks) ? courseData.weeks : [],
          metadata: meta,
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
