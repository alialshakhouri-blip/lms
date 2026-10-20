// Vercel Serverless Function: api/submissions-sync.js
// Handles cloud synchronization for student quiz & assignment submissions, gradebooks, and app state with Supabase

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
      message: 'بيانات اعتماد Supabase غير متوفرة في متغيرات بيئة Vercel حالياً.'
    });
  }

  const headers = {
    'Authorization': `Bearer ${supabaseKey}`,
    'apikey': supabaseKey,
    'Content-Type': 'application/json'
  };

  // ─── GET: Fetch student submissions and gradebooks from Supabase ──────────
  if (req.method === 'GET') {
    try {
      // 1. Fetch individual submissions from `student_submissions`
      let submissionsList = [];
      try {
        const subRes = await fetch(`${supabaseUrl}/rest/v1/student_submissions?select=*&order=submitted_at.desc&limit=2000`, { headers });
        if (subRes.ok) {
          submissionsList = await subRes.json();
        }
      } catch (subErr) {
        console.warn('Failed to fetch from student_submissions table:', subErr);
      }

      // 1.1 Fetch from `quiz_submissions`
      let quizSubsFromTable = [];
      try {
        const qzRes = await fetch(`${supabaseUrl}/rest/v1/quiz_submissions?select=*&order=submitted_at.desc&limit=2000`, { headers });
        if (qzRes.ok) quizSubsFromTable = await qzRes.json();
      } catch (e) {}

      // 1.2 Fetch from `assignment_submissions`
      let assSubsFromTable = [];
      try {
        const asgRes = await fetch(`${supabaseUrl}/rest/v1/assignment_submissions?select=*&order=submitted_at.desc&limit=2000`, { headers });
        if (asgRes.ok) assSubsFromTable = await asgRes.json();
      } catch (e) {}

      // 1.3 Fetch from `cheating_logs`
      let cheatingFromTable = [];
      try {
        const chRes = await fetch(`${supabaseUrl}/rest/v1/cheating_logs?select=*&order=detected_at.desc&limit=1000`, { headers });
        if (chRes.ok) cheatingFromTable = await chRes.json();
      } catch (e) {}

      // 1.4 Fetch from `students`
      let studentsFromTable = [];
      try {
        const stRes = await fetch(`${supabaseUrl}/rest/v1/students?select=*&limit=3000`, { headers });
        if (stRes.ok) studentsFromTable = await stRes.json();
      } catch (e) {}

      // 1.5 Fetch from `delay_reports`
      let delayReportsFromTable = [];
      try {
        const delRes = await fetch(`${supabaseUrl}/rest/v1/delay_reports?select=*&order=created_at.desc&limit=1000`, { headers });
        if (delRes.ok) delayReportsFromTable = await delRes.json();
      } catch (e) {}

      // 2. Fetch shared state snapshots from `app_sync_state`
      let syncStates = {};
      try {
        const stateRes = await fetch(`${supabaseUrl}/rest/v1/app_sync_state?select=*`, { headers });
        if (stateRes.ok) {
          const rows = await stateRes.json();
          if (Array.isArray(rows)) {
            rows.forEach(r => {
              syncStates[r.key] = r.data;
            });
          }
        }
      } catch (stateErr) {
        console.warn('Failed to fetch from app_sync_state table:', stateErr);
      }

      // Transform submissionsList into dictionary maps
      const quizSubs = syncStates['sys_student_quiz_submissions_v1'] || {};
      const assignmentSubs = syncStates['sys_student_assignment_submissions_v1'] || {};
      const antiCheatMap = syncStates['sys_anti_cheat_incidents_v1'] || {};

      if (Array.isArray(quizSubsFromTable)) {
        quizSubsFromTable.forEach(item => {
          if (!item.id) return;
          quizSubs[item.id] = {
            studentId: item.student_id,
            studentName: item.student_name,
            quizId: item.quiz_id,
            score: item.score !== null ? Number(item.score) : null,
            bestScore: item.best_score !== null ? Number(item.best_score) : null,
            totalPoints: item.total_points !== null ? Number(item.total_points) : 10,
            answers: item.answers || {},
            attemptsCount: item.attempts_count || 1,
            locked: Boolean(item.is_locked),
            antiCheatStatus: item.anti_cheat_status || null,
            antiCheatWarnings: item.anti_cheat_warnings || 0,
            notes: item.feedback || '',
            submittedAt: item.submitted_at
          };
        });
      }

      if (Array.isArray(assSubsFromTable)) {
        assSubsFromTable.forEach(item => {
          if (!item.id) return;
          assignmentSubs[item.id] = {
            studentId: item.student_id,
            studentName: item.student_name,
            assignmentId: item.assignment_id,
            submissionText: item.submission_text || '',
            fileUrl: item.file_url || '',
            fileName: item.file_name || '',
            answers: item.answers || {},
            score: item.grade !== null ? Number(item.grade) : null,
            maxPoints: item.max_points !== null ? Number(item.max_points) : 10,
            notes: item.feedback || '',
            gradedBy: item.graded_by || '',
            gradedByTrainer: Boolean(item.graded_by_trainer),
            submittedAt: item.submitted_at,
            gradedAt: item.graded_at
          };
        });
      }

      if (Array.isArray(cheatingFromTable)) {
        cheatingFromTable.forEach(item => {
          const key = `${item.student_id}_${item.quiz_id}`;
          antiCheatMap[key] = {
            id: item.id,
            subKey: key,
            studentId: item.student_id,
            studentName: item.student_name,
            quizId: item.quiz_id,
            quizTitle: item.quiz_title,
            courseKey: item.course_key,
            violationsCount: item.count,
            lockedAt: item.detected_at,
            status: item.is_locked ? 'locked_pending_trainer' : 'resolved',
            trainerActionTaken: item.trainer_action
          };
        });
      }

      let traineesData = syncStates['sys_trainees_v9'] || null;
      if (Array.isArray(studentsFromTable) && studentsFromTable.length > 0) {
        traineesData = studentsFromTable.map(s => ({
          id: s.national_id,
          name: s.name,
          group: s.group_name,
          company: s.company,
          room: s.room,
          phone: s.phone,
          qual: s.qualification,
          rate: Number(s.attendance_rate) || 100,
          archiveRate: Number(s.archive_rate) || 100,
          combinedRate: Number(s.combined_rate) || 100,
          weeklyAttendance: s.weekly_attendance || [],
          weeklyAttendedSessions: s.weekly_attended_sessions || 0
        }));
      }

      let reportsData = syncStates['sys_reports_v9'] || null;
      if (Array.isArray(delayReportsFromTable) && delayReportsFromTable.length > 0) {
        reportsData = delayReportsFromTable.map(r => ({
          id: r.id,
          traineeId: r.student_id,
          traineeName: r.student_name,
          traineeGroup: r.group_name || '—',
          type: r.excuse_type || 'ملاحظة عامة',
          note: r.reason || '',
          delayMinutes: r.delay_minutes || 0,
          status: r.status || 'pending',
          date: r.created_at || new Date().toISOString(),
          actionNotes: r.notes || ''
        }));
      }

      if (Array.isArray(submissionsList)) {
        submissionsList.forEach(item => {
          const key = item.id;
          if (!key) return;

          if (item.component_type === 'quiz') {
            if (!quizSubs[key]) {
              quizSubs[key] = {
                studentId: item.student_id,
                studentName: item.student_name,
                quizId: item.component_id,
                score: item.grade !== null ? Number(item.grade) : null,
                bestScore: item.grade !== null ? Number(item.grade) : null,
                totalPoints: item.max_grade !== null ? Number(item.max_grade) : 10,
                answers: item.answers || {},
                notes: item.feedback || '',
                submittedAt: item.submitted_at
              };
            }
          } else if (item.component_type === 'assignment') {
            if (!assignmentSubs[key]) {
              assignmentSubs[key] = {
                studentId: item.student_id,
                studentName: item.student_name,
                assignmentId: item.component_id,
                score: item.grade !== null ? Number(item.grade) : null,
                maxPoints: item.max_grade !== null ? Number(item.max_grade) : 10,
                answers: item.answers || {},
                notes: item.feedback || '',
                submittedAt: item.submitted_at
              };
            }
          }
        });
      }

      return res.status(200).json({
        success: true,
        isConfigured: true,
        quizSubmissions: quizSubs,
        assignmentSubmissions: assignmentSubs,
        gradebooks: syncStates['sys_trainee_gradebooks_v1'] || {},
        antiCheatIncidents: antiCheatMap,
        studentCreds: syncStates['sys_student_creds_v1'] || null,
        trainees: traineesData,
        reports: reportsData,
        scheduleData: syncStates['sys_schedule_v9'] || null,
        phoneDirectory: syncStates['sys_phone_dir_v9'] || null,
        users: syncStates['sys_users_v9'] || null,
        laVacancies: syncStates['sys_la_vacancies_v9'] || null,
        virtualClassrooms: syncStates['sys_virtual_classrooms_v1'] || null,
        archiveData: syncStates['sys_archive_data_v1'] || null,
        totalSubmissions: submissionsList.length,
        serverTimestamp: new Date().toISOString()
      });

    } catch (err) {
      console.error('submissions-sync GET error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // ─── POST: Upsert student submission(s), gradebooks, or sync states ────────
  if (req.method === 'POST') {
    try {
      const body = req.body || {};
      const { action } = body;

      // Case 1: Single submission sync (immediate student submit)
      if (action === 'submission' || body.subKey) {
        const { type, subKey, subRecord, courseKey, weekNum } = body;
        if (!subKey || !subRecord) {
          return res.status(400).json({ success: false, error: 'بيانات التسليم مفقودة.' });
        }

        const isQuiz = type === 'quiz' || subRecord.quizId;
        const studentId = String(subRecord.studentId || subKey.split('_')[0] || '');
        const compId = String(subRecord.quizId || subRecord.assignmentId || subKey.split('_').slice(1).join('_'));
        const compType = isQuiz ? 'quiz' : 'assignment';

        const row = {
          id: subKey,
          student_id: studentId,
          student_name: subRecord.studentName || '',
          course_key: courseKey || 'all',
          week_id: String(weekNum || subRecord.weekNum || 1),
          component_type: compType,
          component_id: compId,
          answers: subRecord.answers || {},
          grade: (typeof subRecord.score === 'number' && !isNaN(subRecord.score)) ? subRecord.score : (subRecord.bestScore || null),
          max_grade: subRecord.maxPoints || subRecord.totalPoints || 10,
          feedback: subRecord.notes || '',
          submitted_at: subRecord.submittedAt || new Date().toISOString()
        };

        // 1. Upsert into student_submissions table
        try {
          await fetch(`${supabaseUrl}/rest/v1/student_submissions?on_conflict=id`, {
            method: 'POST',
            headers: {
              ...headers,
              'Prefer': 'resolution=merge-duplicates,return=minimal'
            },
            body: JSON.stringify([row])
          });
        } catch (subUpsertErr) {
          console.warn('Upsert to student_submissions table warning:', subUpsertErr);
        }

        // 1.1 Upsert into dedicated `quiz_submissions` or `assignment_submissions` table
        if (isQuiz) {
          try {
            await fetch(`${supabaseUrl}/rest/v1/quiz_submissions?on_conflict=id`, {
              method: 'POST',
              headers: { ...headers, 'Prefer': 'resolution=merge-duplicates,return=minimal' },
              body: JSON.stringify([{
                id: subKey,
                student_id: studentId,
                student_name: subRecord.studentName || '',
                quiz_id: compId,
                course_key: courseKey || 'all',
                week_id: String(weekNum || subRecord.weekNum || 1),
                score: (typeof subRecord.score === 'number' && !isNaN(subRecord.score)) ? subRecord.score : (subRecord.bestScore || null),
                best_score: (typeof subRecord.bestScore === 'number' && !isNaN(subRecord.bestScore)) ? subRecord.bestScore : (subRecord.score || null),
                total_points: subRecord.totalPoints || 10,
                answers: subRecord.answers || {},
                attempts_count: subRecord.attemptsCount || 1,
                is_locked: Boolean(subRecord.locked || subRecord.isLockedByAntiCheat),
                anti_cheat_status: subRecord.antiCheatStatus || null,
                anti_cheat_warnings: subRecord.antiCheatWarnings || 0,
                feedback: subRecord.notes || '',
                submitted_at: subRecord.submittedAt || new Date().toISOString()
              }])
            });
          } catch (qzErr) {
            console.warn('Upsert to quiz_submissions table warning:', qzErr);
          }
        } else {
          try {
            await fetch(`${supabaseUrl}/rest/v1/assignment_submissions?on_conflict=id`, {
              method: 'POST',
              headers: { ...headers, 'Prefer': 'resolution=merge-duplicates,return=minimal' },
              body: JSON.stringify([{
                id: subKey,
                student_id: studentId,
                student_name: subRecord.studentName || '',
                assignment_id: compId,
                course_key: courseKey || 'all',
                week_id: String(weekNum || subRecord.weekNum || 1),
                submission_text: subRecord.submissionText || '',
                file_url: subRecord.fileUrl || '',
                file_name: subRecord.fileName || '',
                answers: subRecord.answers || {},
                grade: (typeof subRecord.score === 'number' && !isNaN(subRecord.score)) ? subRecord.score : null,
                max_points: subRecord.maxPoints || 10,
                feedback: subRecord.notes || '',
                graded_by: subRecord.gradedBy || '',
                graded_by_trainer: Boolean(subRecord.gradedByTrainer),
                submitted_at: subRecord.submittedAt || new Date().toISOString()
              }])
            });
          } catch (asgErr) {
            console.warn('Upsert to assignment_submissions table warning:', asgErr);
          }
        }

        // 2. Also update full state map in app_sync_state
        const stateKey = isQuiz ? 'sys_student_quiz_submissions_v1' : 'sys_student_assignment_submissions_v1';
        try {
          // Fetch existing state
          let currentMap = {};
          const getRes = await fetch(`${supabaseUrl}/rest/v1/app_sync_state?key=eq.${stateKey}&select=data`, { headers });
          if (getRes.ok) {
            const rows = await getRes.json();
            if (rows && rows[0] && rows[0].data) currentMap = rows[0].data;
          }
          currentMap[subKey] = subRecord;

          await fetch(`${supabaseUrl}/rest/v1/app_sync_state?on_conflict=key`, {
            method: 'POST',
            headers: {
              ...headers,
              'Prefer': 'resolution=merge-duplicates,return=minimal'
            },
            body: JSON.stringify([{
              key: stateKey,
              data: currentMap,
              updated_at: new Date().toISOString()
            }])
          });
        } catch (stateUpsertErr) {
          console.warn('Upsert to app_sync_state warning:', stateUpsertErr);
        }

        return res.status(200).json({ success: true, message: 'تم حفظ ومزامنة التسليم سحابياً بنجاح.' });
      }

      // Case 2: Gradebooks Sync
      if (action === 'gradebooks' || body.gradebooks) {
        const gradebooks = body.gradebooks;
        if (!gradebooks || typeof gradebooks !== 'object') {
          return res.status(400).json({ success: false, error: 'بيانات كشف الدرجات مفقودة.' });
        }

        await fetch(`${supabaseUrl}/rest/v1/app_sync_state?on_conflict=key`, {
          method: 'POST',
          headers: {
            ...headers,
            'Prefer': 'resolution=merge-duplicates,return=minimal'
          },
          body: JSON.stringify([{
            key: 'sys_trainee_gradebooks_v1',
            data: gradebooks,
            updated_at: new Date().toISOString()
          }])
        });

        return res.status(200).json({ success: true, message: 'تم حفظ ومزامنة كشف الدرجات سحابياً.' });
      }

      // Case 3: Bulk Submissions & Gradebooks Sync
      if (action === 'bulk_sync') {
        const upsertRows = [];
        if (body.gradebooks) {
          upsertRows.push({
            key: 'sys_trainee_gradebooks_v1',
            data: body.gradebooks,
            updated_at: new Date().toISOString()
          });
        }
        if (body.quizSubmissions) {
          upsertRows.push({
            key: 'sys_student_quiz_submissions_v1',
            data: body.quizSubmissions,
            updated_at: new Date().toISOString()
          });
        }
        if (body.assignmentSubmissions) {
          upsertRows.push({
            key: 'sys_student_assignment_submissions_v1',
            data: body.assignmentSubmissions,
            updated_at: new Date().toISOString()
          });
        }
        if (body.studentCreds) {
          upsertRows.push({
            key: 'sys_student_creds_v1',
            data: body.studentCreds,
            updated_at: new Date().toISOString()
          });
        }
        if (body.antiCheatIncidents) {
          upsertRows.push({
            key: 'sys_anti_cheat_incidents_v1',
            data: body.antiCheatIncidents,
            updated_at: new Date().toISOString()
          });
        }
        if (body.trainees && Array.isArray(body.trainees) && body.trainees.length > 0) {
          upsertRows.push({
            key: 'sys_trainees_v9',
            data: body.trainees,
            updated_at: new Date().toISOString()
          });
          try {
            const stRows = body.trainees.map(t => {
              const cleanId = String(t.id).replace(/\D/g, '') || t.id;
              return {
                national_id: cleanId,
                name: t.name,
                group_name: t.group || '',
                company: t.company || 'معهد الذهب الأسود',
                room: t.room || '',
                phone: t.phone || '',
                qualification: t.qual || 'دبلوم تقني',
                attendance_rate: typeof t.rate === 'number' ? t.rate : 100.0,
                archive_rate: typeof t.archiveRate === 'number' ? t.archiveRate : 100.0,
                combined_rate: typeof t.combinedRate === 'number' ? t.combinedRate : 100.0,
                weekly_attendance: Array.isArray(t.weeklyAttendance) ? t.weeklyAttendance : [],
                weekly_attended_sessions: t.weeklyAttendedSessions || 0,
                password: cleanId.slice(-4),
                must_change_password: true,
                updated_at: new Date().toISOString()
              };
            });
            await fetch(`${supabaseUrl}/rest/v1/students?on_conflict=national_id`, {
              method: 'POST',
              headers: { ...headers, 'Prefer': 'resolution=merge-duplicates,return=minimal' },
              body: JSON.stringify(stRows)
            });
          } catch(stErr) { console.warn('students table upsert error:', stErr); }
        }
        if (body.reports && Array.isArray(body.reports)) {
          upsertRows.push({
            key: 'sys_reports_v9',
            data: body.reports,
            updated_at: new Date().toISOString()
          });
          try {
            const delRows = body.reports.map(r => ({
              id: r.id,
              student_id: String(r.traineeId || '').replace(/\D/g, '') || String(r.traineeId || ''),
              student_name: r.traineeName || '',
              group_name: r.traineeGroup || '',
              delay_minutes: r.delayMinutes || 0,
              reason: r.note || r.type || '',
              excuse_type: r.type || 'ملاحظة عامة',
              status: r.status || 'pending',
              notes: r.actionNotes || r.actionDecision || '',
              report_date: r.date ? (new Date(r.date).toISOString().slice(0, 10)) : (new Date().toISOString().slice(0, 10))
            }));
            await fetch(`${supabaseUrl}/rest/v1/delay_reports?on_conflict=id`, {
              method: 'POST',
              headers: { ...headers, 'Prefer': 'resolution=merge-duplicates,return=minimal' },
              body: JSON.stringify(delRows)
            });
          } catch(delErr) { console.warn('delay_reports table upsert error:', delErr); }
        }
        if (body.scheduleData && Array.isArray(body.scheduleData)) {
          upsertRows.push({
            key: 'sys_schedule_v9',
            data: body.scheduleData,
            updated_at: new Date().toISOString()
          });
        }
        if (body.phoneDirectory && typeof body.phoneDirectory === 'object') {
          upsertRows.push({
            key: 'sys_phone_dir_v9',
            data: body.phoneDirectory,
            updated_at: new Date().toISOString()
          });
        }
        if (body.users && Array.isArray(body.users)) {
          upsertRows.push({
            key: 'sys_users_v9',
            data: body.users,
            updated_at: new Date().toISOString()
          });
        }
        if (body.laVacancies && typeof body.laVacancies === 'object') {
          upsertRows.push({
            key: 'sys_la_vacancies_v9',
            data: body.laVacancies,
            updated_at: new Date().toISOString()
          });
        }
        if (body.virtualClassrooms && typeof body.virtualClassrooms === 'object') {
          upsertRows.push({
            key: 'sys_virtual_classrooms_v1',
            data: body.virtualClassrooms,
            updated_at: new Date().toISOString()
          });
        }
        if (body.archiveData && typeof body.archiveData === 'object') {
          upsertRows.push({
            key: 'sys_archive_data_v1',
            data: body.archiveData,
            updated_at: new Date().toISOString()
          });
        }

        if (upsertRows.length > 0) {
          await fetch(`${supabaseUrl}/rest/v1/app_sync_state?on_conflict=key`, {
            method: 'POST',
            headers: {
              ...headers,
              'Prefer': 'resolution=merge-duplicates,return=minimal'
            },
            body: JSON.stringify(upsertRows)
          });
        }

        return res.status(200).json({ success: true, count: upsertRows.length, message: 'تم حفظ كافة الحالات بنجاح.' });
      }

      // Case 4: Generic State Sync
      if (action === 'sync_state' && body.key && body.data) {
        await fetch(`${supabaseUrl}/rest/v1/app_sync_state?on_conflict=key`, {
          method: 'POST',
          headers: {
            ...headers,
            'Prefer': 'resolution=merge-duplicates,return=minimal'
          },
          body: JSON.stringify([{
            key: body.key,
            data: body.data,
            updated_at: new Date().toISOString()
          }])
        });

        return res.status(200).json({ success: true, message: `تم مزامنة [${body.key}] سحابياً.` });
      }

      return res.status(400).json({ success: false, error: 'نوع العملية غير معروف.' });

    } catch (err) {
      console.error('submissions-sync POST error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  return res.status(405).json({ success: false, error: 'Method Not Allowed.' });
}
