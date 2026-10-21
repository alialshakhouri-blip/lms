// Vercel Serverless Function: api/generate.js
// Handles AI Auto-Generation for LMS Modules via Groq Cloud API (Llama 3.3 70B Versatile)
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
const LMS_PROMPT_TEMPLATE = `أنت خبير أكاديمي ومصمم مناهج وتقييمات تدريبية معتمد لدى معهد الذهب الأسود للتدريب (BGTI)، متخصص بدقة في تدريس وتقييم موضوع الدرس: "{WEEK_DISCIPLINE}".

قم بتحليل المحتوى التعليمي المرفق وتوليد بيانات مُهيكلة بدقة أكاديمية فائقة بصيغة JSON.
يجب أن يملأ الناتج المكونات الأربعة الكاملة للوحدة الدراسية في منصة LMS بما يتطابق 100% مع المحتوى والموضوع المدخل دون الخروج عنه إطلاقاً.

{CONTENT_BLOCK}

## تعليمات الدقة الأكاديمية الصارمة والالتزام بالموضوع (Ground Truth):
1. الالتزام بموضوع المحتوى بنسبة 100% دون فرض قوالب مسبقة:
   - المحتوى أو النص المدخل هو مصدر الحقيقة الوحيد.
   - تنبثق جميع المخرجات (المحاضرة، المصطلحات، الواجب، والاختبار) حصراً ومباشرة من صلب هذا الموضوع ومفاهيمه ومعانيه.
   - يُمنع منعاً باتاً فرض أي تخصص صناعي أو مصطلحات فنية غير واردة (مثل السلامة الصناعية أو PPE أو إجراءات الورش) إلا إذا كان النص يتناولها صراحة.
   - إذا كان المدخل نصاً قصيراً أو موضوعاً عاماً (مثل: بر الوالدين، آداب التعامل، استخدام الحاسب، الأخلاقيات، مهارات الاتصال):
     * قم بالتوسع الأكاديمي والتربوي المنضبط في صلب هذا الموضوع بالذات.
     * استنبط 4 إلى 6 مصطلحات إنجليزية مترجمة للعربية تعبر بدقة عن صلب الموضوع (مثلاً في بر الوالدين: Filial Piety, Benevolence, Parental Respect, Dutifulness, Supplication).
     * اجعل المحاضرة والملخص والواجب والاختبار كلها تتمحور حصراً حول هذا المفهوم.
2. دقة مفتاح الإجابة الصحيحة (Correct Answers Guarantee):
   - في جميع أسئلة الاختيار من متعدد (MCQ): يجب أن تكون الإجابة المحددة في حقل "correct_answer" مطابقة تماماً وبشكل حرفي لأحد الخيارات الأربعة المذكورة في مصفوفة "options"، وتكون هي الإجابة الصحيحة منطقياً وعلمياً دون أي تناقض.
   - في أسئلة الصح والخطأ: حدد "صح ✓" أو "خطأ ✗" بدقة متناهية مع تفسير منطقي صريح ومباشر لسبب الصحة أو الخطأ، ويجب أن تتطابق الإجابة الصحيحة مع مضمون العبارة.
   - في سؤال التوصيل والمطابقة (Matching): اربط كل مفهوم في "left" بتعريفه الدقيق الصحيح 100% في "right" من واقع الدرس الحالي.
3. الفيديوهات التعليمية المقترحة:
   - وفر 3 فيديوهات ذات عناوين دقيقة تركز حصراً على موضوع الدرس الحالي.
   - لا تخترع معرفات فيديو عشوائية قد تكون غير صالحة. وفر روابط فيديو تعليمية حقيقية أو روابط بحث تعليمية صريحة على يوتيوب بصيغة: https://www.youtube.com/results?search_query=... متوافقة مع عنوان الفيديو.
4. مكونات التقييمات:
   - الواجب الأسبوعي: أسئلة تطبيقية محددة + تكليف نصي عملي يربط المهارة والمفهوم بالتطبيق الواقعي.
   - الاختبار الأسبوعي: يجب عليك توليد 10 أسئلة متكاملة ومستنبطة 100% من صلب النص والموضوع (6 أسئلة اختيار من متعدد MCQ + 3 أسئلة صح وخطأ + سؤال توصيل ومطابقة Matching واحد يحتوي على 4 أزواج متطابقة تماماً). لا تنقص عن 10 أسئلة إطلاقاً!
5. أعد فقط كائن JSON الصالح التالي بدون أي نصوص تمهيدية أو كتل تعليق خارج الـ JSON:

## JSON Schema المطلوبة (أعد هذه البنية بالضبط):
{
  "suggested_videos": [
    {
      "id": 1,
      "title": "عنوان مقترح للفيديو التدريبي الأول (باللغة الإنجليزية أو العربية)",
      "description": "شرح موجز لمحتوى الفيديو والمهارة أو القيمة التي يشرحها",
      "duration": "10-15 دقيقة",
      "youtube_url": "https://www.youtube.com/results?search_query=..."
    },
    {
      "id": 2,
      "title": "عنوان مقترح للفيديو التدريبي الثاني",
      "description": "شرح تفصيلي للمفاهيم الأساسية والتطبيق الواقعي في بيئة العمل أو الحياة",
      "duration": "8-12 دقيقة",
      "youtube_url": "https://www.youtube.com/results?search_query=..."
    },
    {
      "id": 3,
      "title": "عنوان مقترح للفيديو التدريبي الثالث",
      "description": "فيديو إثرائي مكمل للموضوع مع أمثلة واقعية",
      "duration": "12-18 دقيقة",
      "youtube_url": "https://www.youtube.com/results?search_query=..."
    }
  ],
  "lecture": {
    "title": "عنوان المحاضرة المشتق من صلب الموضوع أو الملف",
    "duration_minutes": 15,
    "summary": "ملخص شامل ومكثف لمحتوى المحاضرة والنقاط الأساسية من صلب الموضوع (لا يقل عن 80 كلمة بالعربية الفصحى)",
    "topics": [
      "المحور الأول: مقدمة وأسس المفهوم التعليمي في هذا الدرس",
      "المحور الثاني: الإجراءات والمعايير والأبعاد التطبيقية",
      "المحور الثالث: التطبيق العملي والأثر الإيجابي في الواقع"
    ]
  },
  "glossary_notes": {
    "title": "قاموس ومذكرات مصطلحات الدرس",
    "description": "قاموس مصطلحات متخصصة باللغتين الإنجليزية والعربية مشتقة حصراً من موضوع الدرس",
    "terms": [
      {"en": "Term 1", "ar": "المصطلح 1 بالعربية", "definition": "شرح دقيق للمصطلح مشتق من صلب الموضوع"},
      {"en": "Term 2", "ar": "المصطلح 2 بالعربية", "definition": "شرح دقيق للمصطلح مشتق من صلب الموضوع"},
      {"en": "Term 3", "ar": "المصطلح 3 بالعربية", "definition": "شرح دقيق للمصطلح مشتق من صلب الموضوع"},
      {"en": "Term 4", "ar": "المصطلح 4 بالعربية", "definition": "شرح دقيق للمصطلح مشتق من صلب الموضوع"}
    ]
  },
  "assignment": {
    "title": "الواجب والتكليف التطبيقي",
    "total_grade": 10,
    "instructions": "تعليمات واضحة للمتدرب لكيفية حل التكليف وربط المفاهيم بالتطبيق الواقعي",
    "assignment_type": "mcq_or_text",
    "mcq_questions": [
      {
        "question": "سؤال تطبيقي من متعدد يطلب تطبيق المفاهيم في مواقف واقعية",
        "options": ["الخيار أ", "الخيار ب", "الخيار ج", "الخيار د"],
        "correct_answer": "الخيار أ"
      }
    ],
    "text_questions": [
      {
        "prompt": "اكتب فقرة توضح فيها كيفية تطبيق المفاهيم المكتسبة في هذا الدرس في ممارستك اليومية أو المهنية.",
        "guidelines": "استخدم المصطلحات المناسبة الواردة في المحتوى.",
        "model_answer": "نموذج إجابة استرشادي يوضح للمدرب المعايير المقبولة للتقييم."
      }
    ],
    "questions": [
      {
        "type": "mcq",
        "question": "سؤال تطبيقي من متعدد يطلب تطبيق المفاهيم في مواقف واقعية",
        "options": ["الخيار أ", "الخيار ب", "الخيار ج", "الخيار د"],
        "correct_answer": "الخيار أ"
      },
      {
        "type": "true_false",
        "question": "عبارة صح وخطأ حول تطبيق المفاهيم في هذا الموضوع",
        "options": ["صح ✓", "خطأ ✗"],
        "correct_answer": "صح ✓"
      }
    ]
  },
  "quiz": {
    "title": "اختبار الدرس التفاعلي المتنوع",
    "duration_minutes": 15,
    "total_grade": 10,
    "questions": [
      {
        "type": "mcq",
        "question": "سؤال 1 من متعدد مشتق بدقة متناهية من صلب الموضوع",
        "options": ["الخيار الصحيح", "خيار غير صحيح 1", "خيار غير صحيح 2", "خيار غير صحيح 3"],
        "correct_answer": "الخيار الصحيح",
        "explanation": "شرح وتفسير منطقي دقيق لسبب صحة الخيار"
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
//  CURATED EDUCATIONAL VIDEOS (Verified real direct URLs / Search Queries for LMS)
// ══════════════════════════════════════════════════════════════════════════════
const CURATED_EDUCATIONAL_VIDEOS = [
  {
    keywords: ['أمي', 'أبي', 'والد', 'والدين', 'بر الوالدين', 'parent', 'filial', 'أسرة', 'عقوق', 'إحسان'],
    videos: [
      { id: 1, title: 'فضل بر الوالدين والإحسان إليهما وتطبيقاته في الحياة اليومية', url: 'https://www.youtube.com/results?search_query=' + encodeURIComponent('فضل بر الوالدين والإحسان إليهما'), duration: '12:00 دقيقة' },
      { id: 2, title: 'كيف تبر والديك؟ خطوات عملية وأمثلة واقعية لحسن المعاملة', url: 'https://www.youtube.com/results?search_query=' + encodeURIComponent('كيف تبر والديك خطوات عملية'), duration: '10:30 دقيقة' },
      { id: 3, title: 'آداب التعامل مع الأبوين وخفض جناح الرحمة لهما', url: 'https://www.youtube.com/results?search_query=' + encodeURIComponent('آداب التعامل مع الوالدين وخفض الجناح'), duration: '14:15 دقيقة' }
    ]
  },
  {
    keywords: ['حاسب', 'كمبيوتر', 'لوحة المفاتيح', 'اختصارات', 'اختصار', 'ويندوز', 'windows', 'computer', 'keyboard', 'excel', 'word'],
    videos: [
      { id: 1, title: 'أساسيات استخدام الحاسب واختصارات لوحة المفاتيح الهامة', url: 'https://www.youtube.com/results?search_query=' + encodeURIComponent('أساسيات الحاسب واختصارات لوحة المفاتيح'), duration: '11:20 دقيقة' },
      { id: 2, title: 'أهم اختصارات لوحة المفاتيح لزيادة الإنتاجية وسرعة العمل', url: 'https://www.youtube.com/results?search_query=' + encodeURIComponent('أهم اختصارات لوحة المفاتيح لزيادة الإنتاجية'), duration: '09:45 دقيقة' },
      { id: 3, title: 'نصائح وحيل احترافية للتعامل مع نظام التشغيل وإدارة الملفات', url: 'https://www.youtube.com/results?search_query=' + encodeURIComponent('نصائح احترافية للتعامل مع نظام التشغيل وإدارة الملفات'), duration: '13:10 دقيقة' }
    ]
  },
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
    keywords: ['mechanic', 'ميكانيكا', 'صيانة', 'مضخ', 'maint', 'pump', 'valve', 'ورشة', 'محرك'],
    videos: [
      { id: 1, title: 'تشغيل وصيانة المضخات والمعدات الميكانيكية (Centrifugal Pumps)', url: 'https://www.youtube.com/watch?v=XpcCUtYzwy0', duration: '11:50 دقيقة' },
      { id: 2, title: 'أدوات الورشة الميكانيكية ومعايير الفحص الدوري', url: 'https://www.youtube.com/watch?v=pMtqDWUpJds', duration: '14:20 دقيقة' },
      { id: 3, title: 'معايرة وضبط الآلات الميكانيكية وإجراءات التشغيل القياسية', url: 'https://www.youtube.com/watch?v=1pMHayXqoMY', duration: '10:45 دقيقة' }
    ]
  }
];

function resolveDirectEducationalVideos(contextText = '', title = '') {
  const cleanTitle = (title || 'الموضوع التدريبي').replace(/^(?:محاضرة|درس|الوحدة)\s*[:\-]\s*/, '').trim();
  const defaultVideos = [
    { id: 1, title: `شرح تعليمي مرئي: ${cleanTitle}`, url: `https://www.youtube.com/results?search_query=${encodeURIComponent(cleanTitle + ' شرح تعليمي')}`, duration: '12:00 دقيقة' },
    { id: 2, title: `تطبيقات وأمثلة عملية لـ ${cleanTitle}`, url: `https://www.youtube.com/results?search_query=${encodeURIComponent(cleanTitle + ' تطبيقات عملية وأمثلة')}`, duration: '10:15 دقيقة' },
    { id: 3, title: `ملخص شامل وإرشادات في ${cleanTitle}`, url: `https://www.youtube.com/results?search_query=${encodeURIComponent(cleanTitle + ' ملخص شامل')}`, duration: '08:45 دقيقة' }
  ];

  const hay = (contextText + ' ' + title).toLowerCase();
  const matched = CURATED_EDUCATIONAL_VIDEOS.find(c => c.keywords.some(k => hay.includes(k)));
  const list = matched ? matched.videos : defaultVideos;
  return list.map((v, i) => ({
    id: i + 1,
    title: v.title,
    description: `فيديو ومورد تعليمي يشرح المفاهيم والتطبيقات المرتبطة بـ ${cleanTitle}.`,
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
      
      if (isSearchUrl) {
        // Keep valid search query URLs intact
        return {
          ...v,
          id: v.id || (i + 1),
          youtube_url: url
        };
      }

      const videoMatch = url.match(/(?:youtube\.com\/(?:watch\?.*v=|embed\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i);
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
      title: `اختبار الدرس: ${contextTitle || 'الوحدة التدريبية'}`,
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
        explanation: 'ممتاز! تم توصيل كافة المفاهيم بتعريفاتها الصحيحة بدقة.'
      });
    }
  }

  // 2. If questions count is under 10, synthesize questions ONLY from the lesson's terms or lecture topics
  let termIdx = 0;
  while (data.quiz.questions.length < 10 && terms.length > 0 && termIdx < terms.length * 3) {
    const t = terms[termIdx % terms.length];
    const isMcq = (data.quiz.questions.length % 2 === 0);

    if (isMcq) {
      const qText = `ما هو المدلول العلمي والتطبيقي للمفهوم '${t.en || t.ar}' وفق سياق هذا الدرس؟`;
      const exists = data.quiz.questions.some(q => q.question === qText);
      if (!exists) {
        // Collect realistic distractors from OTHER real terms in the lesson
        const otherTerms = terms.filter(item => item !== t);
        const optA = t.definition ? t.definition.slice(0, 75) : `المفهوم المعتمد لـ ${t.en || t.ar}`;
        const optB = (otherTerms[0] && otherTerms[0].definition) ? otherTerms[0].definition.slice(0, 75) : `تطبيق يتعلق بـ ${otherTerms[0]?.ar || 'محور آخر في الدرس'}`;
        const optC = (otherTerms[1] && otherTerms[1].definition) ? otherTerms[1].definition.slice(0, 75) : `الإجراء الميداني المقابل لـ ${t.ar || 'المفهوم'}`;
        const optD = (otherTerms[2] && otherTerms[2].definition) ? otherTerms[2].definition.slice(0, 75) : `المصطلح الفني المرتبط بالمرحلة التالية`;

        const options = [optA, optB, optC, optD];

        data.quiz.questions.push({
          type: 'mcq',
          question: qText,
          options,
          correct_answer: optA,
          correctIndex: 0,
          explanation: `يرتبط مفهوم ${t.en || t.ar} بـ ${t.definition || t.ar}`
        });
      }
    } else {
      const qText = `عبارة: تطبيق واستيعاب '${t.en || t.ar}' يُعد عنصراً رئيساً في إتقان متطلبات هذا الدرس وتحقيق أهدافه.`;
      const exists = data.quiz.questions.some(q => q.question === qText);
      if (!exists) {
        data.quiz.questions.push({
          type: 'true_false',
          question: qText,
          options: ['صح', 'خطأ'],
          correct_answer: 'صح',
          correctIndex: 0,
          explanation: `صواب؛ لأن استيعاب ${t.en || t.ar} يدعم تحقيق أهداف الدرس والتطبيق السليم.`
        });
      }
    }
    termIdx++;
  }

  return data;
}

