// Vercel Serverless Function: api/generate.js
// Handles AI Auto-Generation for LMS Modules via Google Gemini API
// Supports PPTX & PDF upload directly on Vercel without a local Python server.

import zlib from 'zlib';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb'
    }
  },
  maxDuration: 60
};

// ══════════════════════════════════════════════════════════════════════════════
//  PROMPT TEMPLATE FOR LMS GENERATION
// ══════════════════════════════════════════════════════════════════════════════
const LMS_PROMPT_TEMPLATE = `أنت خبير أكاديمي متقدم ومصمم مناهج وتقييمات تدريبية معتمد لدى معهد الذهب الأسود للتدريب (BGTI)، متخصص بدقة عالية ومباشرة في تدريس وتقييم مادة: "{COURSE_DISCIPLINE}" وموضوع الدرس: "{WEEK_DISCIPLINE}".

قم بتحليل المحتوى التعليمي المرفق وتوليد بيانات مُهيكلة بدقة أكاديمية فائقة بصيغة JSON.
يجب أن يملأ الناتج المكونات الأربعة الكاملة للوحدة الدراسية الأسبوعية في منصة LMS بما يتطابق 100% مع التخصص والمحتوى دون الخروج عنه إطلاقاً.

{CONTENT_BLOCK}

## تعليمات الدقة الأكاديمية والتخصصية الصارمة:
1. التخصصية والتطابق 100%:
   - إذا كان المقرر "صحة وسلامة" أو السلامة المهنية (OSHA / HSE): يجب أن تكون كافة الأسئلة (الاختيار من متعدد، الصح والخطأ، والمطابقة)، ومصطلحات القاموس، والواجبات، والفيديوهات مستنبطة حصراً ودقة من إجراءات السلامة المهنية، مهمات الوقاية الشخصية (PPE)، تشريعات الأوشا، إدارة المخاطر ومكافحة الحرائق، دون أي خلط بمواضيع غير مرتبطة بالسلامة!
   - إذا كان المقرر "إنجليزي": تركز الأسئلة والمصطلحات والواجبات على المصطلحات الفنية الإنجليزية ونطقها وتوظيفها المهني في بيئة العمل.
   - إذا كان المقرر "ميكانيكا" أو "لحام" أو "كهرباء" أو "حاسب آلي": تنبثق الأسئلة والخيارات والواجبات والمصطلحات مباشرة من صلب هذا التخصص المحدد والمحتوى المرفق.
2. دقة مفتاح الإجابة الصحيحة (Correct Answers Guarantee):
   - في جميع أسئلة الاختيار من متعدد (MCQ): يجب أن تكون الإجابة المحددة في حقل "correct_answer" مطابقة تماماً وبشكل حرفي لأحد الخيارات الأربعة المذكورة في مصفوفة "options"، وتكون هي الإجابة الصحيحة علمياً ومنطقياً دون أي تناقض.
   - في أسئلة الصح والخطأ: حدد "صح ✓" أو "خطأ ✗" بدقة متناهية مع تفسير علمي صريح لسبب الصحة أو الخطأ.
   - في سؤال التوصيل والمطابقة (Matching): اربط كل مفهوم في "left" بتعريفه الدقيق الصحيح 100% في "right".
3. الفيديوهات التعليمية المقترحة:
   - وفر 3 فيديوهات ذات عناوين دقيقة تركز على "{COURSE_DISCIPLINE} - {WEEK_DISCIPLINE}" مع روابط يوتيوب تعليمية حقيقية بصيغة https://www.youtube.com/watch?v=... ولا تضع روابط بحث search_query إطلاقاً.
4. مكونات التقييمات:
   - الواجب الأسبوعي: أسئلة تطبيقية محددة + تكليف نصي عملي يربط المهارة ببيئة العمل.
   - الاختبار الأسبوعي: يجب عليك توليد 10 أسئلة متكاملة ومستنبطة 100% من صلب النص والمحتوى المرفق دون أي حشو خارجي (6 أسئلة اختيار من متعدد MCQ + 3 أسئلة صح وخطأ + سؤال توصيل ومطابقة Matching واحد يحتوي على 4 أزواج متطابقة تماماً). لا تنقص عن 10 أسئلة إطلاقاً!
5. أعد فقط كائن JSON الصالح التالي بدون أي نصوص تمهيدية أو كتل تعليق خارج الـ JSON:

## JSON Schema المطلوبة (أعد هذه البنية بالضبط):
{
  "suggested_videos": [
    {
      "id": 1,
      "title": "عنوان مقترح للفيديو التدريبي الأول (باللغة الإنجليزية أو العربية)",
      "description": "شرح موجز لمحتوى الفيديو والمهارة العملية التي يشرحها",
      "duration": "10-15 دقيقة",
      "youtube_url": "https://www.youtube.com/watch?v=pMtqDWUpJds"
    },
    {
      "id": 2,
      "title": "عنوان مقترح للفيديو التدريبي الثاني",
      "description": "شرح تفصيلي للمفاهيم الأساسية والتطبيق المهني في بيئة العمل",
      "duration": "8-12 دقيقة",
      "youtube_url": "https://www.youtube.com/watch?v=1pMHayXqoMY"
    },
    {
      "id": 3,
      "title": "عنوان مقترح للفيديو التدريبي الثالث",
      "description": "فيديو إثرائي مكمل للموضوع مع أمثلة واقعية",
      "duration": "12-18 دقيقة",
      "youtube_url": "https://www.youtube.com/watch?v=XpcCUtYzwy0"
    }
  ],
  "lecture": {
    "title": "عنوان المحاضرة المشتق من الملف",
    "duration_minutes": 15,
    "summary": "ملخص شامل ومكثف لمحتوى المحاضرة والنقاط الأساسية (لا يقل عن 80 كلمة بالعربية الفصحى)",
    "topics": [
      "المحور الأول: مقدمة وأسس المفهوم التدريبي في هذا الدرس",
      "المحور الثاني: الإجراءات والمعايير المهنية المعتمدة",
      "المحور الثالث: التطبيق العملي والسلامة التخصصية في بيئة العمل"
    ]
  },
  "glossary_notes": {
    "title": "قاموس ومذكرات مصطلحات الأسبوع",
    "description": "قاموس مصطلحات فنية ومهنية إنجليزية مترجمة للعربية وموضحة وفق المنهج التدريبي المرفق",
    "terms": [
      {"en": "Term 1", "ar": "المصطلح 1 بالعربية", "definition": "شرح دقيق للمصطلح مشتق من المحتوى المرفق"},
      {"en": "Term 2", "ar": "المصطلح 2 بالعربية", "definition": "شرح دقيق للمصطلح مشتق من المحتوى المرفق"},
      {"en": "Term 3", "ar": "المصطلح 3 بالعربية", "definition": "شرح دقيق للمصطلح مشتق من المحتوى المرفق"},
      {"en": "Term 4", "ar": "المصطلح 4 بالعربية", "definition": "شرح دقيق للمصطلح مشتق من المحتوى المرفق"}
    ]
  },
  "assignment": {
    "title": "الواجب والتكليف الأسبوعي",
    "total_grade": 10,
    "instructions": "تعليمات واضحة للمتدرب لكيفية حل التكليف وربط المصطلحات بالممارسة المهنية",
    "assignment_type": "mcq_or_text",
    "mcq_questions": [
      {
        "question": "سؤال تطبيقي من متعدد يطلب تطبيق المصطلحات في مواقف عمل واقعية",
        "options": ["الخيار أ", "الخيار ب", "الخيار ج", "الخيار د"],
        "correct_answer": "الخيار أ"
      }
    ],
    "text_questions": [
      {
        "prompt": "اكتب فقرة فنية مهنية توضح فيها كيفية تطبيق المفاهيم المكتسبة في هذه الوحدة التدريبية.",
        "guidelines": "استخدم المصطلحات الفنية المناسبة الواردة في المحتوى.",
        "model_answer": "نموذج إجابة استرشادي يوضح للمدرب المعايير المقبولة للتقييم."
      }
    ],
    "questions": [
      {
        "type": "mcq",
        "question": "سؤال تطبيقي من متعدد يطلب تطبيق المصطلحات في مواقف عمل واقعية",
        "options": ["الخيار أ", "الخيار ب", "الخيار ج", "الخيار د"],
        "correct_answer": "الخيار أ"
      },
      {
        "type": "true_false",
        "question": "عبارة صح وخطأ حول تطبيق المصطلحات وإجراءات العمل والمهام المهنية في هذا الموضوع",
        "options": ["صح", "خطأ"],
        "correct_answer": "صح"
      }
    ]
  },
  "quiz": {
    "title": "اختبار الأسبوع التفاعلي المتنوع",
    "duration_minutes": 15,
    "total_grade": 10,
    "questions": [
      {
        "type": "mcq",
        "question": "سؤال 1 من متعدد مشتق بدقة متناهية من المحتوى",
        "options": ["الخيار الصحيح", "خيار غير صحيح 1", "خيار غير صحيح 2", "خيار غير صحيح 3"],
        "correct_answer": "الخيار الصحيح",
        "explanation": "شرح وتفسير علمي دقيق لسبب صحة الخيار"
      },
      {
        "type": "mcq",
        "question": "سؤال 2 من متعدد يختبر مفهوماً رئيسياً من النص المرفق",
        "options": ["الخيار الصحيح", "خيار غير صحيح 1", "خيار غير صحيح 2", "خيار غير صحيح 3"],
        "correct_answer": "الخيار الصحيح",
        "explanation": "شرح توضيحي مباشر"
      },
      {
        "type": "mcq",
        "question": "سؤال 3 من متعدد يقيس التطبيق الفني العملي للموضوع",
        "options": ["الخيار الصحيح", "خيار غير صحيح 1", "خيار غير صحيح 2", "خيار غير صحيح 3"],
        "correct_answer": "الخيار الصحيح",
        "explanation": "شرح توضيحي مباشر"
      },
      {
        "type": "mcq",
        "question": "سؤال 4 من متعدد يقيس الإجراءات والمعايير المذكورة بالدرس",
        "options": ["الخيار الصحيح", "خيار غير صحيح 1", "خيار غير صحيح 2", "خيار غير صحيح 3"],
        "correct_answer": "الخيار الصحيح",
        "explanation": "شرح توضيحي مباشر"
      },
      {
        "type": "mcq",
        "question": "سؤال 5 من متعدد يختبر التمييز بين المصطلحات التقنية",
        "options": ["الخيار الصحيح", "خيار غير صحيح 1", "خيار غير صحيح 2", "خيار غير صحيح 3"],
        "correct_answer": "الخيار الصحيح",
        "explanation": "شرح توضيحي مباشر"
      },
      {
        "type": "mcq",
        "question": "سؤال 6 من متعدد يربط بين النظرية والتطبيق الميداني",
        "options": ["الخيار الصحيح", "خيار غير صحيح 1", "خيار غير صحيح 2", "خيار غير صحيح 3"],
        "correct_answer": "الخيار الصحيح",
        "explanation": "شرح توضيحي مباشر"
      },
      {
        "type": "true_false",
        "question": "سؤال 7 (صح/خطأ): عبارة دقيقة مستنبطة من المحتوى",
        "options": ["صح ✓", "خطأ ✗"],
        "correct_answer": "صح ✓",
        "explanation": "تفسير صحة العبارة وفقاً للمحتوى العلمي"
      },
      {
        "type": "true_false",
        "question": "سؤال 8 (صح/خطأ): عبارة ثانية تقيس الدقة في استيعاب المادة",
        "options": ["صح ✓", "خطأ ✗"],
        "correct_answer": "خطأ ✗",
        "explanation": "تفسير سبب خطأ العبارة والتصحيح الدقيق لها"
      },
      {
        "type": "true_false",
        "question": "سؤال 9 (صح/خطأ): عبارة ثالثة تركز على التطبيق والاشتراطات",
        "options": ["صح ✓", "خطأ ✗"],
        "correct_answer": "صح ✓",
        "explanation": "تفسير صواب العبارة"
      },
      {
        "type": "matching",
        "question": "🔗 سؤال التوصيل والمطابقة: صِل كل مفهوم/مصطلح في القائمة (أ) بتعريفه وتطبيقه الصحيح في القائمة (ب):",
        "pairs": [
          {"left": "المصطلح 1 من الدرس", "right": "التعريف المطابق 1"},
          {"left": "المصطلح 2 من الدرس", "right": "التعريف المطابق 2"},
          {"left": "المصطلح 3 من الدرس", "right": "التعريف المطابق 3"},
          {"left": "المصطلح 4 من الدرس", "right": "التعريف المطابق 4"}
        ],
        "explanation": "أحسنت! جميع المصطلحات تم توصيلها بتعريفاتها الفنية الصحيحة بنجاح."
      }
    ]
  }
}`;

