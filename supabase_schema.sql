-- ==============================================================================
-- BGTI Attendance & LMS — Supabase Database Schema & Storage Setup
-- ==============================================================================
-- قم بنسخ هذا الكود بالكامل ولصقه في:
-- Supabase Dashboard -> SQL Editor -> New Query -> Run
-- ==============================================================================

-- 1. تمكين امتدادات UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ══════════════════════════════════════════════════════════════════════════════
-- 2. إنشاء جدول المحتوى الأكاديمي للكورسات (LMS Courses & Weeks)
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.lms_courses (
    id TEXT PRIMARY KEY,                       -- مثل: "اللحام", "السلامة والصحة", "اللغة الإنجليزية الفنية"
    course_key TEXT UNIQUE NOT NULL,           -- مفتاح الكورس الموحد
    title TEXT NOT NULL,                       -- اسم الكورس التدريبي
    trainer_name TEXT,                         -- اسم المدرب المسؤول
    course_code TEXT,                          -- كود المادة
    weeks JSONB DEFAULT '[]'::jsonb,           -- مصفوفة الأسابيع والوحدات (فيديوهات، ملفات، اختبارات، واجبات)
    metadata JSONB DEFAULT '{}'::jsonb,        -- بيانات إضافية (أهداف الكورس، الساعات، الإعدادات)
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- فهرس لتسريع البحث بمفتاح الكورس
CREATE INDEX IF NOT EXISTS idx_lms_courses_key ON public.lms_courses (course_key);

-- ══════════════════════════════════════════════════════════════════════════════
-- 3. إنشاء جدول تتبع الملفات والمذكرات المرفوعة (LMS Uploaded Files)
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.lms_files (
    id TEXT PRIMARY KEY,                       -- معرّف فريد للملف
    filename TEXT NOT NULL,                    -- اسم الملف الأصلي
    file_type TEXT,                            -- نوع الملف (pdf / pptx / presentation / document)
    file_size BIGINT,                          -- حجم الملف بالبايت
    storage_path TEXT NOT NULL,                -- المسار داخل Supabase Storage bucket
    public_url TEXT NOT NULL,                  -- الرابط المباشر الدائم لتحميل وعرض الملف
    course_key TEXT REFERENCES public.lms_courses(course_key) ON DELETE SET NULL,
    week_id TEXT,                              -- معرّف الأسبوع التابع له
    uploaded_by TEXT,                          -- اسم المدرب أو المستخدم الرافع
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_lms_files_course ON public.lms_files (course_key);

-- ══════════════════════════════════════════════════════════════════════════════
-- 4. إنشاء جدول تسليمات المتدربين (Student Submissions & Quizzes)
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.student_submissions (
    id TEXT PRIMARY KEY,                       -- معرّف التسليم
    student_id TEXT NOT NULL,                  -- الرقم الأكاديمي للمتدرب
    student_name TEXT NOT NULL,                -- اسم المتدرب
    course_key TEXT NOT NULL,                  -- الكورس
    week_id TEXT NOT NULL,                     -- الأسبوع
    component_type TEXT NOT NULL,              -- 'quiz' أو 'assignment'
    component_id TEXT,                         -- معرّف الاختبار أو الواجب
    answers JSONB DEFAULT '{}'::jsonb,         -- إجابات المتدرب
    grade NUMERIC(5,2),                        -- الدرجة المستحقة
    max_grade NUMERIC(5,2) DEFAULT 10.0,       -- الدرجة العظمى
    feedback TEXT,                             -- ملاحظات المدرب
    submitted_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_submissions_student ON public.student_submissions (student_id);
CREATE INDEX IF NOT EXISTS idx_submissions_course_week ON public.student_submissions (course_key, week_id);

-- ══════════════════════════════════════════════════════════════════════════════
-- 5. إنشاء جدول حالة المزامنة العامة للنظام (App Shared State)
-- يحفظ: كشف الحضور، قائمة المتدربين، جدول القاعات، والتقارير لمزامنتها سحابياً
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.app_sync_state (
    key TEXT PRIMARY KEY,                      -- مفتاح البيانات: 'sys_trainees_v9', 'sys_schedule_v9', 'sys_reports_v9'
    data JSONB NOT NULL,                       -- البيانات المحفوظة بصيغة JSONB
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ══════════════════════════════════════════════════════════════════════════════
-- 6. سياسات الأمان والحماية (Row Level Security - RLS)
-- ══════════════════════════════════════════════════════════════════════════════
ALTER TABLE public.lms_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_sync_state ENABLE ROW LEVEL SECURITY;

-- سياسات عامة للوصول (قراءة وكتابة عبر مفتاح anon المعتمد في التطبيق):
CREATE POLICY "Allow public read on lms_courses" ON public.lms_courses FOR SELECT USING (true);
CREATE POLICY "Allow public insert/update on lms_courses" ON public.lms_courses FOR ALL USING (true);

CREATE POLICY "Allow public read on lms_files" ON public.lms_files FOR SELECT USING (true);
CREATE POLICY "Allow public insert/update on lms_files" ON public.lms_files FOR ALL USING (true);

CREATE POLICY "Allow public read on student_submissions" ON public.student_submissions FOR SELECT USING (true);
CREATE POLICY "Allow public insert/update on student_submissions" ON public.student_submissions FOR ALL USING (true);

CREATE POLICY "Allow public read on app_sync_state" ON public.app_sync_state FOR SELECT USING (true);
CREATE POLICY "Allow public insert/update on app_sync_state" ON public.app_sync_state FOR ALL USING (true);

-- ══════════════════════════════════════════════════════════════════════════════
-- 7. إنشاء حاوية التخزين السحابي للملفات (Supabase Storage Bucket)
-- ══════════════════════════════════════════════════════════════════════════════
-- إنشاء سلة التخزين 'lms-files' بصيغة عامة (Public) لتمكين المتدربين والمدربين
-- من استعراض وتحميل ملفات PPTX والـ PDF بشكل دائم.
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

-- سياسات سلة التخزين (Storage Policies):
CREATE POLICY "Allow public download of lms-files" ON storage.objects
    FOR SELECT USING (bucket_id = 'lms-files');

CREATE POLICY "Allow public upload to lms-files" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'lms-files');

CREATE POLICY "Allow public update to lms-files" ON storage.objects
    FOR UPDATE USING (bucket_id = 'lms-files');

CREATE POLICY "Allow public delete from lms-files" ON storage.objects
    FOR DELETE USING (bucket_id = 'lms-files');

-- ══════════════════════════════════════════════════════════════════════════════
-- 8. تمكين البث اللحظي المباشر (Supabase Realtime Publication)
-- ══════════════════════════════════════════════════════════════════════════════
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.student_submissions;
    EXCEPTION WHEN duplicate_object THEN
        -- already added
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.app_sync_state;
    EXCEPTION WHEN duplicate_object THEN
        -- already added
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.lms_courses;
    EXCEPTION WHEN duplicate_object THEN
        -- already added
    END;
END $$;