// ══════════════════════════════════════════════════════════════════════════════
//  QUIZ DATA NORMALIZER & INTEGRITY VALIDATOR
// ══════════════════════════════════════════════════════════════════════════════
function normalizeAndValidateQuizData(quizData, contextTopic = '') {
  if (!quizData) return null;
  const questions = Array.isArray(quizData.questions) ? quizData.questions : [];
  
  const validatedQuestions = [];
  
  questions.forEach((q, idx) => {
    if (!q || !q.question) return;
    const isTf = (q.type === 'true_false' || q.type === 'tf');
    const isMatching = (q.type === 'matching' || (Array.isArray(q.pairs) && q.pairs.length >= 2));
    
    if (isMatching) {
      const validPairs = (q.pairs || []).filter(p => p && p.left && p.right).map(p => ({
        left: String(p.left).trim(),
        right: String(p.right).trim()
      }));
      if (validPairs.length >= 2) {
        validatedQuestions.push({
          id: idx + 1,
          type: 'matching',
          question: q.question.trim(),
          pairs: validPairs.slice(0, 4),
          explanation: q.explanation ? String(q.explanation).trim() : 'تم توصيل كافة المفاهيم بتعريفاتها الصحيحة بدقة.'
        });
      }
    } else if (isTf) {
      let rawAns = String(q.correct_answer || '').trim();
      const isTrue = /^(صح|صواب|نعم|true|1|✓)/i.test(rawAns);
      const cleanAns = isTrue ? 'صح' : 'خطأ';
      validatedQuestions.push({
        id: idx + 1,
        type: 'true_false',
        question: q.question.trim(),
        options: ['صح', 'خطأ'],
        correct_answer: cleanAns,
        correctIndex: isTrue ? 0 : 1,
        explanation: q.explanation ? String(q.explanation).trim() : (isTrue ? 'العبارة صحيحة ومتوافقة مع المادة العلمية.' : 'العبارة غير صحيحة.')
      });
    } else {
      // MCQ
      let rawOpts = Array.isArray(q.options) ? q.options.map(o => String(o).trim()).filter(Boolean) : [];
      let correctAns = q.correct_answer ? String(q.correct_answer).trim() : '';
      
      // Filter out any fake/placeholder distractors if present
      rawOpts = rawOpts.filter(o => !o.includes('خارج سياق') && !o.includes('غير متوافق مع المفهوم') && !o.includes('تعريف عام غير دقيق'));

      if (correctAns && !rawOpts.some(o => o === correctAns || o.includes(correctAns))) {
        rawOpts.unshift(correctAns);
      }
      while (rawOpts.length < 4) {
        rawOpts.push(`الخيار ${rawOpts.length + 1}`);
      }
      rawOpts = rawOpts.slice(0, 4);
      
      let cIdx = rawOpts.findIndex(o => o === correctAns);
      if (cIdx === -1) {
        cIdx = rawOpts.findIndex(o => correctAns.includes(o) || o.includes(correctAns));
      }
      if (cIdx === -1) cIdx = 0;
      
      validatedQuestions.push({
        id: idx + 1,
        type: 'mcq',
        question: q.question.trim(),
        options: rawOpts,
        correct_answer: rawOpts[cIdx],
        correctIndex: cIdx,
        explanation: q.explanation ? String(q.explanation).trim() : `الإجابة الصحيحة هي: ${rawOpts[cIdx]}`
      });
    }
  });
  
  return {
    title: quizData.title || `اختبار تقييم الدرس: ${contextTopic || 'الوحدة التدريبية'}`,
    duration_minutes: quizData.duration_minutes || 15,
    total_grade: quizData.total_grade || 10,
    questions: validatedQuestions
  };
}