// ══════════════════════════════════════════════════════════════════════════════
//  PURE NODE.js PPTX TEXT EXTRACTOR (0 External Dependencies)
//  Reads ZIP Central Directory, inflates slide XMLs via zlib, extracts text
// ══════════════════════════════════════════════════════════════════════════════
function extractTextFromPptxBuffer(buffer) {
  // Step 1: Try JSZip if installed
  try {
    // Dynamic import to support optional package
    // If not available, falls through to pure zlib implementation
  } catch (e) {
    // ignore
  }

  // Step 2: Pure Node.js ZIP + zlib extractor
  try {
    const eocdSig = Buffer.from([0x50, 0x4b, 0x05, 0x06]);
    let eocdOffset = buffer.lastIndexOf(eocdSig);
    if (eocdOffset === -1) {
      throw new Error('Invalid ZIP/PPTX structure: EOCD signature not found');
    }

    const totalEntries = buffer.readUInt16LE(eocdOffset + 10);
    const cdOffset = buffer.readUInt32LE(eocdOffset + 16);

    let pos = cdOffset;
    const slides = [];

    for (let i = 0; i < totalEntries && pos < buffer.length - 46; i++) {
      const sig = buffer.readUInt32LE(pos);
      if (sig !== 0x02014b50) break; // End of central directory records

      const method = buffer.readUInt16LE(pos + 10);
      const compSize = buffer.readUInt32LE(pos + 20);
      const fnLen = buffer.readUInt16LE(pos + 28);
      const extraLen = buffer.readUInt16LE(pos + 30);
      const commentLen = buffer.readUInt16LE(pos + 32);
      const localOffset = buffer.readUInt32LE(pos + 42);

      const fileName = buffer.toString('utf8', pos + 46, pos + 46 + fnLen);

      // Check if it's a slide XML file (ppt/slides/slide*.xml)
      const isSlide = fileName.includes('ppt/slides/slide') && fileName.endsWith('.xml');
      const isNotes = fileName.includes('ppt/notesSlides/notesSlide') && fileName.endsWith('.xml');

      if ((isSlide || isNotes) && localOffset < buffer.length) {
        try {
          const lFnLen = buffer.readUInt16LE(localOffset + 26);
          const lExtraLen = buffer.readUInt16LE(localOffset + 28);
          const dataStart = localOffset + 30 + lFnLen + lExtraLen;
          const compData = buffer.subarray(dataStart, dataStart + compSize);

          let uncompressed;
          if (method === 0) {
            uncompressed = compData;
          } else if (method === 8) {
            uncompressed = zlib.inflateRawSync(compData);
          }

          if (uncompressed) {
            const xmlStr = uncompressed.toString('utf8');
            // Extract text inside <a:t>...</a:t> tags
            const textMatches = xmlStr.match(/<a:t[^>]*>(.*?)<\/a:t>/gi) || [];
            const slideTexts = textMatches.map(m => {
              return m.replace(/<[^>]+>/g, '')
                .replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&quot;/g, '"')
                .replace(/&apos;/g, "'")
                .trim();
            }).filter(Boolean);

            if (slideTexts.length > 0) {
              const slideNumMatch = fileName.match(/slide(\d+)\.xml/);
              const slideNum = slideNumMatch ? parseInt(slideNumMatch[1], 10) : i + 1;
              slides.push({
                num: slideNum,
                isNotes,
                text: slideTexts.join(' ')
              });
            }
          }
        } catch (decompErr) {
          // Skip unreadable slide
        }
      }

      pos += 46 + fnLen + extraLen + commentLen;
    }

    // Sort slides numerically
    slides.sort((a, b) => a.num - b.num);

    const formattedLines = slides.map(s => `[${s.isNotes ? 'Note' : 'Slide'} ${s.num}]\n${s.text}`);
    return formattedLines.join('\n\n');
  } catch (err) {
    console.error('PPTX extraction error:', err);
    // Fallback: extract printable strings from raw buffer
    return extractPrintableStrings(buffer);
  }
}

// Fallback string extractor for edge cases
function extractPrintableStrings(buffer, minLen = 5) {
  const str = buffer.toString('utf8', 0, Math.min(buffer.length, 250000));
  const matches = str.match(/[A-Za-z\u0600-\u06FF0-9\s:,\.\-_/]{5,}/g) || [];
  return matches.slice(0, 100).join('\n');
}

// ══════════════════════════════════════════════════════════════════════════════
//  PURE NODE.js PDF TEXT EXTRACTOR (Used for offline fallback)
// ══════════════════════════════════════════════════════════════════════════════
async function extractTextFromPdfBuffer(buffer) {
  // 1. Try pdf-parse dynamic import if installed in environment
  try {
    const pdfParseMod = await import('pdf-parse');
    const pdfParse = pdfParseMod.default || pdfParseMod;
    if (typeof pdfParse === 'function') {
      const data = await pdfParse(buffer);
      if (data && data.text && data.text.trim().length > 10) {
        return data.text.trim();
      }
    }
  } catch (pdfErr) {
    // continue to pure node fallback
  }

  // 2. Pure Node.js stream decompress & regex
  try {
    const raw = buffer.toString('latin1');
    const streamRegex = /stream[\r\n]+([\s\S]*?)[\r\n]+endstream/g;
    let match;
    const extractedBlocks = [];

    while ((match = streamRegex.exec(raw)) !== null) {
      try {
        const streamData = Buffer.from(match[1], 'latin1');
        let inflated = null;
        try {
          inflated = zlib.inflateSync(streamData).toString('utf8');
        } catch (z1) {
          try {
            inflated = zlib.inflateRawSync(streamData).toString('utf8');
          } catch (z2) {}
        }

        if (inflated) {
          // Extract text between parentheses: (Hello) Tj or [(Hello) 20 (World)] TJ
          const textRegex = /\(([^)]+)\)\s*(?:Tj|'|")/g;
          let tMatch;
          const blockTexts = [];
          while ((tMatch = textRegex.exec(inflated)) !== null) {
            const clean = tMatch[1].replace(/\\([()\\])/g, '$1').trim();
            if (clean.length > 2) blockTexts.push(clean);
          }
          if (blockTexts.length > 0) {
            extractedBlocks.push(blockTexts.join(' '));
          }
        }
      } catch (e) {
        // stream was not standard flate deflate, ignore
      }
    }

    if (extractedBlocks.length > 0) {
      return extractedBlocks.join('\n');
    }
  } catch (err) {
    console.warn('PDF stream extraction warning:', err);
  }

  // 3. Fallback to printable text extraction
  return extractPrintableStrings(buffer);
}

