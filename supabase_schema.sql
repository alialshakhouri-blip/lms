-- ==============================================================================
-- BGTI Full Cloud Database Schema (Supabase) — Multi-Device Realtime System
-- ==============================================================================
-- كود إنشاء وتهيئة قاعدة البيانات السحابية الكاملة.
-- قم بنسخ هذا الكود ولصقه في:
-- Supabase Dashboard ➔ SQL Editor ➔ New Query ➔ Run
-- ==============================================================================

-- تفعيل امتدادات UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ══════════════════════════════════════════════════════════════════════════════
-- 1. جدول بيانات الكشف والشعب والطلاب (students)
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.students (
    national_id TEXT PRIMARY KEY,              -- رقم الهوية الوطنية (10 أرقام)
    name TEXT NOT NULL,                        -- اسم المتدرب الرباعي
    group_name TEXT,                           -- اسم الشعبة / المجموعة
    company TEXT DEFAULT 'معهد الذهب الأسود',  -- جهة التدريب / الشركة
    room TEXT,                                 -- القاعة / الورشة
    phone TEXT,                                -- رقم الجوال
    qualification TEXT DEFAULT 'دبلوم تقني',   -- المؤهل العلمي
    attendance_rate NUMERIC(5,2) DEFAULT 100.0,-- نسبة الحضور الحالية
    archive_rate NUMERIC(5,2) DEFAULT 100.0,   -- نسبة الحضور بالأرشيف
    combined_rate NUMERIC(5,2) DEFAULT 100.0,  -- النسبة التراكمية الإجمالية
    weekly_attendance JSONB DEFAULT '[]'::jsonb,-- مصفوفة حضور أيام الأسبوع
    weekly_attended_sessions INT DEFAULT 0,    -- إجمالي الحصص المحضورة
    password TEXT,                             -- كلمة المرور المشفرة/السرية
    must_change_password BOOLEAN DEFAULT false,-- هل يلزم تغيير كلمة المرور عند أول دخول
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_students_group ON public.students (group_name);
CREATE INDEX IF NOT EXISTS idx_students_phone ON public.students (phone);

-- ══════════════════════════════════════════════════════════════════════════════
-- 2. جدول المحاضرات والدروس والمناهج (lectures)
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.lectures (
    id TEXT PRIMARY KEY,                       -- معرّف الدرس
    course_key TEXT NOT NULL,                  -- مفتاح الكورس
    week_id TEXT NOT NULL,                     -- رقم / معرّف الأسبوع
    title TEXT NOT NULL,                       -- عنوان الدرس أو المحاضرة
    description TEXT,                          -- نبذة ومحاور المحاضرة
    video_url TEXT,                            -- رابط الفيديو أو اليوتيوب المباشر
    youtube_id TEXT,                           -- معرّف فيديو اليوتيوب
    file_url TEXT,                             -- رابط المذكرة المرفقة (PDF/PPTX)
    file_name TEXT,                            -- اسم الملف الأصلي
    file_type TEXT,                            -- نوع الملف (pdf, pptx, docx)
    file_size TEXT,                            -- حجم الملف المرفق
    duration TEXT,                             -- مدة الشرح
    order_index INT DEFAULT 0,                 -- ترتيب الدرس بالأسبوع
    metadata JSONB DEFAULT '{}'::jsonb,        -- تفاصيل إضافية
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_lectures_course_week ON public.lectures (course_key, week_id);

-- ══════════════════════════════════════════════════════════════════════════════
-- 3. جدول الاختبارات والتقييمات الأسبوعية (quizzes)
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.quizzes (
    id TEXT PRIMARY KEY,                       -- معرّف الاختبار
    course_key TEXT NOT NULL,                  -- الكورس
    week_id TEXT NOT NULL,                     -- الأسبوع
    title TEXT NOT NULL,                       -- عنوان الاختبار
    description TEXT,                          -- تعليمات الاختبار
    time_limit INT DEFAULT 15,                 -- مدة الاختبار بالدقائق
    max_score NUMERIC(5,2) DEFAULT 10.0,       -- الدرجة العظمى
    questions JSONB DEFAULT '[]'::jsonb,       -- بنك الأسئلة والخيارات والإجابات الصحيحة
    is_active BOOLEAN DEFAULT true,            -- متاح للطلاب حالياً
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_quizzes_course_week ON public.quizzes (course_key, week_id);

-- ══════════════════════════════════════════════════════════════════════════════
-- 4. جدول إجابات وتسليمات الاختبارات (quiz_submissions)
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.quiz_submissions (
    id TEXT PRIMARY KEY,                       -- مثل: "studentId_quizId"
    student_id TEXT NOT NULL,                  -- رقم هوية الطالب
    student_name TEXT NOT NULL,                -- اسم الطالب
    quiz_id TEXT NOT NULL,                     -- معرّف الاختبار
    course_key TEXT NOT NULL,                  -- الكورس
    week_id TEXT NOT NULL,                     -- الأسبوع
    score NUMERIC(5,2),                        -- الدرجة المحرزة
    best_score NUMERIC(5,2),                   -- أفضل درجة
    total_points NUMERIC(5,2) DEFAULT 10.0,    -- الدرجة القصوى
    answers JSONB DEFAULT '{}'::jsonb,         -- إجابات الطالب بالتفصيل
    attempts_count INT DEFAULT 1,              -- عدد المحاولات
    is_locked BOOLEAN DEFAULT false,           -- هل مقفل بسبب الغش أو غيره
    anti_cheat_status TEXT,                    -- حالة النزاهة الأكاديمية
    anti_cheat_warnings INT DEFAULT 0,         -- عدد التحذيرات المرصودة
    feedback TEXT,                             -- ملاحظات المصحح
    submitted_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_quiz_subs_student ON public.quiz_submissions (student_id);
CREATE INDEX IF NOT EXISTS idx_quiz_subs_quiz ON public.quiz_submissions (quiz_id);

-- ══════════════════════════════════════════════════════════════════════════════
-- 5. جدول الواجبات والمهام العملية (assignments)
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.assignments (
    id TEXT PRIMARY KEY,                       -- معرّف الواجب
    course_key TEXT NOT NULL,                  -- الكورس
    week_id TEXT NOT NULL,                     -- الأسبوع
    title TEXT NOT NULL,                       -- عنوان الواجب
    instructions TEXT,                         -- إرشادات التسليم
    max_grade NUMERIC(5,2) DEFAULT 10.0,       -- الدرجة المستحقة
    deadline TIMESTAMPTZ,                      -- الموعد النهائي للتسليم
    pdf_url TEXT,                              -- رابط ملف ورقة العمل المرفق
    pdf_name TEXT,                             -- اسم الملف المرفق
    questions JSONB DEFAULT '[]'::jsonb,       -- بنك أسئلة الواجب إن وُجد
    grading_mode TEXT DEFAULT 'manual_trainer',-- نمط التصحيح
    is_active BOOLEAN DEFAULT true,            -- متاح للطلاب
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_assignments_course_week ON public.assignments (course_key, week_id);

-- ══════════════════════════════════════════════════════════════════════════════
-- 6. جدول تسليمات وحلول الواجبات المرفوعة (assignment_submissions)
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.assignment_submissions (
    id TEXT PRIMARY KEY,                       -- مثل: "studentId_assignmentId"
    student_id TEXT NOT NULL,                  -- هوية الطالب
    student_name TEXT NOT NULL,                -- اسم الطالب
    assignment_id TEXT NOT NULL,               -- معرّف الواجب
    course_key TEXT NOT NULL,                  -- الكورس
    week_id TEXT NOT NULL,                     -- الأسبوع
    submission_text TEXT,                      -- نص الإجابة أو الحل
    file_url TEXT,                             -- رابط الملف المرفوع من المتدرب
    file_name TEXT,                            -- اسم الملف المرفوع
    answers JSONB DEFAULT '{}'::jsonb,         -- إجابات الأسئلة إن وجدت
    grade NUMERIC(5,2),                        -- الدرجة الممنوحة
    max_points NUMERIC(5,2) DEFAULT 10.0,      -- الدرجة الكاملة
    feedback TEXT,                             -- تعقيب وتوجيه المدرب
    graded_by TEXT,                            -- اسم المدرب المصحح
    graded_by_trainer BOOLEAN DEFAULT false,   -- هل تم تقييمه رسمياً من المدرب
    submitted_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    graded_at TIMESTAMPTZ                      -- تاريخ الاعتماد
);

CREATE INDEX IF NOT EXISTS idx_assignment_subs_student ON public.assignment_submissions (student_id);
CREATE INDEX IF NOT EXISTS idx_assignment_subs_assignment ON public.assignment_submissions (assignment_id);

-- ══════════════════════════════════════════════════════════════════════════════
-- 7. جدول الحضور والغياب اليومي والتراكمي (attendance)
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.attendance (
    id TEXT PRIMARY KEY,                       -- مثل: "studentId_YYYY-MM-DD"
    student_id TEXT NOT NULL,                  -- رقم هوية المتدرب
    student_name TEXT,                         -- اسم المتدرب
    group_name TEXT,                           -- الشعبة
    date DATE NOT NULL,                        -- تاريخ اليوم
    status TEXT NOT NULL,                      -- 'حاضر', 'غائب', 'متأخر', 'مستأذن'
    sessions_attended INT DEFAULT 1,           -- عدد الحصص المحضورة في هذا اليوم
    total_sessions INT DEFAULT 4,              -- إجمالي حصص اليوم
    notes TEXT,                                -- ملاحظات إضافية
    recorded_by TEXT,                          -- المدرب أو المشرف المسجل
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_attendance_student_date ON public.attendance (student_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON public.attendance (date);
CREATE INDEX IF NOT EXISTS idx_attendance_group ON public.attendance (group_name);

-- ══════════════════════════════════════════════════════════════════════════════
-- 8. جدول بلاغات التأخير والأعذار (delay_reports)
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.delay_reports (
    id TEXT PRIMARY KEY,                       -- معرّف البلاغ
    student_id TEXT NOT NULL,                  -- هوية الطالب
    student_name TEXT NOT NULL,                -- اسم الطالب
    group_name TEXT,                           -- الشعبة
    delay_minutes INT DEFAULT 0,               -- مقدار التأخير بالدقائق
    reason TEXT,                               -- سبب التأخير أو العذر
    excuse_type TEXT DEFAULT 'تأخر مواصلات',   -- نوع العذر (عذر مرضي، ظرف طارئ، تأخر مواصلات)
    status TEXT DEFAULT 'pending',             -- حالة الطلب ('pending', 'approved', 'rejected')
    notes TEXT,                                -- قرار وتوجيه الإدارة أو المدرب
    report_date DATE DEFAULT CURRENT_DATE,     -- تاريخ البلاغ
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_delay_student ON public.delay_reports (student_id);
CREATE INDEX IF NOT EXISTS idx_delay_date ON public.delay_reports (report_date);

-- ══════════════════════════════════════════════════════════════════════════════
-- 9. جدول سجلات الغش والتنقل بين الشاشات (cheating_logs)
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.cheating_logs (
    id TEXT PRIMARY KEY,                       -- معرّف الحادثة
    student_id TEXT NOT NULL,                  -- رقم هوية الطالب
    student_name TEXT NOT NULL,                -- اسم الطالب
    quiz_id TEXT NOT NULL,                     -- معرّف الاختبار
    quiz_title TEXT,                           -- عنوان الاختبار
    course_key TEXT,                           -- الكورس
    incident_type TEXT NOT NULL,               -- 'tab_switch', 'screen_blur', 'split_screen', 'copy_paste'
    count INT DEFAULT 1,                       -- عدد مرات الخروج أو التحذيرات
    details JSONB DEFAULT '{}'::jsonb,         -- تفاصيل فنية عن الحادثة
    is_locked BOOLEAN DEFAULT false,           -- هل تم إقفال الاختبار على الطالب
    trainer_action TEXT,                       -- الإجراء المتخذ ('unlocked', 'disqualified', 'warned')
    detected_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    action_at TIMESTAMPTZ                      -- تاريخ اتخاذ الإجراء
);

CREATE INDEX IF NOT EXISTS idx_cheating_student_quiz ON public.cheating_logs (student_id, quiz_id);
CREATE INDEX IF NOT EXISTS idx_cheating_detected_at ON public.cheating_logs (detected_at);

-- ══════════════════════════════════════════════════════════════════════════════
-- 10. الجداول الداعمة للمزامنة السحابية الشاملة
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.lms_courses (
    id TEXT PRIMARY KEY,
    course_key TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    trainer_name TEXT,
    course_code TEXT,
    weeks JSONB DEFAULT '[]'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.student_submissions (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL,
    student_name TEXT NOT NULL,
    course_key TEXT NOT NULL,
    week_id TEXT NOT NULL,
    component_type TEXT NOT NULL,
    component_id TEXT,
    answers JSONB DEFAULT '{}'::jsonb,
    grade NUMERIC(5,2),
    max_grade NUMERIC(5,2) DEFAULT 10.0,
    feedback TEXT,
    submitted_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.app_sync_state (
    key TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.lms_files (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    file_type TEXT,
    file_size BIGINT,
    storage_path TEXT NOT NULL,
    public_url TEXT NOT NULL,
    course_key TEXT REFERENCES public.lms_courses(course_key) ON DELETE SET NULL,
    week_id TEXT,
    uploaded_by TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ══════════════════════════════════════════════════════════════════════════════
-- 11. سياسات الأمان والحماية (Row Level Security - RLS) لكافة الجداول
-- ══════════════════════════════════════════════════════════════════════════════
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lectures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delay_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cheating_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_sync_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_files ENABLE ROW LEVEL SECURITY;

-- سياسات الوصول الشاملة (قراءة، إدخال، تعديل، وحذف) لضمان عدم حظر أي جهاز خارجي:
DO $$
DECLARE
    tbl text;
    tables text[] := ARRAY[
        'students', 'lectures', 'quizzes', 'quiz_submissions', 
        'assignments', 'assignment_submissions', 'attendance', 
        'delay_reports', 'cheating_logs', 'lms_courses', 
        'student_submissions', 'app_sync_state', 'lms_files'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Allow public all on %I" ON public.%I;', tbl, tbl);
        EXECUTE format('CREATE POLICY "Allow public all on %I" ON public.%I FOR ALL USING (true) WITH CHECK (true);', tbl, tbl);
    END LOOP;
END $$;

-- ══════════════════════════════════════════════════════════════════════════════
-- 12. إنشاء حاوية التخزين السحابي للملفات (Supabase Storage Bucket: 'lms-files')
-- ══════════════════════════════════════════════════════════════════════════════
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'lms-files',
    'lms-files',
    true,
    52428800, -- 50 MB
    ARRAY[
        'application/pdf',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/png',
        'image/jpeg',
        'image/webp'
    ]
)
ON CONFLICT (id) DO UPDATE SET 
    public = true,
    file_size_limit = 52428800;

-- سياسات التخزين السحابي للملفات
DROP POLICY IF EXISTS "Allow public download of lms-files" ON storage.objects;
CREATE POLICY "Allow public download of lms-files" ON storage.objects
    FOR SELECT USING (bucket_id = 'lms-files');

DROP POLICY IF EXISTS "Allow public upload to lms-files" ON storage.objects;
CREATE POLICY "Allow public upload to lms-files" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'lms-files');

DROP POLICY IF EXISTS "Allow public update to lms-files" ON storage.objects;
CREATE POLICY "Allow public update to lms-files" ON storage.objects
    FOR UPDATE USING (bucket_id = 'lms-files');

DROP POLICY IF EXISTS "Allow public delete from lms-files" ON storage.objects;
CREATE POLICY "Allow public delete from lms-files" ON storage.objects
    FOR DELETE USING (bucket_id = 'lms-files');

-- ══════════════════════════════════════════════════════════════════════════════
-- 13. تفعيل البث اللحظي المباشر (Supabase Realtime Publication) لكافة الجداول
-- ══════════════════════════════════════════════════════════════════════════════
DO $$
DECLARE
    tbl text;
    tables text[] := ARRAY[
        'students', 'lectures', 'quizzes', 'quiz_submissions', 
        'assignments', 'assignment_submissions', 'attendance', 
        'delay_reports', 'cheating_logs', 'lms_courses', 
        'student_submissions', 'app_sync_state'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables LOOP
        BEGIN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I;', tbl);
        EXCEPTION WHEN duplicate_object THEN
            NULL;
        WHEN undefined_object THEN
            NULL;
        END;
    END LOOP;
END $$;