// ══════════════════════════════════════════════════════════════════════════════
//  INTELLIGENT DYNAMIC LMS CONTENT GENERATOR (Ground Truth from Text)
// ══════════════════════════════════════════════════════════════════════════════
function buildSmartLmsContentFromText(extractedText, filename, courseName = '', weekTitle = '') {
  const cleanText = (extractedText || '').trim();
  const lower = cleanText.toLowerCase();
  const lines = cleanText.split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('[') && l.length > 2);

  // 1. Detect Topic & Domain from the actual input
  const hasParents = /(?:أمي|أبي|والد|والدين|بر\s*الوالدين|الأسرة|عقوق|طاعة\s*الوالدين|إحسان)/i.test(lower);
  const hasComputer = /(?:حاسب|كمبيوتر|لوحة\s*المفاتيح|اختصارات|نظام\s*التشغيل|برمج|computer|keyboard|windows)/i.test(lower);
  const hasSafety = /(?:سلامة|وقاية|مخاطر|ppe|hse|osha|إسعاف|طوارئ|حريق|hazard|safety)/i.test(lower);
  const hasWelding = /(?:لحام|قوس|إلكترود|تنجستن|أرجون|weld|smaw|tig|mig)/i.test(lower);
  const hasElectrical = /(?:كهرباء|تيار|جهد|دائرة|مقاومة|volt|amp|circuit|electrical)/i.test(lower);

  let title = '';
  if (lines.length > 0) {
    const raw = lines[0].replace(/^\[(شريحة|صفحة|الوحدة|درس|محاضرة|موضوع|عنوان)\s*[\dأ-ي]*\]:?\s*/i, '').trim();
    title = raw.split(/[:\-–—\.]/)[0].trim() || raw;
  }
  if (!title || title.includes('نص_دراسي') || title.includes('نص دراسي') || title.length < 3) {
    const fnClean = (filename || '').replace(/\.[^/.]+$/, '').replace(/[_\\-]/g, ' ').trim();
    if (fnClean && !fnClean.includes('نص_دراسي') && !fnClean.includes('نص دراسي')) {
      title = fnClean;
    }
  }
  if (!title || title.length < 3) {
    if (hasParents) title = 'بر الوالدين والإحسان إليهما';
    else if (hasComputer) title = 'أساسيات استخدام الحاسب واختصارات لوحة المفاتيح';
    else if (hasSafety) title = 'مبادئ السلامة الصناعية ومهمات الوقاية الشخصية';
    else title = 'الوحدة التدريبية التخصصية';
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // DOMAIN A: PARENTS & FILIAL PIETY (بر الوالدين)
  // ─────────────────────────────────────────────────────────────────────────────
  if (hasParents) {
    const parentTitle = 'بر الوالدين: المنزلة العظيمة والتطبيقات العملية في الحياة';
    const parentTerms = [
      { en: 'Filial Piety', ar: 'بر الوالدين', definition: 'الإحسان إلى الوالدين والتفاني في رعايتهما وطاعتهما بالمعروف وشكر فضلهما.' },
      { en: 'Benevolence & Kindness', ar: 'الإحسان والقول الكريم', definition: 'مخاطبة الوالدين بألطف العبارات وتجنب إظهار التذمر أو التأفف أو الضجر.' },
      { en: 'Parental Respect', ar: 'توقير الوالدين والاحترام', definition: 'إجلال قدر الأب والأم وتقديم راحتهما واستشارتهما في أمور الحياة.' },
      { en: 'Dutiful Care', ar: 'الرعاية والعناية المستمرة', definition: 'المبادرة بقضاء حوائج الوالدين والعناية بهما وتقديم العون دون انتظار الطلب.' },
      { en: 'Supplication for Parents', ar: 'الدعاء للوالدين', definition: 'طلب الرحمة والمغفرة والصحة للوالدين في حياتهما وبعد مماتهما.' },
      { en: 'Active Listening', ar: 'حسن الاستماع والإنصات', definition: 'الإصغاء لحديث الوالدين باهتمام وتأدب وعدم مقاطعتهما أو إظهار الانشغال.' }
    ];

    const parentQuestions = [
      {
        type: 'mcq',
        question: 'ما هو المفهوم الجوهري لـ "بر الوالدين" (Filial Piety) وفق القيم والآداب الرفيعة؟',
        options: [
          'الإحسان إلى الوالدين والتفاني في رعايتهما وطاعتهما بالمعروف وشكر فضلهما',
          'الاقتصار على تقديم الدعم المادي فقط عند الإلحاح في الطلب',
          'التعامل مع نصائحهما كرأي استشاري غير ملزم يمكن تجاهله',
          'تأجيل الاهتمام بهما حتى مراحل متأخرة من الحياة'
        ],
        correct_answer: 'الإحسان إلى الوالدين والتفاني في رعايتهما وطاعتهما بالمعروف وشكر فضلهما',
        explanation: 'بر الوالدين قيمة عليا تجمع بين الإحسان، والتوقير، والرعاية الشاملة، وطاعتهما في المعروف.'
      },
      {
        type: 'mcq',
        question: 'أي من السلوكيات التالية يمثل التطبيق العملي لـ "القول الكريم" وخفض الجناح مع الوالدين؟',
        options: [
          'التلطف في الحديث والإنصات باهتمام وتجنب إظهار الضجر أو التأفف',
          'مقاطعة حديثهما لتصحيح آرائهما أمام الآخرين باستمرار',
          'تجنب الجلوس معهما والتحجج الدائم بضيق الوقت والانشغال',
          'رفع الصوت عند الاختلاف في وجهات النظر لإثبات الرأي'
        ],
        correct_answer: 'التلطف في الحديث والإنصات باهتمام وتجنب إظهار الضجر أو التأفف',
        explanation: 'القول الكريم يتجلى في اللطف والهدوء وتجنب كلمة "أف" أو أي إشارة تذمر.'
      },
      {
        type: 'mcq',
        question: 'ما هو التصرف السليم والأكمل عند حاجة الوالدين للمساعدة في شؤون الحياة؟',
        options: [
          'المبادرة بتقديم العون وقضاء حوائجهما فوراً دون انتظار أن يطلبا ذلك',
          'انتظار تكرار الطلب عدة مرات للتأكد من الحاجة',
          'الاعتذار الدائم وترك المهمة لأفراد الأسرة الآخرين',
          'تقديم المساعدة مع إظهار المنة والضيق من ثقل التكليف'
        ],
        correct_answer: 'المبادرة بتقديم العون وقضاء حوائجهما فوراً دون انتظار أن يطلبا ذلك',
        explanation: 'المبادرة الذاتية في تلبية احتياجات الوالدين هي جوهر البر والإحسان الصادق.'
      },
      {
        type: 'mcq',
        question: 'ما الذي يعبر عنه مفهوم "Parental Respect" في تعامل الأبناء مع الوالدين؟',
        options: [
          'توقير قدر الأب والأم وإجلال مكانتهما واستشارتهما وتقدير تضحياتهما',
          'التعامل معهما بندية مطلقة وتجاهل فارق السن والخبرة',
          'الاقتصار على التواصل في المناسبات الرسمية والأعياد فقط',
          'إلزامهما بتحمل رغبات الأبناء دون مراعاة لصحتهما أو قدرتهما'
        ],
        correct_answer: 'توقير قدر الأب والأم وإجلال مكانتهما واستشارتهما وتقدير تضحياتهما',
        explanation: 'التوقير والاحترام يعكسان إدراك الأبناء لفضل الوالدين والتضحيات الجسيمة التي قدماها.'
      },
      {
        type: 'mcq',
        question: 'كيف يمكن للإنسان مواصلة بر والديه والإحسان إليهما بعد وفاتهما؟',
        options: [
          'بالدعاء المستمر لهما والاستغفار وإنفاذ عهدهما وصلة الرحم وإكرام صديقهما',
          'بنسيان ذكراهما والانشغال بمسؤوليات الحياة اليومية فقط',
          'بالاقتصار على مشاعر الحزن دون تقديم أي عمل صالح ينفعهما',
          'بقطع التواصل مع أصدقائهما وأقاربهما لانتهاء صلتهما'
        ],
        correct_answer: 'بالدعاء المستمر لهما والاستغفار وإنفاذ عهدهما وصلة الرحم وإكرام صديقهما',
        explanation: 'البر يمتد بعد الوفاة بالدعاء، والصدقة، وصلة الرحم التي لا توصل إلا بهما، وإكرام معارفهما.'
      },
      {
        type: 'mcq',
        question: 'ما الحكمة التربوية والأخلاقية من اقتران شكر الوالدين بشكر الله تعالى؟',
        options: [
          'لعظيم فضلهما وتفانيهما في الرعاية والتربية والتضحية براحتهما لأجل الأبناء',
          'لأن ذلك مجرد تقليد اجتماعي شكلي متوارث بين الأجيال',
          'لأن الوالدين يطالبان دائماً بمقابل مالي للتربية',
          'لتقييد حرية واستقلالية الأبناء الشخصية'
        ],
        correct_answer: 'لعظيم فضلهما وتفانيهما في الرعاية والتربية والتضحية براحتهما لأجل الأبناء',
        explanation: 'شكر الوالدين قرين شكر المنعم لعظيم دورهما في التربية والرعاية والنشأة.'
      },
      {
        type: 'true_false',
        question: 'عبارة: يقتصر بر الوالدين على تقديم الدعم المادي فقط، ولا تشترط الكلمة الطيبة أو حسن الاستماع لحديثهما.',
        options: ['صح ✓', 'خطأ ✗'],
        correct_answer: 'خطأ ✗',
        explanation: 'خطأ؛ لأن البر المعنوي وحسن الخلق ولين الكلام أعظم عند الوالدين من مجرد الدعم المادي.'
      },
      {
        type: 'true_false',
        question: 'عبارة: المبادرة في قضاء حوائج الوالدين والتلطف في مخاطبتهما تُعد من أعلى مراتب الإحسان ورضا الخالق.',
        options: ['صح ✓', 'خطأ ✗'],
        correct_answer: 'صح ✓',
        explanation: 'صواب؛ رضا الوالدين من رضا الرب، والإحسان إليهما واجب ديني وأخلاقي وإنساني رفيع.'
      },
      {
        type: 'true_false',
        question: 'عبارة: الدعاء المستمر للوالدين بالرحمة والمغفرة هو عمل صالح يمتد أثره في حياتهما وبعد وفاتهما.',
        options: ['صح ✓', 'خطأ ✗'],
        correct_answer: 'صح ✓',
        explanation: 'صواب؛ دعاء الولد الصالح لوالديه من الأعمال التي لا تنقطع بركتها وأجرها أبداً.'
      },
      {
        type: 'matching',
        question: '🔗 سؤال التوصيل والمطابقة: صِل كل مفهوم قيمي باللغة الإنجليزية بمعناه الدقيق في بر الوالدين:',
        pairs: [
          { left: 'Filial Piety', right: 'بر الوالدين والتفاني في رعايتهما وطاعتهما بالمعروف' },
          { left: 'Benevolence & Kindness', right: 'الإحسان والقول الكريم وتجنب التأفف' },
          { left: 'Parental Respect', right: 'توقير الأب والأم وإجلال قدرهما واستشارتهما' },
          { left: 'Supplication for Parents', right: 'الدعاء المستمر لهما بالرحمة والمغفرة' }
        ],
        explanation: 'ممتاز! تم توصيل كافة مفاهيم بر الوالدين بتعريفاتها السليمة بدقة.'
      }
    ];

    return {
      suggested_videos: resolveDirectEducationalVideos(cleanText, parentTitle),
      lecture: {
        title: `محاضرة: ${parentTitle}`,
        duration_minutes: 15,
        summary: `تتناول هذه الوحدة دراسة شاملة لمنزلة بر الوالدين، والتأكيد على حقوق الأب والأم وواجب الأبناء نحوهما في ضوء القيم التربوية والأخلاقية السامية. تستعرض المحاضرة الأبعاد السلوكية اليومية مثل القول الكريم، وخفض جناح الذل لهما رحمة، وحسن الاستماع، والمبادرة في تقديم العون، والدعاء المستمر لهما في حياتهما وبعد مماتهما.`,
        topics: [
          'المحور الأول: منزلة بر الوالدين وفضل الإحسان إليهما',
          'المحور الثاني: الآداب السلوكية في الحديث والتعامل اليومي',
          'المحور الثالث: التطبيقات العملية في الرعاية والعون والدعاء'
        ]
      },
      glossary_notes: {
        title: `مذكرات ومفاهيم: ${parentTitle}`,
        description: `مفاهيم وقيم تربوية وأخلاقية باللغتين الإنجليزية والعربية مشتقة حصراً من موضوع بر الوالدين.`,
        terms: parentTerms
      },
      quiz: {
        title: `اختبار الدرس: ${parentTitle}`,
        duration_minutes: 15,
        total_grade: 10,
        questions: parentQuestions
      },
      assignment: {
        title: `التكليف التطبيقي: بر الوالدين والتعامل الإيجابي`,
        total_grade: 10,
        instructions: `اقرأ محاور الدرس ثم دوّن ثلاث ممارسات يومية تطبقها لإدخال السرور على والديك، واشرح أثر الكلمة الطيبة في تعزيز المودة الأسرية.`,
        assignment_type: 'mcq_or_text',
        mcq_questions: [
          {
            question: 'أي من التطبيقات التالية يجسد بر الوالدين في الحياة اليومية بشكل مستمر؟',
            options: [
              'المبادرة بمساعدتهما في شؤون البيت والإنصات لحديثهما وملازمتهما بالدعاء',
              'تجنب الحديث معهما تجنباً للاختلاف في الرأي',
              'تقديم الهدايا فقط مع إهمال التواصل والزيارة',
              'ترك رعايتهما للآخرين دون متابعة شخصية'
            ],
            correct_answer: 'المبادرة بمساعدتهما في شؤون البيت والإنصات لحديثهما وملازمتهما بالدعاء'
          }
        ],
        text_questions: [
          {
            prompt: 'اكتب فقرة وجيزة تعبر فيها عن مشاعرك تجاه والديك وتحدد خطة عملية لأداء حقهما والبر بهما.',
            guidelines: 'استخدم مفاهيم الإحسان، والتوقير، والدعاء، ولين الكلام.',
            model_answer: 'تتضمن الإجابة إبراز مشاعر الامتنان لفضل الوالدين، مع خطوات عملية مثل: المبادرة في المساعدة، وحسن الاستماع، والدعاء اليومي لهما بالصحة والمغفرة.'
          }
        ],
        questions: [
          {
            type: 'mcq',
            question: 'أي من التطبيقات التالية يجسد بر الوالدين في الحياة اليومية بشكل مستمر؟',
            options: [
              'المبادرة بمساعدتهما في شؤون البيت والإنصات لحديثهما وملازمتهما بالدعاء',
              'تجنب الحديث معهما تجنباً للاختلاف في الرأي',
              'تقديم الهدايا فقط مع إهمال التواصل والزيارة',
              'ترك رعايتهما للآخرين دون متابعة شخصية'
            ],
            correct_answer: 'المبادرة بمساعدتهما في شؤون البيت والإنصات لحديثهما وملازمتهما بالدعاء'
          },
          {
            type: 'true_false',
            question: 'عبارة: الكلمة الطيبة وخفض الصوت وحسن الاستماع تمثل ركائز أساسية في الإحسان إلى الوالدين.',
            options: ['صح ✓', 'خطأ ✗'],
            correct_answer: 'صح ✓'
          }
        ]
      }
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // DOMAIN B: COMPUTER BASICS & KEYBOARD SHORTCUTS (أساسيات الحاسب واختصارات الكيبورد)
  // ─────────────────────────────────────────────────────────────────────────────
  if (hasComputer) {
    const compTitle = 'أساسيات استخدام الحاسب واختصارات لوحة المفاتيح';
    const compTerms = [
      { en: 'Keyboard Shortcuts', ar: 'اختصارات لوحة المفاتيح', definition: 'تركيبة من المفاتيح لتنفيذ أوامر حاسوبية سريعة بدلاً من استخدام الفأرة.' },
      { en: 'Operating System (OS)', ar: 'نظام التشغيل', definition: 'البرمجية الأساسية التي تدير العتاد والبرامج وتوفر واجهة الاستخدام (مثل Windows).' },
      { en: 'Clipboard Management', ar: 'إدارة الحافظة (نسخ ولصق)', definition: 'مساحة تخزين مؤقتة للنصوص والملفات المنسوخة (Ctrl+C) لنقلها ولصقها (Ctrl+V).' },
      { en: 'File Explorer', ar: 'مستكشف الملفات والمجلدات', definition: 'الأداة المخصصة لتنظيم وتصفح وإدارة الملفات والمحركات في الحاسب.' },
      { en: 'Input Devices', ar: 'وحدات الإدخال', definition: 'الأجهزة المستخدمة لإدخال الأوامر والبيانات للحاسب كلوحة المفاتيح والفأرة.' }
    ];

    const compQuestions = [
      {
        type: 'mcq',
        question: 'ما هو الاختصار المعتمد في نظام التشغيل لإلغاء الأمر الأخير والتراجع (Undo)؟',
        options: ['Ctrl + Z', 'Ctrl + C', 'Ctrl + V', 'Ctrl + S'],
        correct_answer: 'Ctrl + Z',
        explanation: 'الضغط على Ctrl + Z يتراجع عن آخر تعديل أو إجراء تم تنفيذه.'
      },
      {
        type: 'mcq',
        question: 'أي من الاختصارات التالية يُستخدم لحفظ الملفات والمستندات بسرعة (Save)؟',
        options: ['Ctrl + S', 'Ctrl + P', 'Ctrl + X', 'Ctrl + A'],
        correct_answer: 'Ctrl + S',
        explanation: 'الرمز S يشير إلى Save، واختصاره العالمي هو Ctrl + S.'
      },
      {
        type: 'mcq',
        question: 'ما هي وظيفة الجمع بين مفتاحي (Ctrl + C) ثم (Ctrl + V) في البرامج؟',
        options: [
          'نسخ العنصر المحدد إلى الحافظة ثم لصقه في الموضع الجديد',
          'حذف الملف نهائياً من القرص الصلب',
          'إعادة تشغيل جهاز الحاسب الآلي',
          'إغلاق النافذة النشطة حالياً'
        ],
        correct_answer: 'نسخ العنصر المحدد إلى الحافظة ثم لصقه في الموضع الجديد',
        explanation: 'Ctrl+C ينسخ العنصر المحدد و Ctrl+V يثبته في المكان الجديد.'
      },
      {
        type: 'mcq',
        question: 'أي اختصار يُستخدم لتحديد كامل النص أو كافة الملفات في المجلد (Select All)؟',
        options: ['Ctrl + A', 'Ctrl + F', 'Alt + Tab', 'Ctrl + N'],
        correct_answer: 'Ctrl + A',
        explanation: 'Ctrl + A يقوم بتحديد الكل (All) دفعة واحدة.'
      },
      {
        type: 'mcq',
        question: 'ما هو الاختصار السريع للتنقل والتبديل بين النوافذ والبرامج المفتوحة؟',
        options: ['Alt + Tab', 'Ctrl + Alt + Del', 'Shift + Esc', 'Win + L'],
        correct_answer: 'Alt + Tab',
        explanation: 'الضغط على Alt + Tab يفتح مبدل المهام للتنقل السريع بين النوافذ.'
      },
      {
        type: 'mcq',
        question: 'ما هو الإجراء الناتج عن الضغط على مفتاح (Windows + D)؟',
        options: [
          'إخفاء كافة النوافذ وإظهار سطح المكتب فوراً',
          'حذف المستند الحالي',
          'تعتيم شاشة الحاسب',
          'فتح نافذة الطباعة'
        ],
        correct_answer: 'إخفاء كافة النوافذ وإظهار سطح المكتب فوراً',
        explanation: 'مفتاح Windows مع حرف D يرمز لـ Desktop ويظهر سطح المكتب مباشرة.'
      },
      {
        type: 'true_false',
        question: 'عبارة: يساعد استخدام اختصارات لوحة المفاتيح في رفع سرعة الإنجاز وتقليل الاعتماد المستمر على الفأرة.',
        options: ['صح ✓', 'خطأ ✗'],
        correct_answer: 'صح ✓',
        explanation: 'صواب؛ اختصارات لوحة المفاتيح تزيد الإنتاجية وتسرع سير العمليات الحاسوبية اليومية.'
      },
      {
        type: 'true_false',
        question: 'عبارة: الضغط على زر (Ctrl + X) يقوم بنسخ النص دون حذفه من موضعه الأصلي.',
        options: ['صح ✓', 'خطأ ✗'],
        correct_answer: 'خطأ ✗',
        explanation: 'خطأ؛ Ctrl + X يقوم بقص النص (حذفه من مكانه مع حفظه مؤقتاً في الحافظة للصق).'
      },
      {
        type: 'true_false',
        question: 'عبارة: مفتاح (Windows + L) يُستخدم لقفل شاشة الحاسب فوراً لحماية الخصوصية عند الابتعاد عن الجهاز.',
        options: ['صح ✓', 'خطأ ✗'],
        correct_answer: 'صح ✓',
        explanation: 'صواب؛ Windows + L يرمز لـ Lock ويقفل شاشة المستخدم للحفاظ على أمان البيانات.'
      },
      {
        type: 'matching',
        question: '🔗 سؤال التوصيل والمطابقة: صِل اختصار لوحة المفاتيح بالوظيفة الصحيحة المقابلة له:',
        pairs: [
          { left: 'Ctrl + C', right: 'نسخ النص أو الملف المحدد إلى الحافظة' },
          { left: 'Ctrl + V', right: 'لصق العنصر المنسوخ في الموضع الحالي' },
          { left: 'Ctrl + Z', right: 'التراجع عن الإجراء الأخير' },
          { left: 'Ctrl + S', right: 'حفظ التعديلات في المستند أو الملف' }
        ],
        explanation: 'ممتاز! تم توصيل كافة اختصارات لوحة المفاتيح بوظائفها الصحيحة بدقة.'
      }
    ];

    return {
      suggested_videos: resolveDirectEducationalVideos(cleanText, compTitle),
      lecture: {
        title: `محاضرة: ${compTitle}`,
        duration_minutes: 15,
        summary: `تتناول هذه الوحدة المهارات الأساسية للتعامل مع الحاسب الآلي بكفاءة وسرعة، مع التركيز على احتراف اختصارات لوحة المفاتيح (Shortcuts) لتسريع إنجاز المهام المكتبية، وإدارة الملفات والمجلدات عبر مستكشف النظام، والتحكم بنوافذ العمل والتنقل بين التطبيقات.`,
        topics: [
          'المحور الأول: المفاهيم الأساسية لنظام التشغيل ووحدات الإدخال',
          'المحور الثاني: أهم اختصارات لوحة المفاتيح الشائعة والإنتاجية',
          'المحور الثالث: إدارة الحافظة والملفات والتحكم بالنوافذ'
        ]
      },
      glossary_notes: {
        title: `مذكرات ومفاهيم: ${compTitle}`,
        description: `أهم المفاهيم التقنية والمصطلحات الإنجليزية الخاصة بمهارات الحاسب واختصارات لوحة المفاتيح.`,
        terms: compTerms
      },
      quiz: {
        title: `اختبار الدرس: ${compTitle}`,
        duration_minutes: 15,
        total_grade: 10,
        questions: compQuestions
      },
      assignment: {
        title: `التكليف العملي: تطبيق اختصارات الحاسب`,
        total_grade: 10,
        instructions: `قم بفتح برنامج معالج النصوص وجرّب كتابة نص من 3 أسطر وتطبيق أوامر النسخ واللصق والتراجع والحفظ باستخدام اختصارات لوحة المفاتيح فقط دون الفأرة.`,
        assignment_type: 'mcq_or_text',
        mcq_questions: [
          {
            question: 'أي من الاختصارات التالية يتيح إغلاق النافذة أو التطبيق النشط فوراً؟',
            options: ['Alt + F4', 'Ctrl + Shift', 'Win + Tab', 'Esc + Enter'],
            correct_answer: 'Alt + F4'
          }
        ],
        text_questions: [
          {
            prompt: 'اذكر 3 اختصارات تستخدمها يومياً في عملك على الحاسب مع شرح وظيفة كل اختصار.',
            guidelines: 'اذكر الاختصار ووظيفته وفائدته في توفير الوقت.',
            model_answer: 'مثال: 1. Ctrl+C للنسخ 2. Ctrl+V للصق 3. Ctrl+Z للتراجع عن الأخطاء.'
          }
        ],
        questions: [
          {
            type: 'mcq',
            question: 'أي من الاختصارات التالية يتيح إغلاق النافذة أو التطبيق النشط فوراً؟',
            options: ['Alt + F4', 'Ctrl + Shift', 'Win + Tab', 'Esc + Enter'],
            correct_answer: 'Alt + F4'
          },
          {
            type: 'true_false',
            question: 'عبارة: حفظ الملفات بانتظام بواسطة Ctrl+S يحمي المستندات من فقدان البيانات عند انقطاع التيار.',
            options: ['صح ✓', 'خطأ ✗'],
            correct_answer: 'صح ✓'
          }
        ]
      }
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // DOMAIN C: GENERAL TEXT ANALYSIS & UNIVERSAL GROUND TRUTH
  // ─────────────────────────────────────────────────────────────────────────────
  const extractedTerms = [];
  const termRegex = /([\u0600-\u06FFA-Za-z0-9\s()\/\\-]{2,45})\s*[:\-=–—]\s*([^\n\r]{3,150})/g;
  let tMatch;
  while ((tMatch = termRegex.exec(cleanText)) !== null && extractedTerms.length < 6) {
    const tLabel = tMatch[1].replace(/^[\d\.\-\*•)]+\s*/, '').trim();
    const tDesc = tMatch[2].trim();
    if (tLabel.length > 2 && tLabel.length < 45 && !tLabel.toLowerCase().includes('slide') && !tLabel.toLowerCase().includes('page')) {
      extractedTerms.push({
        en: tLabel,
        ar: tLabel,
        definition: tDesc || `مفهوم تعليمي مشتق من نص الدرس.`
      });
    }
  }

  // If no colon pattern found, extract terms from sentences
  if (extractedTerms.length === 0) {
    const words = lines.join(' ').split(/\s+/).filter(w => w.length >= 4);
    const keyPhrases = lines.slice(0, 4).map(l => l.replace(/[\.\-\*]/g, '').trim()).filter(Boolean);
    keyPhrases.forEach((phrase, idx) => {
      if (phrase.length >= 3 && phrase.length <= 40) {
        extractedTerms.push({
          en: phrase,
          ar: phrase,
          definition: `مفهوم رئيسي تم استخلاصه مباشرة من نص الدرس ومحاوره.`
        });
      }
    });
  }

  // Fallback safe terms derived purely from topic name
  if (extractedTerms.length === 0) {
    extractedTerms.push(
      { en: `${title} - المفهوم الأول`, ar: `${title} - المفهوم الأول`, definition: `المفهوم الأساسي والمدخل الأكاديمي لموضوع ${title}.` },
      { en: `${title} - التطبيق العملي`, ar: `${title} - التطبيق العملي`, definition: `التطبيق والممارسة العملية للمهارات المرتبطة بـ ${title}.` },
      { en: `${title} - المعايير والأهداف`, ar: `${title} - المعايير والأهداف`, definition: `المعايير المعتمدة لتقييم استيعاب ${title}.` },
      { en: `${title} - الأثر والنتائج`, ar: `${title} - الأثر والنتائج`, definition: `الأثر الإيجابي والنتائج المحققة من دراسة وممارسة ${title}.` }
    );
  }

  const summaryText = lines.slice(0, 5).join(' ') || `تتناول هذه الوحدة دراسة تفصيلية لموضوع "${title}" والمفاهيم المرتبطة به.`;

  const dynamicQuestions = [
    {
      type: 'mcq',
      question: `ما هو المحور الأساسي الذي يركز عليه موضوع '${title}'؟`,
      options: [
        `استيعاب وتطبيق المفاهيم الأساسية الخاصة بـ ${title}`,
        'تجاهل المبادئ والمعارف الواردة في الدرس',
        'التركيز على موضوعات خارج سياق وأهداف الدرس',
        'الاقتصار على الحفظ الشكلي دون فهم حقيقي'
      ],
      correct_answer: `استيعاب وتطبيق المفاهيم الأساسية الخاصة بـ ${title}`,
      explanation: `الدرس يهدف بشكل رئيسي إلى بناء الفهم العملي والتطبيقي لـ ${title}.`
    },
    {
      type: 'mcq',
      question: `ما هو المدلول التعليمي للمفهوم '${extractedTerms[0].en}' في هذا الدرس؟`,
      options: [
        extractedTerms[0].definition.slice(0, 75),
        'مفهوم عام لا علاقة له بمحتوى هذه الوحدة',
        'إجراء غير معتمد ولا يحقق أهداف الدرس',
        'تعريف مضلل يختلف كلياً عن موضوع الدرس'
      ],
      correct_answer: extractedTerms[0].definition.slice(0, 75),
      explanation: `يرتبط المفهوم ${extractedTerms[0].en} مباشرة بـ ${extractedTerms[0].definition}`
    },
    {
      type: 'mcq',
      question: `أي من الممارسات التالية يدعم التطبيق الأمثل لمخرجات موضوع '${title}'؟`,
      options: [
        'الممارسة المستمرة وربط المفاهيم بالتطبيق الواقعي العملي',
        'تأجيل التطبيق والاعتماد على التخمين',
        'إهمال الملاحظات والإرشادات التوجيهية للدرس',
        'عدم مراجعة المعارف المستفادة من الوحدة'
      ],
      correct_answer: 'الممارسة المستمرة وربط المفاهيم بالتطبيق الواقعي العملي',
      explanation: 'التطبيق العملي والممارسة المستمرة يرسخان المفاهيم ويرفعان مستوى الإتقان.'
    },
    {
      type: 'mcq',
      question: `كيف يسهم استيعاب '${extractedTerms[Math.min(1, extractedTerms.length - 1)].ar}' في تحقيق أهداف الدرس؟`,
      options: [
        'بتعزيز الفهم المنهجي ورفع دقة التطبيق والنتائج',
        'بزيادة التشتت أثناء تنفيذ المهام',
        'بإلغاء الحاجة للتقييم والمراجعة',
        'بعدم مراعاة الخطوات المعتمدة'
      ],
      correct_answer: 'بتعزيز الفهم المنهجي ورفع دقة التطبيق والنتائج',
      explanation: 'الفهم المنهجي السليم هو الركيزة الأساسية لجودة المخرجات والتطبيق.'
    },
    {
      type: 'mcq',
      question: `ما هي الخطوة الأولى الموصى بها للاستفادة الكاملة من محتوى '${title}'؟`,
      options: [
        'قراءة واستيعاب الأفكار الرئيسية وفهم دلالات المفاهيم المطروحة',
        'تخطي المحتوى النظري والبدء العشوائي دون معرفة مسبقة',
        'إلغاء التقييمات الذاتية والواجبات الملحقة',
        'تجاهل المصطلحات والمفردات التخصصية'
      ],
      correct_answer: 'قراءة واستيعاب الأفكار الرئيسية وفهم دلالات المفاهيم المطروحة',
      explanation: 'البداية الصحيحة تنطلق من القراءة الواعية واستيعاب الأفكار الجوهرية للدرس.'
    },
    {
      type: 'mcq',
      question: `أي مما يلي يعبر عن الأثر الإيجابي لتحقيق مخرجات التعلم في '${title}'؟`,
      options: [
        'اكتساب مهارات ومعارف تطبيقية تعزز الكفاءة وجودة الأداء',
        'البقاء عند نفس المستوى دون تطور معرفي',
        'الاعتماد الكلي على الآخرين لتنفيذ المهام',
        'فقدان الترابط بين المفاهيم النظرية والتطبيق'
      ],
      correct_answer: 'اكتساب مهارات ومعارف تطبيقية تعزز الكفاءة وجودة الأداء',
      explanation: 'الهدف النهائي للتعلم هو النمو المعرفي وامتلاك القدرة على التطبيق الفعلي.'
    },
    {
      type: 'true_false',
      question: `عبارة: استيعاب المفاهيم والمصطلحات الواردة في '${title}' يُعد أساساً لبناء المعرفة المتكاملة وتحقيق أهداف الدرس.`,
      options: ['صح ✓', 'خطأ ✗'],
      correct_answer: 'صح ✓',
      explanation: 'صواب؛ لأن استيعاب المفاهيم يمثل حجر الأساس للتطبيق والنجاح.'
    },
    {
      type: 'true_false',
      question: `عبارة: المفاهيم المطروحة في هذا الدرس هي مجرد نصوص نظرية ولا تتطلب أي تطبيق واقعي في الحياة أو العمل.`,
      options: ['صح ✓', 'خطأ ✗'],
      correct_answer: 'خطأ ✗',
      explanation: 'خطأ؛ لأن الهدف الأساسي من المنهج هو تحويل المعرفة إلى تطبيق وسلوك عملي ملموس.'
    },
    {
      type: 'true_false',
      question: `عبارة: المراجعة المنتظمة والحرص على حل التكليفات يضمنان تثبيت المعارف وتحقيق أعلى درجات الإتقان.`,
      options: ['صح ✓', 'خطأ ✗'],
      correct_answer: 'صح ✓',
      explanation: 'صواب؛ المراجعة والحل التطبيقي عنصران حاسمان لرسوخ المعلومات في الذهن.'
    },
    {
      type: 'matching',
      question: '🔗 سؤال التوصيل والمطابقة: صِل كل مفهوم بتعريفه ودلالته الصحيحة وفق ما ورد في الدرس:',
      pairs: [
        { left: extractedTerms[0]?.en || 'المفهوم الأول', right: extractedTerms[0]?.definition.slice(0, 60) || 'الأساس المعرفي للدرس' },
        { left: extractedTerms[Math.min(1, extractedTerms.length - 1)]?.en || 'المفهوم الثاني', right: extractedTerms[Math.min(1, extractedTerms.length - 1)]?.definition.slice(0, 60) || 'التطبيق العملي في الميدان' },
        { left: extractedTerms[Math.min(2, extractedTerms.length - 1)]?.en || 'المفهوم الثالث', right: extractedTerms[Math.min(2, extractedTerms.length - 1)]?.definition.slice(0, 60) || 'معايير الإتقان والجودة' },
        { left: extractedTerms[Math.min(3, extractedTerms.length - 1)]?.en || 'المفهوم الرابع', right: extractedTerms[Math.min(3, extractedTerms.length - 1)]?.definition.slice(0, 60) || 'الأثر والنتائج الإيجابية' }
      ],
      explanation: 'ممتاز! تم توصيل كافة المفاهيم بتعريفاتها الدقيقة بنجاح.'
    }
  ];

  return {
    suggested_videos: resolveDirectEducationalVideos(cleanText, title),
    lecture: {
      title: `محاضرة: ${title}`,
      duration_minutes: 15,
      summary: summaryText.length > 80 ? summaryText : `تتناول هذه الوحدة دراسة شاملة لمفاهيم "${title}"، مع التركيز على استيعاب المبادئ الأساسية، وتطبيق المعايير والممارسات المعتمدة، وربط المعارف المكتسبة بالممارسة الواقعية.`,
      topics: [
        `المحور الأول: أسس ومفاهيم ${title}`,
        `المحور الثاني: الإجراءات والمعايير التطبيقية`,
        `المحور الثالث: التطبيق العملي والنتائج الإيجابية`
      ]
    },
    glossary_notes: {
      title: `قاموس ومذكرات: ${title}`,
      description: `مفاهيم ومصطلحات تخصصية مستنبطة مباشرة من محتوى الدرس.`,
      terms: extractedTerms
    },
    quiz: {
      title: `اختبار الدرس: ${title}`,
      duration_minutes: 15,
      total_grade: 10,
      questions: dynamicQuestions
    },
    assignment: {
      title: `الواجب والتكليف: ${title}`,
      total_grade: 10,
      instructions: `راجع المحتوى العلمي لدرس "${title}" ونفّذ المطلوب مستخدماً المفاهيم والمصطلحات المكتسبة.`,
      assignment_type: 'mcq_or_text',
      mcq_questions: [
        {
          question: `سؤال تطبيقي: ما هو الأسلوب الأمثل لتطبيق المعارف المكتسبة في '${title}'؟`,
          options: [
            'الالتزام بالممارسة الدقيقة ومراعاة المعايير والخطوات المعتمدة',
            'التنفيذ العشوائي دون الرجوع للإرشادات',
            'تجاهل التوجيهات الأساسية للدرس',
            'الاكتفاء بالجانب النظري دون تطبيق'
          ],
          correct_answer: 'الالتزام بالممارسة الدقيقة ومراعاة المعايير والخطوات المعتمدة'
        }
      ],
      text_questions: [
        {
          prompt: `اكتب تقريراً موجزاً توضح فيه كيف يمكن الاستفادة من موضوع "${title}" في تحسين الأداء وتطوير المهارات.`,
          guidelines: 'اذكر أمثلة واقعية واستخدم المفاهيم والمصطلحات المناسبة.',
          model_answer: 'تتضمن الإجابة شرحاً واضحاً لآليات التطبيق، مع ذكر أمثلة واقعية وأثرها في رفع مستوى الكفاءة.'
        }
      ],
      questions: [
        {
          type: 'mcq',
          question: `سؤال تطبيقي: ما هو الأسلوب الأمثل لتطبيق المعارف المكتسبة في '${title}'؟`,
          options: [
            'الالتزام بالممارسة الدقيقة ومراعاة المعايير والخطوات المعتمدة',
            'التنفيذ العشوائي دون الرجوع للإرشادات',
            'تجاهل التوجيهات الأساسية للدرس',
            'الاكتفاء بالجانب النظري دون تطبيق'
          ],
          correct_answer: 'الالتزام بالممارسة الدقيقة ومراعاة المعايير والخطوات المعتمدة'
        },
        {
          type: 'true_false',
          question: `عبارة: تطبيق المفاهيم المكتسبة في '${title}' يسهم إيجاباً في رفع جودة الأداء وإتقان المهام.`,
          options: ['صح ✓', 'خطأ ✗'],
          correct_answer: 'صح ✓'
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
//  GROQ CLOUD API CLIENT (LLAMA 3.3 70B VERSATILE - OPENAI COMPATIBLE)
// ══════════════════════════════════════════════════════════════════════════════
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

async function callGroqChatCompletion({ prompt, systemPrompt, apiKey, model = DEFAULT_GROQ_MODEL, temperature = 0.3 }) {
  const modelsToTry = [model];
  if (!modelsToTry.includes("llama-3.3-70b-versatile")) modelsToTry.push("llama-3.3-70b-versatile");
  if (!modelsToTry.includes("llama-3.1-70b-versatile")) modelsToTry.push("llama-3.1-70b-versatile");
  if (!modelsToTry.includes("llama-3.1-8b-instant")) modelsToTry.push("llama-3.1-8b-instant");

  const errors = [];
  let parsedData = null;
  let modelUsed = null;

  for (const curModel of modelsToTry) {
    try {
      const res = await fetch(GROQ_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + apiKey
        },
        body: JSON.stringify({
          model: curModel,
          messages: [
            {
              role: "system",
              content: systemPrompt || "أنت خبير أكاديمي وتربوي معتمد في معهد الذهب الأسود للتدريب (BGTI). أعد فقط كائن JSON نقي وصالح يتوافق 100% مع البنية المطلوبة دون أي نصوص إضافية خارج الـ JSON."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          response_format: { type: "json_object" },
          temperature: temperature
        })
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error("Groq API error on model " + curModel + " (Status " + res.status + "):", errText.slice(0, 300));
        errors.push("[" + curModel + " HTTP " + res.status + "]: " + errText.slice(0, 150));
        continue;
      }

      const json = await res.json();
      const content = json.choices?.[0]?.message?.content;
      const extracted = safeExtractJson(content);
      if (extracted && typeof extracted === "object") {
        parsedData = extracted;
        modelUsed = curModel;
        break;
      } else {
        console.warn("Groq model " + curModel + " response could not be parsed as JSON:", content?.slice(0, 200));
        errors.push("[" + curModel + " JSON Parse Error]: failed to parse response");
      }
    } catch (err) {
      console.error("Groq API exception on model " + curModel + ":", err.message);
      errors.push("[" + curModel + " Exception]: " + err.message);
    }
  }

  return { data: parsedData, model: modelUsed, errors };
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

// ══════════════════════════════════════════════════════════════════════════════
//  DEDICATED FAST QUIZ GENERATION HANDLER (Groq Cloud API - Llama 3.3 70B)
// ══════════════════════════════════════════════════════════════════════════════
async function handleDedicatedQuizGeneration(req, res, startTime) {
  const { courseName, weekTitle, weekTopic, textInput, lessonContent, questionsCount = 10 } = req.body || {};
  
  const rawApiKey = process.env.GROQ_API_KEY || process.env.GROQ_KEY || "";
  const apiKey = rawApiKey.trim().replace(/^["']|["']$/g, "");
  const hasValidKey = Boolean(apiKey && apiKey !== "YOUR_GROQ_API_KEY_HERE" && apiKey.length > 15);

  const effectiveCourse = (courseName || "").trim() || "المقرر التدريبي المعتمد";
  const effectiveWeek = (weekTitle || "").trim() || "الوحدة التدريبية";
  const effectiveTopic = (weekTopic || "").trim() || effectiveWeek;
  const rawContent = (lessonContent || textInput || "").trim();

  // Guard: if absolutely no content and no topic provided
  if (!rawContent && !weekTopic && !courseName) {
    return res.status(400).json({
      success: false,
      error: "لم يتم توفير أي محتوى دراسي أو موضوع لتوليد أسئلة الاختبار."
    });
  }

  const effectiveContent = rawContent || (effectiveCourse + " - " + effectiveWeek + ": " + effectiveTopic);

  let generatedData = null;
  let modeUsed = "demo_fallback";
  let groqApiErrors = [];

  if (hasValidKey) {
    const promptText = "أنت رئيس لجنة الاختبارات والتقييم في معهد الذهب الأسود للتدريب (BGTI).\n" +
      "مهمتك: صياغة اختبار أسبوعي عالي الجودة والاحترافية مكون من 10 أسئلة مستنبطة 100% من صلب المادة العلمية والدرس المرفق أدناه، بصيغة JSON نقي فقط:\n\n" +
      "## بيانات المقرر والدرس:\n" +
      "- المقرر التدريبي: " + effectiveCourse + "\n" +
      "- الأسبوع / الوحدة: " + effectiveWeek + "\n" +
      "- موضوع الدرس الأساسي: " + effectiveTopic + "\n\n" +
      "## المادة العلمية ومحتوى الدرس (المصدر الوحيد للأسئلة - Ground Truth):\n---\n" +
      effectiveContent.slice(0, 20000) + "\n---\n\n" +
      "## معايير الجودة الأكاديمية الصارمة:\n" +
      "1. الالتزام بالموضوع بنسبة 100%: تُبنى جميع الأسئلة حصراً من صلب المادة العلمية ومفاهيمها أعلاه. يُمنع منعاً باتاً استدعاء مواضيع السلامة الصناعية (PPE/SOP) أو إجراءات المصانع والورش إذا لم تكن واردة في النص المرفق صراحة.\n" +
      "2. تنوع وشمولية بنية الأسئلة (10 أسئلة متكاملة):\n" +
      "   - 6 أسئلة اختيار من متعدد (MCQ):\n" +
      "     * لكل سؤال 4 خيارات منطقية ومتمايزة من صلب موضوع الدرس.\n" +
      "     * يُمنع منعاً باتاً استخدام خيارات اصطناعية أو هزلية أو بدائل عامة (مثل \"مفهوم خارج سياق الدرس\" أو \"خيار 3\").\n" +
      "     * يجب أن تطابق الإجابة المحددة في \"correct_answer\" حرفياً أحد الخيارات الأربعة الموجودة في \"options\".\n" +
      "   - 3 أسئلة صح وخطأ (True/False):\n" +
      "     * مصفوفة الخيارات \"options\" يجب أن تكون بالضبط وبحرفية: [\"صح\", \"خطأ\"].\n" +
      "     * حقل الإجابة \"correct_answer\" يجب أن يكون إما \"صح\" أو \"خطأ\" بالضبط.\n" +
      "     * كتابة تعليل علمي دقيق في \"explanation\" يوضح سبب الصحة أو الخطأ.\n" +
      "   - سؤال توصيل ومطابقة واحد (Matching):\n" +
      "     * يحتوي على 4 أزواج مطابقة من صلب الدرس: مصفوفة \"pairs\" بها 4 كائنات، كل كائن به \"left\" (المصطلح أو المفهوم) و \"right\" (التعريف أو الاستخدام الصحيح له).\n" +
      "3. التنسيق المطلوب: أعد فقط كائن JSON الصالح التالي دون أي نصوص تمهيدية أو كتل تعليق:\n" +
      JSON.stringify({
        title: "اختبار تقييم الدرس: " + effectiveTopic,
        duration_minutes: 15,
        total_grade: 10,
        questions: [
          {
            id: 1,
            type: "mcq",
            question: "نص السؤال الأول...",
            options: ["خيار 1", "خيار 2", "خيار 3", "خيار 4"],
            correct_answer: "خيار 1",
            explanation: "شرح توضيحي لسبب صحة الإجابة..."
          },
          {
            id: 7,
            type: "true_false",
            question: "نص العبارة الأولى...",
            options: ["صح", "خطأ"],
            correct_answer: "صح",
            explanation: "التعليل..."
          },
          {
            id: 10,
            type: "matching",
            question: "🔗 سؤال التوصيل والمطابقة: صِل كل مفهوم في القائمة (أ) بتعريفه الدقيق في القائمة (ب):",
            pairs: [
              { left: "المفهوم 1", right: "التعريف 1" },
              { left: "المفهوم 2", right: "التعريف 2" },
              { left: "المفهوم 3", right: "التعريف 3" },
              { left: "المفهوم 4", right: "التعريف 4" }
            ],
            explanation: "تم توصيل كافة المفاهيم بتعريفاتها الصحيحة بدقة."
          }
        ]
      }, null, 2);

    const groqCall = await callGroqChatCompletion({
      prompt: promptText,
      systemPrompt: "أنت رئيس لجنة الاختبارات والتقييم في معهد الذهب الأسود للتدريب (BGTI). صغ اختباراً مكوناً من 10 أسئلة مستنبطة 100% من نص الدرس المرفق بصيغة JSON نقي فقط.",
      apiKey,
      model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
      temperature: 0.25
    });

    groqApiErrors = groqCall.errors;
    if (groqCall.data) {
      const parsed = groqCall.data;
      if (Array.isArray(parsed.questions) && parsed.questions.length >= 3) {
        generatedData = parsed;
        modeUsed = "groq (" + groqCall.model + ")";
      } else if (parsed.quiz && Array.isArray(parsed.quiz.questions)) {
        generatedData = parsed.quiz;
        modeUsed = "groq (" + groqCall.model + ")";
      }
    }
  }

  // If Groq failed or no key: build high-quality semantic fallback derived 100% from the lesson text
  if (!generatedData) {
    const fullSmart = buildSmartLmsContentFromText(effectiveContent, "quiz_source.txt", effectiveCourse, effectiveTopic);
    generatedData = fullSmart.quiz;
    modeUsed = (hasValidKey && groqApiErrors.length > 0)
      ? "semantic_fallback_after_groq_error"
      : "semantic_local_generator";
  }

  // Sanitize, normalize and validate all questions
  generatedData = normalizeAndValidateQuizData(generatedData, effectiveTopic);

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);
  return res.status(200).json({
    success: true,
    mode: modeUsed,
    hasGroqApiKey: hasValidKey,
    hasGeminiApiKey: hasValidKey,
    courseName: effectiveCourse,
    weekTopic: effectiveTopic,
    processing_time_seconds: parseFloat(durationSec),
    data: {
      quiz: generatedData
    },
    groqErrors: groqApiErrors.length > 0 ? groqApiErrors : undefined
  });
}
// ══════════════════════════════════════════════════════════════════════════════
//  DEDICATED ASSIGNMENT GENERATION HANDLER (Groq Cloud API - Llama 3.3 70B)
// ══════════════════════════════════════════════════════════════════════════════
async function handleDedicatedAssignmentGeneration(req, res, startTime) {
  const { courseName, weekTitle, weekTopic, textInput, lessonContent } = req.body || {};
  
  const rawApiKey = process.env.GROQ_API_KEY || process.env.GROQ_KEY || "";
  const apiKey = rawApiKey.trim().replace(/^["']|["']$/g, "");
  const hasValidKey = Boolean(apiKey && apiKey !== "YOUR_GROQ_API_KEY_HERE" && apiKey.length > 15);

  const effectiveCourse = (courseName || "").trim() || "المقرر التدريبي المعتمد";
  const effectiveWeek = (weekTitle || "").trim() || "الوحدة التدريبية";
  const effectiveTopic = (weekTopic || "").trim() || effectiveWeek;
  const rawContent = (lessonContent || textInput || "").trim();

  if (!rawContent && !weekTopic && !courseName) {
    return res.status(400).json({
      success: false,
      error: "لم يتم توفير أي محتوى دراسي أو موضوع لتوليد الواجب."
    });
  }

  const effectiveContent = rawContent || (effectiveCourse + " - " + effectiveWeek + ": " + effectiveTopic);

  let generatedData = null;
  let modeUsed = "demo_fallback";
  let groqApiErrors = [];

  if (hasValidKey) {
    const promptText = "أنت خبير أكاديمي ومصمم تكليفات تدريبية لدى معهد الذهب الأسود للتدريب (BGTI).\n" +
      "المهمة: صياغة واجب أسبوعي تطبيقي عالي الجودة مستنبط 100% من صلب الدرس والمادة العلمية المرفقة، بصيغة JSON نقي فقط:\n\n" +
      "## بيانات المقرر والدرس:\n" +
      "- المقرر التدريبي: " + effectiveCourse + "\n" +
      "- الوحدة / الأسبوع: " + effectiveWeek + "\n" +
      "- موضوع الدرس: " + effectiveTopic + "\n\n" +
      "## المادة العلمية ومحتوى الدرس:\n---\n" +
      effectiveContent.slice(0, 20000) + "\n---\n\n" +
      "## المعايير المطلوبة:\n" +
      "1. الالتزام بموضوع الدرس بنسبة 100% وتجنب أي مواضيع خارجية.\n" +
      "2. يتضمن الواجب:\n" +
      "   - عنوان واضح وتعليمات مفصلة للمتدرب.\n" +
      "   - 2 إلى 3 أسئلة تطبيقية اختيار من متعدد مرتبطة بحالات واقعية من الدرس.\n" +
      "   - تكليف عملي تحريري يطلب من المتدرب تطبيق المفاهيم في فقرة محددة مع إرشادات ونموذج إجابة استرشادي للمدرب.\n" +
      "3. التنسيق: أعد فقط كائن JSON الصالح التالي:\n" +
      JSON.stringify({
        title: "الواجب الأسبوعي التطبيقي: " + effectiveTopic,
        total_grade: 10,
        instructions: "تعليمات واضحة للمتدرب لكيفية حل التكليف...",
        questions: [
          {
            type: "mcq",
            question: "سؤال تطبيقي...",
            options: ["الخيار أ", "الخيار ب", "الخيار ج", "الخيار د"],
            correct_answer: "الخيار أ",
            explanation: "التوضيح..."
          }
        ],
        text_questions: [
          {
            prompt: "المطلوب التحريري...",
            guidelines: "إرشادات الصياغة...",
            model_answer: "نموذج الإجابة..."
          }
        ]
      }, null, 2);

    const groqCall = await callGroqChatCompletion({
      prompt: promptText,
      systemPrompt: "أنت مصمم تكليفات تدريبية في معهد الذهب الأسود للتدريب (BGTI). صغ واجباً أسبوعياً تطبيقياً بصيغة JSON نقي فقط.",
      apiKey,
      model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
      temperature: 0.3
    });

    groqApiErrors = groqCall.errors;
    if (groqCall.data) {
      const parsed = groqCall.data;
      if (parsed && (parsed.instructions || parsed.questions || parsed.title)) {
        generatedData = parsed.assignment || parsed;
        modeUsed = "groq (" + groqCall.model + ")";
      }
    }
  }

  if (!generatedData) {
    const fullSmart = buildSmartLmsContentFromText(effectiveContent, "assignment_source.txt", effectiveCourse, effectiveTopic);
    generatedData = fullSmart.assignment;
    modeUsed = (hasValidKey && groqApiErrors.length > 0)
      ? "semantic_fallback_after_groq_error"
      : "semantic_local_generator";
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);
  return res.status(200).json({
    success: true,
    mode: modeUsed,
    hasGroqApiKey: hasValidKey,
    hasGeminiApiKey: hasValidKey,
    courseName: effectiveCourse,
    weekTopic: effectiveTopic,
    processing_time_seconds: parseFloat(durationSec),
    data: {
      assignment: generatedData
    },
    groqErrors: groqApiErrors.length > 0 ? groqApiErrors : undefined
  });
}
async function handleExecutiveReport(req, res, startTime) {
  const { recipient, sender, weekLabel, stats, additionalNotes } = req.body || {};
  const rawApiKey = process.env.GROQ_API_KEY || process.env.GROQ_KEY || "";
  const apiKey = rawApiKey.trim().replace(/^["']|["']$/g, "");
  const hasValidKey = Boolean(apiKey && apiKey !== "YOUR_GROQ_API_KEY_HERE" && apiKey.length > 15);

  let generatedData = null;
  let modeUsed = "demo_fallback";

  if (hasValidKey) {
    try {
      const promptText = EXECUTIVE_PROMPT_TEMPLATE
        .replace("{RECIPIENT}", recipient || "سعادة الأستاذ المحترم / محمد كمال العواد (مدير التشغيل)")
        .replace("{SENDER}", sender || "إدارة معهد الذهب الأسود العالي للتدريب - فرع عنك")
        .replace(/{WEEK_LABEL}/g, weekLabel || "الأسبوع الحالي")
        .replace("{TOTAL_TRAINEES}", stats?.totalTrainees || 830)
        .replace("{ATTENDANCE_RATE}", stats?.overallAttendanceRate || 94)
        .replace("{P1_RATE}", stats?.period1Rate || 95)
        .replace("{P2_RATE}", stats?.period2Rate || 93)
        .replace("{GROUPS_COUNT}", stats?.activeGroupsCount || 16)
        .replace("{TRAINERS_COUNT}", stats?.trainersCount || 9)
        .replace("{LMS_STATS}", "التكليفات المنجزة: " + (stats?.assignmentsSubmittedCount || 780) + "، الاختبارات المكتملة: " + (stats?.quizzesCompletedCount || 42))
        .replace("{ADDITIONAL_NOTES}", additionalNotes ? ("\n- ملاحظات إضافية من الإدارة: " + additionalNotes) : "");

      const groqCall = await callGroqChatCompletion({
        prompt: promptText,
        systemPrompt: "أنت مستشار إداري وأكاديمي تنفيذي أول لمعهد الذهب الأسود للتدريب (BGTI). صغ تقريراً إدارياً شاملاً بصيغة JSON نقي فقط.",
        apiKey,
        model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
        temperature: 0.3
      });

      if (groqCall.data && typeof groqCall.data === "object") {
        generatedData = groqCall.data;
        modeUsed = "groq (" + groqCall.model + ")";
      }
    } catch (err) {
      console.warn("Groq executive report error, falling back to smart template:", err.message);
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
    const rawApiKey = process.env.GROQ_API_KEY || process.env.GROQ_KEY || '';
    const cleanKey = rawApiKey.trim().replace(/^["']|["']$/g, '');
    const hasValidKey = Boolean(cleanKey && cleanKey !== 'YOUR_GROQ_API_KEY_HERE' && cleanKey.length > 15);
    const sbUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '').trim();
    const sbKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '').trim();

    return res.status(200).json({
      status: 'ready',
      service: 'BGTI LMS AI Auto-Generation API (Groq Cloud API - Llama 3.3 70B)',
      endpoints: {
        generate: 'POST /api/generate'
      },
      hasGroqApiKey: hasValidKey,
      hasGeminiApiKey: hasValidKey,
      keyPrefix: hasValidKey ? cleanKey.substring(0, 8) + '...' : null,
      defaultModel: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
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

  // Route: Dedicated Quiz Generation (Fast, high-precision, 100% ground-truth)
  if (req.body && (req.body.action === 'generate_quiz' || req.body.targetComponent === 'quiz')) {
    return handleDedicatedQuizGeneration(req, res, startTime);
  }

  // Route: Dedicated Assignment Generation
  if (req.body && (req.body.action === 'generate_assignment' || req.body.targetComponent === 'assignment')) {
    return handleDedicatedAssignmentGeneration(req, res, startTime);
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
    const rawApiKey = process.env.GROQ_API_KEY || process.env.GROQ_KEY || "";
    const apiKey = rawApiKey.trim().replace(/^["']|["']$/g, "");
    const hasValidKey = Boolean(apiKey && apiKey !== "YOUR_GROQ_API_KEY_HERE" && apiKey.length > 15);

    let generatedData = null;
    let modeUsed = "demo_fallback";
    let groqApiErrors = [];

    let detectedLessonTopic = "";
    if (hasDirectText) {
      const firstLine = extractedText.split("\n")[0].replace(/^[\d\.\-\*#:]+\s*/, "").trim();
      detectedLessonTopic = (firstLine.length >= 3 && firstLine.length <= 90) ? firstLine : "";
    }

    const isTextMode = Boolean(req.body?.isDirectText || (hasDirectText && !hasFile));
    const courseDiscipline = isTextMode
      ? (detectedLessonTopic || req.body?.topic || "الموضوع التعليمي المستقل")
      : (courseName || "المقرر التدريبي المعتمد");
    const weekDiscipline = detectedLessonTopic || req.body?.topic || weekTopic || weekTitle || "الوحدة التدريبية";

    // ─── Call Groq Cloud API if Key is Available ──────────────────────────
    if (hasValidKey) {
      let contextBlock = "## بيانات الكورس والأسبوع:\n";
      if (courseName) contextBlock += "- اسم الكورس التدريبي: " + courseName + "\n";
      if (weekTitle) contextBlock += "- الأسبوع: " + weekTitle + "\n";
      if (weekTopic) contextBlock += "- موضوع الوحدة: " + weekTopic + "\n";

      let contentSection = "";
      if (isTextMode) {
        contentSection = contextBlock + "\n## المحتوى أو الموضوع الدراسي المُدخل:\n---\n" + extractedText + "\n---";
      } else if (isPdf) {
        const trimmedText = extractedText.length > 25000
          ? extractedText.slice(0, 25000) + "\n\n[... تم الاكتفاء بهذا الجزء من المستند ...]"
          : extractedText;
        contentSection = contextBlock + "\n## المحتوى المُستخرج من وثيقة الـ PDF (" + safeFilename + "):\n---\n" + trimmedText + "\n---";
      } else {
        const trimmedText = extractedText.length > 20000
          ? extractedText.slice(0, 20000) + "\n\n[... تم اقتصاص بقية النص لتفادي تجاوز الحدود ...]"
          : extractedText;
        contentSection = contextBlock + "\n## المحتوى المُستخرج من شرائح العرض (" + safeFilename + "):\n---\n" + trimmedText + "\n---";
      }

      const fullPromptText = formatLmsPrompt(contentSection);

      const groqCall = await callGroqChatCompletion({
        prompt: fullPromptText,
        systemPrompt: "أنت خبير أكاديمي ومصمم مناهج لدى معهد الذهب الأسود للتدريب (BGTI). أعد كائن JSON صالحاً بنسبة 100% يحتوي على المكونات التعليمية الأربعة للوحدة التدريبية دون أي نصوص إضافية خارج الـ JSON.",
        apiKey,
        model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
        temperature: 0.3
      });

      groqApiErrors = groqCall.errors;
      if (groqCall.data && typeof groqCall.data === "object") {
        generatedData = groqCall.data;
        modeUsed = "groq (" + groqCall.model + ")";
      }
    }

    // ─── Smart Semantic Fallback if Groq not used or failed ──────────────────────────
    if (!generatedData) {
      const activeTopic = isTextMode ? (detectedLessonTopic || weekDiscipline) : (req.body?.weekTopic || req.body?.weekTitle || req.body?.courseName || safeFilename);
      generatedData = buildSmartLmsContentFromText(extractedText, safeFilename, courseDiscipline, activeTopic);
      if (hasValidKey && groqApiErrors.length > 0) {
        modeUsed = "semantic_fallback_after_groq_error";
      } else {
        modeUsed = "semantic_local_generator";
      }
    }

    // Ensure all suggested videos match the actual lesson topic
    const effectiveTopic = isTextMode ? (detectedLessonTopic || weekDiscipline) : (req.body?.weekTopic || req.body?.weekTitle || req.body?.courseName || safeFilename);
    generatedData = ensureSpecificYouTubeVideos(generatedData, effectiveTopic + " " + (generatedData?.lecture?.title || ""));

    // Strictly ensure quiz questions count never falls below 10 questions
    generatedData = ensureMinQuizQuestions(generatedData, effectiveTopic);

    const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);

    return res.status(200).json({
      success: true,
      mode: modeUsed,
      hasGroqApiKey: hasValidKey,
      hasGeminiApiKey: hasValidKey,
      filename: safeFilename,
      fileSizeKB,
      file_url: cloudFileUrl || "",
      text_length: textLength,
      processing_time_seconds: parseFloat(durationSec),
      data: generatedData,
      groqErrors: groqApiErrors.length > 0 ? groqApiErrors : undefined
    });
  
} catch (err) {
    console.error('api/generate handler fatal error:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'حدث خطأ داخلي أثناء معالجة الملف وتوليد المحتوى.'
    });
  }
}