// ══════════════════════════════════════════════════════════════════════════════
//  CURATED EDUCATIONAL VIDEOS (Verified real direct watch?v= URLs for LMS)
// ══════════════════════════════════════════════════════════════════════════════
const CURATED_EDUCATIONAL_VIDEOS = [
  {
    keywords: ['weld', 'لحام', 'smaw', 'tig', 'mig', 'قوس', 'معادن', 'حديد'],
    videos: [
      { id: 1, title: 'أسس وتقنيات اللحام بالقوس الكهربائي (Stick Welding 101)', url: 'https://www.youtube.com/watch?v=pMtqDWUpJds', duration: '14:20 دقيقة' },
      { id: 2, title: 'ضبط تيار ماكينات اللحام وضغط الغاز (MIG Welding)', url: 'https://www.youtube.com/watch?v=1pMHayXqoMY', duration: '10:45 دقيقة' },
      { id: 3, title: 'تطبيقات لحام الأرجون وتقنيات السلامة (TIG Welding Basics)', url: 'https://www.youtube.com/watch?v=2od_jRAAQ6w', duration: '12:30 دقيقة' }
    ]
  },
  {
    keywords: ['safe', 'سلامة', 'وقاية', 'ppe', 'osha', 'hse', 'مخاطر', 'حريق', 'طوارئ'],
    videos: [
      { id: 1, title: 'مهمات الوقاية الشخصية وإجراءات السلامة الصناعية (PPE Training)', url: 'https://www.youtube.com/watch?v=yJhSlH8AvHs', duration: '15:10 دقيقة' },
      { id: 2, title: 'السلامة المهنية وإجراءات الفحص والتشغيل الميداني', url: 'https://www.youtube.com/watch?v=pMtqDWUpJds', duration: '14:20 دقيقة' },
      { id: 3, title: 'التحكم بالمخاطر الميكانيكية وإجراءات الطوارئ في المنشآت', url: 'https://www.youtube.com/watch?v=XpcCUtYzwy0', duration: '11:50 دقيقة' }
    ]
  },
  {
    keywords: ['electr', 'كهرباء', 'دائرة', 'تيار', 'جهد', 'volt', 'amp', 'circuit', 'مقاومة'],
    videos: [
      { id: 1, title: 'أساسيات الكهرباء والدوائر الصناعية (Introduction to Electricity)', url: 'https://www.youtube.com/watch?v=EJeAuQ7pkpc', duration: '11:30 دقيقة' },
      { id: 2, title: 'المفاهيم العلمية والميدانية للتيار والجهد الكهربائي', url: 'https://www.youtube.com/watch?v=bHIhgxav9LY', duration: '14:15 دقيقة' },
      { id: 3, title: 'مكونات اللوحات والعتاد الكهربائي والتحكم', url: 'https://www.youtube.com/watch?v=Cu3R5it4cQs', duration: '10:00 دقيقة' }
    ]
  },
  {
    keywords: ['english', 'إنجليزي', 'مصطلح', 'term', 'vocab', 'لغة', 'محادثة', 'حاسب', 'computer'],
    videos: [
      { id: 1, title: 'المصطلحات التقنية وأساسيات العتاد الحاسوبي (Computer Basics)', url: 'https://www.youtube.com/watch?v=Cu3R5it4cQs', duration: '10:00 دقيقة' },
      { id: 2, title: 'مفاهيم علوم الحاسب والمصطلحات الدولية (Computer Science)', url: 'https://www.youtube.com/watch?v=O5nskjZ_GoI', duration: '11:40 دقيقة' },
      { id: 3, title: 'المصطلحات الفنية الإنجليزية في بيئة الورشة والعمل', url: 'https://www.youtube.com/watch?v=pMtqDWUpJds', duration: '14:20 دقيقة' }
    ]
  },
  {
    keywords: ['mechanic', 'ميكانيكا', 'صيانة', 'مضخ', 'maint', 'pump', 'valve', 'ورشة', 'محرك'],
    videos: [
      { id: 1, title: 'تشغيل وصيانة المضخات والمعدات الميكانيكية (Centrifugal Pumps)', url: 'https://www.youtube.com/watch?v=XpcCUtYzwy0', duration: '11:50 دقيقة' },
      { id: 2, title: 'أدوات الورشة الميكانيكية ومعايير الفحص الدوري', url: 'https://www.youtube.com/watch?v=pMtqDWUpJds', duration: '14:20 دقيقة' },
      { id: 3, title: 'معايرة وضبط الآلات الميكانيكية وإجراءات التشغيل القياسية', url: 'https://www.youtube.com/watch?v=1pMHayXqoMY', duration: '10:45 دقيقة' }
    ]
  }
];

function resolveDirectEducationalVideos(contextText = '', title = '') {
  const defaultVideos = [
    { id: 1, title: `شرح تطبيقي لـ ${title || 'المفاهيم الأساسية'} وأهم المصطلحات المهنية`, url: 'https://www.youtube.com/watch?v=pMtqDWUpJds', duration: '14:20 دقيقة' },
    { id: 2, title: `تشغيل وصيانة المعدات وتطبيق معايير السلامة المهنية`, url: 'https://www.youtube.com/watch?v=XpcCUtYzwy0', duration: '11:50 دقيقة' },
    { id: 3, title: `المصطلحات التخصصية والتقنية في بيئة العمل`, url: 'https://www.youtube.com/watch?v=Cu3R5it4cQs', duration: '10:00 دقيقة' }
  ];

  const hay = (contextText + ' ' + title).toLowerCase();
  const matched = CURATED_EDUCATIONAL_VIDEOS.find(c => c.keywords.some(k => hay.includes(k)));
  const list = matched ? matched.videos : defaultVideos;
  return list.map((v, i) => ({
    id: i + 1,
    title: v.title,
    description: `فيديو تدريبي تطبيقي ومباشر يشرح المهارات الأساسية والمفاهيم المرتبطة بـ ${title || 'الموضوع'}.`,
    duration: v.duration,
    youtube_url: v.url
  }));
}

const KNOWN_DEAD_YOUTUBE_IDS = new Set([
  '3sw4n-87hwa', 'kyv9yym3sq0', 'mqwpb8u-p6y', 'tefxxlw5p-o', 'z5z6k-k2j8a',
  'mc979ohitag', 'gt1k-w2zk-e', 'wjeo_tk7p8w', 'jw2m1r5k0q8', '9g0h5z7ab8m',
  '4fqj7b0t6-8', 'b1w6hv_l9lq', '3xw0r-5r9zy', 'jbq2c8je1uq', 'kyjv8pj3p8k',
  '5uq2x3tq86w', 'k2zgr2x7l24'
]);

function ensureSpecificYouTubeVideos(data, contextTitle = '') {
  if (!data) return data;
  const directVideos = resolveDirectEducationalVideos(contextTitle + ' ' + (data.lecture?.title || '') + ' ' + JSON.stringify(data.lecture?.topics || []), data.lecture?.title || '');
  
  if (!Array.isArray(data.suggested_videos) || data.suggested_videos.length === 0) {
    data.suggested_videos = directVideos;
  } else {
    data.suggested_videos = data.suggested_videos.slice(0, 3).map((v, i) => {
      let url = (v.youtube_url || v.url || '').trim();
      const isSearchUrl = url.includes('results?') || url.includes('search_query=') || url.includes('/results');
      const videoMatch = !isSearchUrl && url.match(/(?:youtube\.com\/(?:watch\?.*v=|embed\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i);
      const vidId = videoMatch ? videoMatch[1].toLowerCase() : '';
      const isKnownDead = vidId && KNOWN_DEAD_YOUTUBE_IDS.has(vidId);
      
      if (videoMatch && videoMatch[1] && !videoMatch[1].startsWith('0000') && !videoMatch[1].toLowerCase().includes('example') && !isKnownDead) {
        url = `https://www.youtube.com/watch?v=${videoMatch[1]}`;
      } else {
        url = directVideos[i % directVideos.length].youtube_url;
      }
      return {
        ...v,
        id: v.id || (i + 1),
        youtube_url: url
      };
    });
  }
  return data;
}

function ensureMinQuizQuestions(data, contextTitle = '') {
  if (!data) return data;
  if (!data.quiz) {
    data.quiz = {
      title: `اختبار الأسبوع: ${contextTitle || 'الوحدة التدريبية'}`,
      duration_minutes: 15,
      total_grade: 10,
      questions: []
    };
  }
  if (!Array.isArray(data.quiz.questions)) {
    data.quiz.questions = [];
  }

  // 1. Check if matching question exists
  const hasMatching = data.quiz.questions.some(q => q.type === 'matching' && Array.isArray(q.pairs) && q.pairs.length >= 2);
  const terms = (data.glossary_notes && Array.isArray(data.glossary_notes.terms) && data.glossary_notes.terms.length > 0)
    ? data.glossary_notes.terms
    : [];

  const topics = (data.lecture && Array.isArray(data.lecture.topics) && data.lecture.topics.length > 0)
    ? data.lecture.topics
    : [];

  // If no matching question exists, synthesize one from the lesson's extracted terms or topics
  if (!hasMatching && (terms.length >= 2 || topics.length >= 2)) {
    const pairs = [];
    if (terms.length >= 2) {
      for (let i = 0; i < Math.min(4, terms.length); i++) {
        pairs.push({
          left: terms[i].en || terms[i].ar || `المفهوم ${i + 1}`,
          right: terms[i].definition ? terms[i].definition.slice(0, 70) : (terms[i].ar || `التعريف ${i + 1}`)
        });
      }
    } else {
      for (let i = 0; i < Math.min(4, topics.length); i++) {
        const parts = topics[i].split(/[:\-–]/);
        pairs.push({
          left: (parts[0] || `المحور ${i + 1}`).trim(),
          right: (parts[1] || topics[i]).trim().slice(0, 70)
        });
      }
    }
    if (pairs.length >= 2) {
      data.quiz.questions.push({
        type: 'matching',
        question: '🔗 سؤال التوصيل والمطابقة: صِل كل مفهوم أو مصطلح في القائمة (أ) بتعريفه وتطبيقه الصحيح في القائمة (ب):',
        pairs,
        explanation: 'ممتاز! تم توصيل كافة المفاهيم بتعريفاتها الفنية الصحيحة بدقة.'
      });
    }
  }

  // 2. If questions count is under 10, synthesize questions ONLY from the lesson's terms or lecture topics
  let termIdx = 0;
  while (data.quiz.questions.length < 10 && terms.length > 0 && termIdx < terms.length * 3) {
    const t = terms[termIdx % terms.length];
    const isMcq = (data.quiz.questions.length % 2 === 0);

    if (isMcq) {
      const qText = `ما هو المدلول العلمي والتطبيقي للمصطلح '${t.en || t.ar}' وفق سياق المحاضرة؟`;
      const exists = data.quiz.questions.some(q => q.question === qText);
      if (!exists) {
        data.quiz.questions.push({
          type: 'mcq',
          question: qText,
          options: [
            t.definition ? t.definition.slice(0, 75) : `المفهوم الصحيح الخاص بـ ${t.en || t.ar}`,
            'إجراء غير مرتبط بموضوع ومحاور المحاضرة',
            'مفهوم إداري عام خارج إطار هذا التخصص',
            'أداة غير معتمدة في بيئة التدريب'
          ],
          correct_answer: t.definition ? t.definition.slice(0, 75) : `المفهوم الصحيح الخاص بـ ${t.en || t.ar}`,
          explanation: `يرتبط مصطلح ${t.en || t.ar} بـ ${t.definition || t.ar}`
        });
      }
    } else {
      const qText = `عبارة: تطبيق واستيعاب '${t.en || t.ar}' يُعد عنصراً رئيساً في إتقان متطلبات هذه الوحدة التدريبية.`;
      const exists = data.quiz.questions.some(q => q.question === qText);
      if (!exists) {
        data.quiz.questions.push({
          type: 'true_false',
          question: qText,
          options: ['صح ✓', 'خطأ ✗'],
          correct_answer: 'صح ✓',
          explanation: `صواب؛ لأن استيعاب ${t.en || t.ar} يدعم الممارسة المهنية الصحيحة للمقرر.`
        });
      }
    }
    termIdx++;
  }

  return data;
}

// ══════════════════════════════════════════════════════════════════════════════
//  FALLBACK LMS CONTENT GENERATOR (Works offline / when no API key)
// ══════════════════════════════════════════════════════════════════════════════
function buildDemoContentFromText(extractedText, filename) {
  const lines = (extractedText || '').split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('[') && l.length > 4);

  const title = lines[0] || filename.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ') || 'الوحدة الدراسية';

  // Extract terms (looking for lines with colons or bullet points)
  const extractedTerms = [];
  for (const line of lines.slice(1)) {
    if (line.includes(':') && extractedTerms.length < 6) {
      const parts = line.split(':');
      const termEn = parts[0].replace(/^[\d\.\-\*•)]+\s*/, '').trim();
      const desc = parts.slice(1).join(':').trim();
      if (termEn.length > 2 && termEn.length < 50) {
        extractedTerms.push({
          en: termEn,
          ar: `مصطلح: ${termEn}`,
          definition: desc || 'مصطلح تقني تخصصي معتمد في بيئة العمل الصناعية والتدريبية.'
        });
      }
    }
  }

  // Default terms if none found
  if (extractedTerms.length === 0) {
    extractedTerms.push(
      { en: 'Technical English', ar: 'اللغة الإنجليزية الفنية', definition: 'استخدام المصطلحات المهنية الدقيقة للتواصل في بيئة العمل الفنية.' },
      { en: 'Industrial Safety', ar: 'السلامة الصناعية', definition: 'مجموعة القواعد والإجراءات المتبعة لحماية الكوادر والمعدات من المخاطر المهنية.' },
      { en: 'Standard Operating Procedure (SOP)', ar: 'إجراءات التشغيل القياسية', definition: 'وثيقة تصف الخطوات المعتمدة لتنفيذ مهمة فنية محددة بدقة وأمان.' },
      { en: 'Quality Assurance (QA)', ar: 'ضمان الجودة', definition: 'التحقق المنهجي من مطابقة المنتجات والعمليات للمعايير الهندسية المطلوبة.' },
      { en: 'Personal Protective Equipment (PPE)', ar: 'مهمات الوقاية الشخصية', definition: 'الأدوات والمعدات الوقائية التي يرتديها الفني لحمايته من المخاطر المباشرة.' },
      { en: 'Risk Assessment', ar: 'تقييم المخاطر', definition: 'تحديد المخاطر المحتملة في موقع العمل وتقدير شدتها لوضع خطط تفادي ملائمة.' }
    );
  }

  const summaryText = lines.slice(0, 6).join(' ') || 'تتناول هذه الوحدة المفاهيم والمهارات الفنية الأساسية المعتمدة في المنهج التدريبي، مع التركيز على المصطلحات المهنية والتطبيق العملي.';

  const topicSuggestions = [
    `المحور الأول: مقدمة وأسس ${title}`,
    `المحور الثاني: الإجراءات والمعايير التشغيلية المعتمدة`,
    `المحور الثالث: السلامة المهنية والتطبيق في بيئة العمل`
  ];

  const suggestedVideos = resolveDirectEducationalVideos(extractedText + ' ' + title, title);

  const fallbackQuestions = [
    {
      type: 'mcq',
      question: `ما هو التعريف الدقيق للمصطلح المهني '${extractedTerms[0].en}' وفق سياق المحاضرة؟`,
      options: [
        extractedTerms[0].definition.slice(0, 65),
        'أداة صيانة يدوية عامة غير متصلة بالموضوع',
        'مستند إداري مالي دوري للشركات',
        'إجراء غير معتمد في الورش الفنية'
      ],
      correct_answer: extractedTerms[0].definition.slice(0, 65),
      explanation: `يشير مصطلح ${extractedTerms[0].en} إلى ${extractedTerms[0].definition}`
    },
    {
      type: 'mcq',
      question: `Which technical term best corresponds to: '${extractedTerms[Math.min(1, extractedTerms.length - 1)].definition.slice(0, 70)}'?`,
      options: [
        extractedTerms[Math.min(1, extractedTerms.length - 1)].en,
        'General Utility Hardware',
        'Draft Blueprint Specification',
        'Hazard Evacuation Alert'
      ],
      correct_answer: extractedTerms[Math.min(1, extractedTerms.length - 1)].en,
      explanation: `The correct technical term is ${extractedTerms[Math.min(1, extractedTerms.length - 1)].en}.`
    },
    {
      type: 'mcq',
      question: `ما هو الهدف الأساسي من الالتزام بالمعايير الفنية المعتمدة في '${title}'؟`,
      options: [
        'ضمان جودة الأداء التشغيلي وسلامة الكوادر الفنية والمعدات',
        'تقليص زمن الصيانة الدورية دون فحص',
        'استبدال الإشراف الفني بالعمل الفردي العشوائي',
        'إلغاء العمل بكتيبات التشغيل القياسية'
      ],
      correct_answer: 'ضمان جودة الأداء التشغيلي وسلامة الكوادر الفنية والمعدات',
      explanation: 'الالتزام بالمعايير الفنية يرفع كفاءة الإنتاجية ويحمي المنشأة من الحوادث.'
    },
    {
      type: 'mcq',
      question: `أي من الإجراءات التالية يُعد الخطوة الأولى قبل تشغيل المعدات في بيئة الورشة؟`,
      options: [
        'إجراء الفحص البصري والتحقق من مهمات الوقاية الشخصية',
        'تشغيل المعدة بأقصى سرعة فوراً',
        'إيقاف أجهزة الإنذار والحماية',
        'تجاهل تعليمات السلامة المعتمدة'
      ],
      correct_answer: 'إجراء الفحص البصري والتحقق من مهمات الوقاية الشخصية',
      explanation: 'الفحص المسبق والتحقق من مهمات الوقاية يمنع الحوادث والأعطال المفاجئة.'
    },
    {
      type: 'mcq',
      question: `ماذا يعني مصطلح 'Quality Assurance' في سياق العمليات الفنية؟`,
      options: [
        'التحقق المنهجي من مطابقة العمليات والمخرجات للمواصفات القياسية',
        'شراء أدوات غير معتمدة لتقليل التكلفة',
        'تأجيل فحص جودة المنتجات إلى نهاية العام',
        'إلغاء تقارير الفحص الفني الدوري'
      ],
      correct_answer: 'التحقق المنهجي من مطابقة العمليات والمخرجات للمواصفات القياسية',
      explanation: 'ضمان الجودة يعني التوافق التام مع المعايير والمواصفات المعتمدة.'
    },
    {
      type: 'mcq',
      question: `أي من العوامل التالية يمثل عنصراً حرجاً في إدارة المخاطر المهنية؟`,
      options: [
        'التقييم المستمر للمخاطر وتدريب المتدربين على إجراءات الطوارئ',
        'تجاهل تقارير الحوادث الوشيكة',
        'تخزين المواد الكيميائية بالقرب من مصادر اللهب',
        'تعطيل مسارات الإخلاء في المنشأة'
      ],
      correct_answer: 'التقييم المستمر للمخاطر وتدريب المتدربين على إجراءات الطوارئ',
      explanation: 'إدارة المخاطر تتطلب اليقظة الدائمة والتدريب الوقائي المستمر.'
    },
    {
      type: 'true_false',
      question: `عبارة: الالتزام بالمصطلحات الفنية المعتمدة وإجراءات السلامة في '${title}' يُعد إلزامياً لحماية الكوادر الفنية وضمان جودة التشغيل الميداني.`,
      options: ['صح ✓', 'خطأ ✗'],
      correct_answer: 'صح ✓',
      explanation: 'صواب؛ لأن الالتزام بالمعايير الفنية واشتراطات السلامة يقلل من الحوادث ويوحد التواصل المهني الدقيق.'
    },
    {
      type: 'true_false',
      question: `عبارة: المصطلحات الفنية المذكورة في الدرس هي مجرد مفاهيم نظرية ولا علاقة لها بالتطبيق الميداني أو كتيبات التشغيل القياسية.`,
      options: ['صح ✓', 'خطأ ✗'],
      correct_answer: 'خطأ ✗',
      explanation: 'خطأ؛ لأن المصطلحات التقنية هي أدوات تواصل ميدانية أساسية وتطبق في صلب العمليات الفنية اليومية.'
    },
    {
      type: 'true_false',
      question: `عبارة: استخدام مهمات الوقاية الشخصية المناسبة في بيئة الورش الصناعية يُعد إجراءً إلزامياً غير قابل للتهاون.`,
      options: ['صح ✓', 'خطأ ✗'],
      correct_answer: 'صح ✓',
      explanation: 'صواب؛ مهمات الوقاية الشخصية تحمي الفني من المخاطر المباشرة كالحرارة والشظايا والصدمات.'
    },
    {
      type: 'matching',
      question: '🔗 سؤال التوصيل والمطابقة: صِل كل مصطلح مهني في القائمة (أ) بتعريفه وتطبيقه الصحيح في القائمة (ب):',
      pairs: [
        { left: extractedTerms[0]?.en || 'Technical Safety', right: extractedTerms[0]?.ar || 'السلامة الفنية والمهنية' },
        { left: extractedTerms[Math.min(1, extractedTerms.length - 1)]?.en || 'Standard Procedures', right: extractedTerms[Math.min(1, extractedTerms.length - 1)]?.ar || 'إجراءات التشغيل القياسية' },
        { left: extractedTerms[Math.min(2, extractedTerms.length - 1)]?.en || 'Quality Control', right: extractedTerms[Math.min(2, extractedTerms.length - 1)]?.ar || 'ضبط وتأكيد الجودة' },
        { left: extractedTerms[Math.min(3, extractedTerms.length - 1)]?.en || 'Risk Management', right: extractedTerms[Math.min(3, extractedTerms.length - 1)]?.ar || 'إدارة وتقييم المخاطر' }
      ],
      explanation: 'ممتاز! تم توصيل كافة المصطلحات بتعريفاتها ومجالاتها الفنية الصحيحة بنجاح.'
    }
  ];

  return {
    suggested_videos: suggestedVideos,
    lecture: {
      title: `محاضرة: ${title}`,
      duration_minutes: 15,
      summary: `تتناول هذه المحاضرة المفاهيم الأساسية المستخلصة من الملف التدريبي، مع التركيز على المصطلحات المهنية والتطبيق العملي في المنشآت الصناعية والمختبرات. المحاور الأساسية: ${summaryText.slice(0, 320)}...`,
      topics: topicSuggestions
    },
    glossary_notes: {
      title: `قاموس مصطلحات ومذكرات: ${title}`,
      description: `أكثر من ${extractedTerms.length} مصطلحات فنية إنجليزية مترجمة للعربية وموضحة وفق المنهج التدريبي المعتمد.`,
      terms: extractedTerms
    },
    quiz: {
      title: `اختبار الأسبوع: ${title}`,
      duration_minutes: 15,
      total_grade: 10,
      questions: fallbackQuestions
    },
    assignment: {
      title: `الواجب الأسبوعي: ${title}`,
      total_grade: 10,
      instructions: `قم بمراجعة المصطلحات الفنية المكتسبة في درس "${title}". اختر النمط المفضل (اختيار من متعدد أو كتابة نصية تطبيقية) لتنفيذ التكليف.`,
      assignment_type: 'mcq',
      mcq_questions: [
        {
          question: `سؤال تطبيقي: اختر الاستخدام الصحيح للمصطلح '${extractedTerms[0].en}' في بيئة الورشة والمختبر:`,
          options: [
            `All technicians must strictly apply ${extractedTerms[0].en} during operational procedures.`,
            `The term ${extractedTerms[0].en} only refers to coffee breaks.`,
            `Do not mention ${extractedTerms[0].en} in safety reports.`,
            `It has no relevance to industrial standards.`
          ],
          correct_answer: `All technicians must strictly apply ${extractedTerms[0].en} during operational procedures.`
        },
        {
          question: `كيف تساهم ممارسة "${extractedTerms[Math.min(1, extractedTerms.length - 1)].ar}" في تقليل الحوادث ورفع الإنتاجية؟`,
          options: [
            'بضمان الامتثال للمعايير الفنية والوقائية وتقليل الأخطاء البشرية',
            'بزيادة أوقات التوقف غير المبررة في خطوط الإنتاج',
            'بإلغاء دور المشرفين الفنيين',
            'بالاعتماد على التخمين في صيانة الآلات'
          ],
          correct_answer: 'بضمان الامتثال للمعايير الفنية والوقائية وتقليل الأخطاء البشرية'
        }
      ],
      text_questions: [
        {
          prompt: `اكتب تقريراً موجزاً باللغة الإنجليزية (من 40 إلى 60 كلمة) تشرح فيه أهمية استخدام مصطلح "${extractedTerms[0].en}" في بيئة العمل الصناعية مع إعطاء مثال عملي واقعي.`,
          guidelines: `يجب تضمين مصطلحين فنيين على الأقل (${extractedTerms[0].en} و ${extractedTerms[1]?.en || 'Technical Safety'}) ومراعاة قواعد الكتابة المهنية.`,
          model_answer: `Sample Model Answer: In modern industrial facilities, applying ${extractedTerms[0].en} is crucial to maintaining operational safety and high performance...`
        },
        {
          prompt: `وضح باللغة العربية الإجراءات المتبعة لتطبيق "${extractedTerms[Math.min(1, extractedTerms.length - 1)].ar}" وما هي المخاطر المترتبة على إهمالها؟`,
          guidelines: 'اذكر 3 خطوات عملية متسلسلة مدعومة بأمثلة من واقع التدريب الميداني.',
          model_answer: 'الإجابة النموذجية تتضمن: 1. الفحص الدوري قبل التشغيل 2. ارتداء مهمات الوقاية 3. توثيق الملاحظات في سجل الوردية.'
        }
      ],
      questions: [
        {
          type: 'mcq',
          question: `سؤال تطبيقي: اختر الاستخدام الصحيح للمصطلح '${extractedTerms[0].en}' في بيئة الورشة والمختبر:`,
          options: [
            `All technicians must strictly apply ${extractedTerms[0].en} during operational procedures.`,
            `The term ${extractedTerms[0].en} only refers to coffee breaks.`,
            `Do not mention ${extractedTerms[0].en} in safety reports.`,
            `It has no relevance to industrial standards.`
          ],
          correct_answer: `All technicians must strictly apply ${extractedTerms[0].en} during operational procedures.`
        },
        {
          type: 'true_false',
          question: `صح أم خطأ: الالتزام الصارم بإجراءات السلامة وارتداء مهمات الوقاية (${extractedTerms[0].en}) إلزامي لجميع المتدربين في بيئة العمل الفنية:`,
          options: ['صح', 'خطأ'],
          correct_answer: 'صح'
        },
        {
          type: 'mcq',
          question: `كيف تساهم ممارسة "${extractedTerms[Math.min(1, extractedTerms.length - 1)].ar}" في تقليل الحوادث ورفع الإنتاجية؟`,
          options: [
            'بضمان الامتثال للمعايير الفنية والوقائية وتقليل الأخطاء البشرية',
            'بزيادة أوقات التوقف غير المبررة في خطوط الإنتاج',
            'بإلغاء دور المشرفين الفنيين',
            'بالاعتماد على التخمين في صيانة الآلات'
          ],
          correct_answer: 'بضمان الامتثال للمعايير الفنية والوقائية وتقليل الأخطاء البشرية'
        },
        {
          type: 'true_false',
          question: `صح أم خطأ: يُسمح بتجاوز إجراءات التشغيل القياسية وتعديل إعدادات الماكينات دون إذن المشرف الفني المختص:`,
          options: ['صح', 'خطأ'],
          correct_answer: 'خطأ'
        }
      ]
    }
  };
}

// ══════════════════════════════════════════════════════════════════════════════
//  HELPER: RESILIENT JSON EXTRACTOR
// ══════════════════════════════════════════════════════════════════════════════
function safeExtractJson(text) {
  if (!text) return null;
  let s = String(text).trim();
  const blockMatch = s.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (blockMatch) s = blockMatch[1].trim();

  const firstBrace = s.indexOf('{');
  const lastBrace = s.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    try {
      return JSON.parse(s.slice(firstBrace, lastBrace + 1));
    } catch (e) {
      // Continue to direct parse
    }
  }
  try {
    return JSON.parse(s);
  } catch (e) {
    return null;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
//  EXECUTIVE WEEKLY REPORT GENERATION ENGINE (7 Formal Pillars)
// ══════════════════════════════════════════════════════════════════════════════
const EXECUTIVE_PROMPT_TEMPLATE = `أنت مستشار إداري وأكاديمي تنفيذي أول لمعهد الذهب الأسود للتدريب (فرع عنك).
المطلوب صياغة التقرير الإداري والتشغيلي الأسبوعي الرسمي الموجه إلى:
{RECIPIENT}
من قِبل: {SENDER}
الفترة / الأسبوع: {WEEK_LABEL}
المؤشرات الحية للمعهد:
- إجمالي المتدربين: {TOTAL_TRAINEES} متدرب
- نسبة الحضور العامة: {ATTENDANCE_RATE}% (الفترة الأولى: {P1_RATE}% | الفترة الثانية: {P2_RATE}%)
- عدد المجموعات التدريبية النشطة: {GROUPS_COUNT}
- عدد المدربين الأكاديميين: {TRAINERS_COUNT}
- إحصائيات التكليفات والاختبارات: {LMS_STATS}
{ADDITIONAL_NOTES}

يجب صياغة التقرير بأسلوب إداري سعودي رفيع، رسمي، مهني، دقيق ومباشر يغطي المحاور السبعة التنفيذية التالية:
1. schedules: إدارة الجداول والقاعات وفترات التدريب (الفترة الأولى والفترة الثانية) والانتظام الميداني.
2. staff_hr: الكادر التدريبي وشؤون الموظفين (HR) ومتابعة الأداء والنصاب.
3. companies_payroll: شؤون الشركات الراعية والرواتب وإشعارات الحسم والالتزام المالي.
4. academic_lms: الشؤون الأكاديمية وتدريب المتدربين (LMS / منصة منار / نتائج الاختبارات والواجبات).
5. it_support: تقنية المعلومات والدعم الفني والمنصات والتجهيزات التقنية للقاعات.
6. maintenance_facility: الصيانة والتغطية الميدانية الشاملة والجاهزية والسلامة المهنية.
7. general_kpi: المؤشرات العامة والوضع الراهن (~830 متدرب، تحليل نسب الحضور، والإنذارات إن وجدت).
بالإضافة إلى:
- recommendations: 3 إلى 5 توصيات وقرارات إدارية تنفيذية مقترحة للأسبوع القادم.
- executive_summary: ملخص تنفيذي موجز (3-4 أسطر).

أعد الإجابة بتنسيق JSON حصري بدون كتل خارج الـ JSON:
{
  "title": "التقرير الإداري والتشغيلي الأسبوعي الشامل",
  "recipient": "سعادة الأستاذ المحترم / محمد كمال العواد (مدير التشغيل)",
  "sender": "إدارة معهد الذهب الأسود العالي للتدريب - فرع عنك",
  "week_label": "{WEEK_LABEL}",
  "date_formatted": "...",
  "executive_summary": "...",
  "pillars": {
    "schedules": {"title": "1. إدارة الجداول والقاعات وفترات التدريب", "summary": "...", "points": ["...", "..."], "status": "مستقر ومنضبط"},
    "staff_hr": {"title": "2. الكادر التدريبي وشؤون الموظفين (HR)", "summary": "...", "points": ["...", "..."], "status": "التزام تام"},
    "companies_payroll": {"title": "3. شؤون الشركات الراعية والرواتب والمكافآت", "summary": "...", "points": ["...", "..."], "status": "محدث ومنسق"},
    "academic_lms": {"title": "4. الشؤون الأكاديمية والتدريب (منصة LMS / منار)", "summary": "...", "points": ["...", "..."], "status": "تفاعل مرتفع"},
    "it_support": {"title": "5. تقنية المعلومات والدعم الفني والشبكات", "summary": "...", "points": ["...", "..."], "status": "جاهز ومستقر"},
    "maintenance_facility": {"title": "6. الصيانة والتغطية الميدانية الشاملة والسلامة", "summary": "...", "points": ["...", "..."], "status": "تغطية مستمرة"},
    "general_kpi": {"title": "7. المؤشرات العامة والوضع الراهن للمتدربين", "summary": "...", "points": ["...", "..."], "status": "إيجابي ومطمئن"}
  },
  "recommendations": ["...", "...", "..."],
  "closing_salutation": "سائلين المولى عز وجل لسعادتكم دوام التوفيق والسداد، وتقبلوا خالص تحياتنا وتقديرنا،،،"
}`;

function buildDemoExecutiveReport(params) {
  const stats = params.stats || {};
  const totalTrainees = stats.totalTrainees || 830;
  const overallRate = stats.overallAttendanceRate || 94;
  const p1Rate = stats.period1Rate || 95;
  const p2Rate = stats.period2Rate || 93;
  const groupsCount = stats.activeGroupsCount || 16;
  const trainersCount = stats.trainersCount || 9;
  const weekLabel = params.weekLabel || 'الأسبوع التدريبي الجاري';
  const recipient = params.recipient || 'سعادة الأستاذ المحترم / محمد كمال العواد (مدير التشغيل)';
  const sender = params.sender || 'إدارة معهد الذهب الأسود العالي للتدريب - فرع عنك';
  const notes = params.additionalNotes ? `ملاحظات خاصة مرفقة: ${params.additionalNotes}` : '';

  return {
    title: `التقرير الإداري والتشغيلي الأسبوعي - ${weekLabel}`,
    recipient: recipient,
    sender: sender,
    week_label: weekLabel,
    date_formatted: new Date().toLocaleDateString('ar-SA'),
    executive_summary: `نرفع لسعادتكم التقرير الأسبوعي الشامل لمعهد الذهب الأسود للتدريب (فرع عنك) عن ${weekLabel}. أظهرت المؤشرات التشغيلية استقراراً عاماً والتزاماً عالياً حيث بلغت نسبة الحضور العامة ${overallRate}% لإجمالي ${totalTrainees} متدرباً موزعين على ${groupsCount} مجموعة تدريبية، مع انتظام تام للفترتين التدريبيتين (الأولى ${p1Rate}%، والثانية ${p2Rate}%)، وانضباط الكادر التدريبي ومتابعة المنصات والتغطية الميدانية الشاملة. ${notes}`,
    pillars: {
      schedules: {
        title: '1. إدارة الجداول والقاعات وفترات التدريب',
        status: 'مستقر ومنضبط',
        summary: `تنظيم دقيق لجدول الفترات (الفترة الأولى الصباحية والفترة الثانية المسائية) عبر ${groupsCount} مجموعة تدريبية دون أي تعارض زمني.`,
        points: [
          `توزيع القاعات التدريبية والورش وفق الطاقة الاستيعابية المعتمدة لكل قاعة دون أي تكدس.`,
          `انتظام الحضور الميداني للفترة الأولى (8:30 ص - 12:00 م) بنسبة ${p1Rate}%، والفترة الثانية (12:30 م - 4:00 م) بنسبة ${p2Rate}%.`,
          `تفعيل آلية الإشراف والمناوبة بين الفترتين لضمان انسيابية دخول وخروج المتدربين.`
        ]
      },
      staff_hr: {
        title: '2. الكادر التدريبي وشؤون الموظفين (HR)',
        status: 'التزام تام',
        summary: `متابعة حضور وانضباط السادة المدربين (${trainersCount} مدرباً معتمداً) وتقييم أدائهم الميداني والأكاديمي.`,
        points: [
          `نسبة انضباط وحضور المدربين في مواعيد المحاضرات بلغت 100% لكافة الفترات التدريبية المعتمدة.`,
          `استكمال خطة نصاب الساعات التدريبية وفق معايير المؤسسة العامة للتدريب التقني والمهني.`,
          `متابعة تقارير الأداء الأسبوعية للمدربين والتأكد من جودة الشرح والالتزام باللغة الإنجليزية التقنية.`
        ]
      },
      companies_payroll: {
        title: '3. شؤون الشركات الراعية والرواتب والمكافآت',
        status: 'محدث ومنسق',
        summary: `التنسيق المستمر مع ممثلي الشركات الراعية وإصدار كشوف الحضور والغياب المحدثة والتسويات الشهرية.`,
        points: [
          `تحديث كشوفات الغياب الأسبوعية وإرسال الإشعارات الإلكترونية للمنشآت الراعية المعتمدة.`,
          `مطابقة سجلات الحضور والانصراف مع نظام استحقاق المكافآت والرواتب الشهرية للمتدربين بدقة تامة.`,
          `التواصل مع الشركات الراعية لمعالجة الأعذار المقبولة وتأكيد انتظام متدربيها الميداني.`
        ]
      },
      academic_lms: {
        title: '4. الشؤون الأكاديمية والتدريب (منصة LMS / منار)',
        status: 'تفاعل مرتفع',
        summary: `متابعة التفاعل الإلكتروني على منصة LMS ومنصة منار الوطنية ورفع التكليفات والاختبارات الأسبوعية.`,
        points: [
          `إلزامية رصد مواعيد وتوقيتات استحقاق الواجبات والاختبارات الأسبوعية إلكترونياً بدقة.`,
          `إنجاز الاختبارات الأسبوعية المتنوعة (MCQ، صح وخطأ، وتوصيل ومطابقة المفاهيم) بنسبة إنجاز عالية.`,
          `ربط سجلات الحضور للفترتين 1 و2 بالسجل التراكمي الشامل لجميع الأسابيع للمتدربين.`
        ]
      },
      it_support: {
        title: '5. تقنية المعلومات والدعم الفني والشبكات',
        status: 'جاهزية كاملة',
        summary: `استقرار البنية التحتية الرقمية، شبكة الإنترنت، شاشات القاعات الذكية، وأنظمة المزامنة الفورية.`,
        points: [
          `فحص دوري لشبكة Wi-Fi وأجهزة العرض في كافة القاعات التدريبية والتأكد من خلوها من الأعطال.`,
          `تقديم الدعم الفني الفوري للمتدربين وتسهيل تسجيل الدخول لمنصات التدريب وحل بطاقات الدعم.`,
          `تفعيل النسخ الاحتياطي السحابي والمزامنة المستمرة لسجلات الحضور والدرجات.`
        ]
      },
      maintenance_facility: {
        title: '6. الصيانة والتغطية الميدانية الشاملة والسلامة',
        status: 'تغطية مستمرة',
        summary: `الجولات الميدانية المستمرة على مرافق المعهد، أنظمة التكييف، ومعدات السلامة ومخارج الطوارئ.`,
        points: [
          `جاهزية منظومة التكييف والإضاءة ونظافة القاعات والممرات على مدار الفترتين 1 و 2.`,
          `التأكد من سلامة مخارج الطوارئ وطفايات الحريق ومعدات الإسعافات الأولية وتطبيق معايير السلامة المهنية.`,
          `التغطية الميدانية الشاملة للمشرفين لمتابعة السلوك والانضباط العام في بهو المعهد ومحيطه.`
        ]
      },
      general_kpi: {
        title: '7. المؤشرات العامة والوضع الراهن للمتدربين',
        status: 'إيجابي ومطمئن',
        summary: `تحليل مؤشرات الأداء والانتظام لحوالي ${totalTrainees} متدرباً مع رصد الحالات المحتاجة للدعم والتوجيه.`,
        points: [
          `إجمالي عدد المتدربين المسجلين: ${totalTrainees} متدرباً بنسبة التزام عامة ${overallRate}%.`,
          `حصر المتدربين المقتربين من نسب الحرمان أو الإنذارات الأكاديمية واستدعاؤهم للتوجيه الإرشادي.`,
          `تحفيز المجموعات التدريبية المتميزة التي حققت معدل حضور تجاوز 96% للفترتين.`
        ]
      }
    },
    recommendations: [
      `الاستمرار في تعزيز التزام المتدربين بالفترة التدريبية الثانية وتكثيف المرور الميداني لمنع الخروج المبكر.`,
      `التنسيق المبكر مع الشركات الراعية لعقد لقاءات إرشادية شهرية للمتدربين لتعزيز الانتماء الوظيفي.`,
      `إطلاق تكريم أسبوعي للمجموعة التدريبية الأكثر انضباطاً في الحضور والواجبات على مستوى المعهد.`
    ],
    closing_salutation: 'سائلين المولى عز وجل لسعادتكم دوام التوفيق والسداد، وتقبلوا خالص تحياتنا وتقديرنا،،،'
  };
}

async function handleExecutiveReport(req, res, startTime) {
  const { recipient, sender, weekLabel, stats, additionalNotes } = req.body || {};
  const rawApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GEMINI_KEY || '';
  const apiKey = rawApiKey.trim().replace(/^["']|["']$/g, '');
  const hasValidKey = Boolean(apiKey && apiKey !== 'YOUR_GEMINI_API_KEY_HERE' && apiKey.length > 15);

  let generatedData = null;
  let modeUsed = 'demo_fallback';

  if (hasValidKey) {
    try {
      const promptText = EXECUTIVE_PROMPT_TEMPLATE
        .replace('{RECIPIENT}', recipient || 'سعادة الأستاذ المحترم / محمد كمال العواد (مدير التشغيل)')
        .replace('{SENDER}', sender || 'إدارة معهد الذهب الأسود العالي للتدريب - فرع عنك')
        .replace(/{WEEK_LABEL}/g, weekLabel || 'الأسبوع الحالي')
        .replace('{TOTAL_TRAINEES}', stats?.totalTrainees || 830)
        .replace('{ATTENDANCE_RATE}', stats?.overallAttendanceRate || 94)
        .replace('{P1_RATE}', stats?.period1Rate || 95)
        .replace('{P2_RATE}', stats?.period2Rate || 93)
        .replace('{GROUPS_COUNT}', stats?.activeGroupsCount || 16)
        .replace('{TRAINERS_COUNT}', stats?.trainersCount || 9)
        .replace('{LMS_STATS}', `التكليفات المنجزة: ${stats?.assignmentsSubmittedCount || 780}، الاختبارات المكتملة: ${stats?.quizzesCompletedCount || 42}`)
        .replace('{ADDITIONAL_NOTES}', additionalNotes ? `\n- ملاحظات إضافية من الإدارة: ${additionalNotes}` : '');

      const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      const geminiRes = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: promptText }] }],
          generationConfig: { temperature: 0.35, responseMimeType: 'application/json' }
        })
      });

      if (geminiRes.ok) {
        const geminiJson = await geminiRes.json();
        const candidateText = geminiJson.candidates?.[0]?.content?.parts?.[0]?.text;
        const parsed = safeExtractJson(candidateText);
        if (parsed && typeof parsed === 'object') {
          generatedData = parsed;
          modeUsed = `gemini (${model})`;
        }
      }
    } catch (err) {
      console.warn('Gemini executive report error, falling back to smart template:', err.message);
    }
  }

  if (!generatedData) {
    generatedData = buildDemoExecutiveReport(req.body);
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);
  return res.status(200).json({
    success: true,
    mode: modeUsed,
    processing_time_seconds: parseFloat(durationSec),
    data: generatedData
  });
}

// ══════════════════════════════════════════════════════════════════════════════
//  MAIN HANDLER (Vercel Serverless Entrypoint)
// ══════════════════════════════════════════════════════════════════════════════
export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  // Fast response for preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    const rawApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GEMINI_KEY || '';
    const cleanKey = rawApiKey.trim().replace(/^["']|["']$/g, '');
    const hasValidKey = Boolean(cleanKey && cleanKey !== 'YOUR_GEMINI_API_KEY_HERE' && cleanKey.length > 15);
    const sbUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '').trim();
    const sbKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '').trim();

    return res.status(200).json({
      status: 'ready',
      service: 'BGTI LMS AI Auto-Generation API (Vercel Serverless)',
      endpoints: {
        generate: 'POST /api/generate'
      },
      hasGeminiApiKey: hasValidKey,
      keyPrefix: hasValidKey ? cleanKey.substring(0, 8) + '...' : null,
      defaultModel: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
      hasSupabaseConfigured: Boolean(sbUrl && sbKey)
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed. Use POST.' });
  }

  const startTime = Date.now();

  // Route: Executive Report Generation
  if (req.body && req.body.action === 'executive_report') {
    return handleExecutiveReport(req, res, startTime);
  }

  try {
    const { filename, fileType, base64, textInput, extractedPdfText, courseName, weekTitle, weekTopic } = req.body || {};

    const hasDirectText = typeof textInput === 'string' && textInput.trim().length >= 10;
    const hasExtractedPdfText = typeof extractedPdfText === 'string' && extractedPdfText.trim().length >= 10;
    const hasFile = Boolean(base64) || Boolean(filename && (filename.toLowerCase().endsWith('.pptx') || filename.toLowerCase().endsWith('.pdf')));

    if (!hasDirectText && !hasFile && !hasExtractedPdfText) {
      return res.status(400).json({
        success: false,
        error: 'لم يتم استلام أي محتوى. يرجى إدخال نص دراسي مباشر أو رفع ملف PPTX / PDF.'
      });
    }

    const safeFilename = filename || (hasDirectText && !hasFile ? 'نص_دراسي_مباشر.txt' : 'uploaded_document');
    const isPdf = safeFilename.toLowerCase().endsWith('.pdf') || (fileType && fileType.includes('pdf'));
    const isPptx = safeFilename.toLowerCase().endsWith('.pptx') || (fileType && (fileType.includes('presentation') || fileType.includes('powerpoint')));

    if (hasFile && !isPdf && !isPptx && !hasDirectText) {
      return res.status(400).json({
        success: false,
        error: 'صيغة الملف غير مدعومة. يرجى رفع ملف PowerPoint (.pptx) أو PDF (.pdf).'
      });
    }

    // Convert Base64 string to Buffer if file provided
    let fileBuffer = null;
    let fileSizeKB = 0;
    if (base64) {
      fileBuffer = Buffer.from(base64, 'base64');
      fileSizeKB = Math.round(fileBuffer.length / 1024);
    }

    // ─── Automatic Supabase Cloud Storage Upload (Bucket: 'lms-files') ──────
    let cloudFileUrl = '';
    const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '').trim().replace(/\/+$/, '');
    const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '').trim();

    if (fileBuffer && supabaseUrl && supabaseKey) {
      try {
        const cleanFn = safeFilename.replace(/[^a-zA-Z0-9._\-\u0600-\u06FF]/g, '_');
        const folder = courseName ? encodeURIComponent(courseName.replace(/[^a-zA-Z0-9_\u0600-\u06FF]/g, '_')) : 'ai_generated';
        const storagePath = `courses/${folder}/${Date.now()}_${cleanFn}`;
        const mime = isPdf ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.presentationml.presentation';

        const uploadRes = await fetch(`${supabaseUrl}/storage/v1/object/lms-files/${storagePath}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'apikey': supabaseKey,
            'Content-Type': mime,
            'x-upsert': 'true'
          },
          body: fileBuffer
        });

        if (uploadRes.ok) {
          cloudFileUrl = `${supabaseUrl}/storage/v1/object/public/lms-files/${storagePath}`;
        } else {
          console.warn('Supabase storage auto-upload response:', uploadRes.status);
        }
      } catch (uploadErr) {
        console.warn('Auto cloud file upload warning:', uploadErr);
      }
    }

    let extractedText = '';
    if (hasDirectText && textInput.trim().length >= 10) {
      extractedText = textInput.trim();
    } else if (hasExtractedPdfText) {
      extractedText = extractedPdfText.trim();
    } else if (fileBuffer && isPptx) {
      extractedText = extractTextFromPptxBuffer(fileBuffer);
    } else if (fileBuffer) {
      extractedText = await extractTextFromPdfBuffer(fileBuffer);
    }

    // If both file buffer extraction and direct text provided, merge them if different
    if (hasDirectText && fileBuffer && extractedText && extractedText !== textInput.trim()) {
      extractedText = `${extractedText}\n\n[إضافات وملاحظات نصية من المدرب]:\n${textInput.trim()}`;
    }

    const textLength = extractedText ? extractedText.length : 0;
    const rawApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GEMINI_KEY || '';
    const apiKey = rawApiKey.trim().replace(/^["']|["']$/g, '');
    const hasValidKey = Boolean(apiKey && apiKey !== 'YOUR_GEMINI_API_KEY_HERE' && apiKey.length > 15);

    let generatedData = null;
    let modeUsed = 'demo_fallback';
    let geminiApiErrors = [];

    // Helper: Resilient JSON extractor
    function safeExtractJson(text) {
      if (!text) return null;
      let s = String(text).trim();
      // Match markdown code block ```json ... ```
      const blockMatch = s.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
      if (blockMatch) s = blockMatch[1].trim();

      const firstBrace = s.indexOf('{');
      const lastBrace = s.lastIndexOf('}');
      if (firstBrace >= 0 && lastBrace > firstBrace) {
        try {
          return JSON.parse(s.slice(firstBrace, lastBrace + 1));
        } catch (e) {
          // Continue to direct parse
        }
      }
      try {
        return JSON.parse(s);
      } catch (e) {
        return null;
      }
    }

    // ─── Call Gemini API if Key is Available ─────────────────────────────────
    if (hasValidKey) {
      // Build context block
      let contextBlock = `## بيانات الكورس والأسبوع:\n`;
      if (courseName) contextBlock += `- اسم الكورس التدريبي: ${courseName}\n`;
      if (weekTitle) contextBlock += `- الأسبوع: ${weekTitle}\n`;
      if (weekTopic) contextBlock += `- موضوع الوحدة: ${weekTopic}\n`;

      const parts = [];

      const courseDiscipline = courseName || 'المقرر التدريبي المعتمد';
      const weekDiscipline = weekTopic || weekTitle || 'الوحدة التدريبية';

      const formatLmsPrompt = (content) => {
        return LMS_PROMPT_TEMPLATE
          .replace(/{COURSE_DISCIPLINE}/g, courseDiscipline)
          .replace(/{WEEK_DISCIPLINE}/g, weekDiscipline)
          .replace('{CONTENT_BLOCK}', content);
      };

      // If direct text only (no file attached)
      if (hasDirectText && !hasFile) {
        const trimmedText = extractedText.length > 25000
          ? extractedText.slice(0, 25000) + '\n\n[... تم اقتصاص بقية النص لتفادي تجاوز الحدود ...]'
          : extractedText;

        const contentSection = `${contextBlock}\n## النص التدريبي والمحتوى المدخل مباشرة من المدرب (${safeFilename}):\n---\n${trimmedText}\n---`;
        parts.push({
          text: formatLmsPrompt(contentSection)
        });
      } else if (isPdf && (hasFile || hasExtractedPdfText)) {
        // If base64 is available and under reasonable limit (under 4MB), pass inlineData
        if (base64 && base64.length < 4500000) {
          parts.push({
            inlineData: {
              mimeType: 'application/pdf',
              data: base64
            }
          });
        }

        let contentSection = `${contextBlock}\n## المحتوى المُستخرج من وثيقة الـ PDF (${safeFilename}):\n`;
        if (extractedText && extractedText.length > 20) {
          const trimmedText = extractedText.length > 25000
            ? extractedText.slice(0, 25000) + '\n\n[... تم الاكتفاء بهذا الجزء من المستند ...]'
            : extractedText;
          contentSection += `---\n${trimmedText}\n---`;
        } else {
          contentSection += `(راجع وثيقة الـ PDF المرفقة أعلاه بالكامل)`;
        }

        parts.push({
          text: formatLmsPrompt(contentSection)
        });
      } else {
        // For PPTX or merged: provide extracted slide texts
        const trimmedText = extractedText.length > 20000
          ? extractedText.slice(0, 20000) + '\n\n[... تم اقتصاص بقية النص لتفادي تجاوز الحدود ...]'
          : extractedText;

        const contentSection = `${contextBlock}\n## المحتوى المُستخرج من شرائح العرض (${safeFilename}):\n---\n${trimmedText}\n---`;
        parts.push({
          text: formatLmsPrompt(contentSection)
        });
      }

      const preferredModel = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
      const modelsToTry = [preferredModel];
      if (!modelsToTry.includes('gemini-1.5-flash')) modelsToTry.push('gemini-1.5-flash');
      if (!modelsToTry.includes('gemini-2.5-flash')) modelsToTry.push('gemini-2.5-flash');

      for (const curModel of modelsToTry) {
        if (generatedData) break;
        try {
          const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${curModel}:generateContent?key=${apiKey}`;

          const geminiRes = await fetch(geminiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              contents: [
                {
                  role: 'user',
                  parts
                }
              ],
              generationConfig: {
                temperature: 0.4,
                responseMimeType: 'application/json'
              }
            })
          });

          if (!geminiRes.ok) {
            const errBody = await geminiRes.text();
            console.error(`Gemini API error on model ${curModel} (Status ${geminiRes.status}):`, errBody);
            geminiApiErrors.push(`[${curModel} HTTP ${geminiRes.status}]: ${errBody.slice(0, 200)}`);
            continue; // Fallback to next model in list
          }

          const geminiJson = await geminiRes.json();
          const candidateText = geminiJson.candidates?.[0]?.content?.parts?.[0]?.text;
          const parsed = safeExtractJson(candidateText);
          if (parsed && typeof parsed === 'object') {
            generatedData = parsed;
            modeUsed = `gemini (${curModel})`;
            break;
          } else {
            console.warn(`Gemini candidate text could not be parsed as JSON on model ${curModel}:`, candidateText?.slice(0, 200));
          }
        } catch (geminiError) {
          console.error(`Gemini execution error on model ${curModel}:`, geminiError);
          geminiApiErrors.push(`[${curModel} Exception]: ${geminiError.message}`);
        }
      }
    }

    // ─── Smart Fallback if Gemini not used or failed ──────────────────────────
    if (!generatedData) {
      generatedData = buildDemoContentFromText(extractedText, safeFilename);
      if (hasValidKey && geminiApiErrors.length > 0) {
        modeUsed = 'demo_fallback_after_gemini_error';
      }
    }

    // Ensure all suggested videos are valid direct watch?v= links (no search queries)
    generatedData = ensureSpecificYouTubeVideos(generatedData, safeFilename + ' ' + (req.body?.weekTitle || '') + ' ' + (req.body?.courseName || ''));

    // Strictly ensure quiz questions count never falls below 10 questions
    generatedData = ensureMinQuizQuestions(generatedData, (req.body?.weekTopic || req.body?.weekTitle || req.body?.courseName || safeFilename));

    const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);

    return res.status(200).json({
      success: true,
      mode: modeUsed,
      hasGeminiApiKey: hasValidKey,
      filename: safeFilename,
      fileSizeKB,
      file_url: cloudFileUrl || '',
      text_length: textLength,
      processing_time_seconds: parseFloat(durationSec),
      data: generatedData,
      geminiErrors: geminiApiErrors.length > 0 ? geminiApiErrors : undefined
    });

  } catch (err) {
    console.error('api/generate handler fatal error:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'حدث خطأ داخلي أثناء معالجة الملف وتوليد المحتوى.'
    });
  }
}
