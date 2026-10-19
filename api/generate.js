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
const LMS_PROMPT_TEMPLATE = `أنت مساعد تعليمي خبير متخصص في تصميم المحتوى التدريبي الأكاديمي والمهني للغة الإنجليزية الفنية والمصطلحات التخصصية.

قم بتحليل المحتوى التعليمي المرفق وتوليد بيانات مُهيكلة بصيغة JSON باللغتين العربية والإنجليزية.
يجب أن يملأ الناتج المكونات الأربعة الكاملة للوحدة الدراسية الأسبوعية في منصة LMS.

{CONTENT_BLOCK}

## تعليمات الإنتاج الصارمة:
1. استنتج 3 فيديوهات تعليمية مرئية مقترحة ذات صلة مباشرة بمحتوى الدرس لاختيار المتدرب أو المدرب منها (مع عنوان ووصف ومدة ورابط بحث يوتيوب مقترح).
2. استنتج الملخص الأكاديمي الشامل والمحاور/المواضيع الأساسية للوحدة التدريبية (3 إلى 5 محاور أساسية).
3. أنشئ قاموس مصطلحات يحتوي من 5 إلى 8 مصطلحات إنجليزية-عربية تخصصية مستخرجة من المحتوى مع تعريف علمي مختصر وسياق عملي.
4. أنشئ واجباً تطبيقياً متكاملاً يتضمن نمطين:
   - أسئلة اختيار من متعدد (MCQ) تطبيقية (من 3 إلى 5 أسئلة).
   - أسئلة مقالية / كتابة نصية (Text Essay) تطلب من المتدرب صياغة نص أو فقرة عملية باستخدام المفاهيم والمصطلحات.
5. أنشئ اختباراً أسبوعياً تفاعلياً يتكون من 5 أسئلة اختيار من متعدد (MCQ)، 10 درجات، مدة 15 دقيقة، متنوعة الإجابات وتختبر الفهم والتطبيق.
6. أعد فقط JSON نظيف صالح للـ Parse ومطابق تماماً للبنية التالية بدون أي نص أو مقدمات أو كتل تعليق خارج الـ JSON.

## JSON Schema المطلوبة (أعد هذه البنية بالضبط):
{
  "suggested_videos": [
    {
      "id": 1,
      "title": "عنوان مقترح للفيديو التدريبي الأول (باللغة الإنجليزية أو العربية)",
      "description": "شرح موجز لمحتوى الفيديو والمهارة العملية التي يشرحها",
      "duration": "10-15 دقيقة",
      "search_query": "Industrial safety procedures practical guide",
      "youtube_url": "https://www.youtube.com/results?search_query=industrial+safety"
    },
    {
      "id": 2,
      "title": "عنوان مقترح للفيديو التدريبي الثاني",
      "description": "شرح تفصيلي للمفاهيم الأساسية والتطبيق المهني في بيئة العمل",
      "duration": "8-12 دقيقة",
      "search_query": "Technical english terminology tutorial",
      "youtube_url": "https://www.youtube.com/results?search_query=technical+terms"
    },
    {
      "id": 3,
      "title": "عنوان مقترح للفيديو التدريبي الثالث",
      "description": "فيديو إثرائي مكمل للموضوع مع أمثلة واقعية",
      "duration": "12-18 دقيقة",
      "search_query": "Standard operating procedures workplace",
      "youtube_url": "https://www.youtube.com/results?search_query=operating+procedures"
    }
  ],
  "lecture": {
    "title": "عنوان المحاضرة المشتق من الملف",
    "duration_minutes": 15,
    "summary": "ملخص شامل ومكثف لمحتوى المحاضرة والنقاط الأساسية (لا يقل عن 80 كلمة بالعربية الفصحى)",
    "topics": [
      "المحور الأول: مقدمة وأسس المفهوم التدريبي",
      "المحور الثاني: الإجراءات والمعايير المهنية المعتمدة",
      "المحور الثالث: التطبيق العملي والسلامة في بيئة العمل"
    ]
  },
  "glossary_notes": {
    "title": "قاموس ومذكرات مصطلحات الأسبوع",
    "description": "قاموس مصطلحات فنية ومهنية إنجليزية مترجمة للعربية وموضحة وفق المنهج التدريبي",
    "terms": [
      {"en": "Term 1", "ar": "المصطلح بالعربية", "definition": "شرح مختصر للمصطلح وسياق استخدامه في بيئة العمل"},
      {"en": "Term 2", "ar": "المصطلح بالعربية", "definition": "شرح مختصر للمصطلح وسياق استخدامه في بيئة العمل"}
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
        "prompt": "اكتب فقرة باللغة الإنجليزية التقنية لا تقل عن 50 كلمة توضح فيها كيفية تطبيق إجراءات السلامة المذكورة في المحاضرة.",
        "guidelines": "استخدم على الأقل 3 من المصطلحات الفنية المكتسبة في سياق مهني صحيح.",
        "model_answer": "نموذج إجابة استرشادي يوضح للمدرب المعايير المقبولة للتقييم."
      }
    ],
    "questions": [
      {
        "question": "سؤال تطبيقي من متعدد يطلب تطبيق المصطلحات في مواقف عمل واقعية",
        "options": ["الخيار أ", "الخيار ب", "الخيار ج", "الخيار د"],
        "correct_answer": "الخيار أ"
      }
    ]
  },
  "quiz": {
    "title": "اختبار الأسبوع الأكاديمي",
    "duration_minutes": 15,
    "total_grade": 10,
    "questions": [
      {
        "type": "mcq",
        "question": "نص السؤال بالإنجليزية أو العربية يختبر مفهوماً تم شرحه",
        "options": ["الخيار أ", "الخيار ب", "الخيار ج", "الخيار د"],
        "correct_answer": "الخيار أ"
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
function extractTextFromPdfBuffer(buffer) {
  try {
    const raw = buffer.toString('latin1');
    const streamRegex = /stream[\r\n]+([\s\S]*?)[\r\n]+endstream/g;
    let match;
    const extractedBlocks = [];

    while ((match = streamRegex.exec(raw)) !== null) {
      try {
        const streamData = Buffer.from(match[1], 'latin1');
        const inflated = zlib.inflateSync(streamData).toString('utf8');
        
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

  // Fallback to printable text extraction
  return extractPrintableStrings(buffer);
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

  const suggestedVideos = [
    {
      id: 1,
      title: `شرح تطبيقي لـ ${title} وأهم المصطلحات المهنية`,
      description: `فيديو تدريبي تفاعلي يركز على شرح ${extractedTerms[0].en} و ${extractedTerms[1]?.en || 'المفاهيم'} وتطبيقها المباشر في الورش والمختبرات.`,
      duration: '12:30 دقيقة',
      search_query: `${title} technical training tutorial`,
      youtube_url: `https://www.youtube.com/results?search_query=${encodeURIComponent(title + ' practical training')}`
    },
    {
      id: 2,
      title: `معايير السلامة المهنية وتطبيق إجراءات التشغيل في ${title}`,
      description: `استعراض واقعي لإجراءات العمل القياسية (SOP) واشتراطات الجودة وإدارة المخاطر في بيئة العمل الصناعية.`,
      duration: '09:45 دقيقة',
      search_query: `${title} industrial safety procedure`,
      youtube_url: `https://www.youtube.com/results?search_query=${encodeURIComponent(title + ' safety procedure')}`
    },
    {
      id: 3,
      title: `دليل المصطلحات الإنجليزية التخصصية والمحادثة الفنية`,
      description: `جلسة إثرائية مساعدة على النطق الصحيح والتواصل المهني باللغة الإنجليزية التقنية مع الزملاء والمشرفين.`,
      duration: '15:00 دقيقة',
      search_query: `${title} technical english glossary`,
      youtube_url: `https://www.youtube.com/results?search_query=${encodeURIComponent(title + ' technical english')}`
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
      questions: [
        {
          type: 'mcq',
          question: `What is the primary definition of '${extractedTerms[0].en}' according to the technical lecture?`,
          options: [
            extractedTerms[0].definition.slice(0, 65),
            'An unrelated manual hand tool used in carpentry',
            'A temporary administrative financial report',
            'None of the above'
          ],
          correct_answer: extractedTerms[0].definition.slice(0, 65)
        },
        {
          type: 'mcq',
          question: `ما هو المقابل الدقيق للمصطلح المهني '${extractedTerms[Math.min(1, extractedTerms.length - 1)].en}'؟`,
          options: [
            extractedTerms[Math.min(1, extractedTerms.length - 1)].ar,
            'أداة تشغيل عامة',
            'مستند محاسبي دوري',
            'إجراء صيانة طارئة غير مخطط له'
          ],
          correct_answer: extractedTerms[Math.min(1, extractedTerms.length - 1)].ar
        },
        {
          type: 'mcq',
          question: `Which term best describes: '${extractedTerms[Math.min(2, extractedTerms.length - 1)].definition.slice(0, 70)}'?`,
          options: [
            extractedTerms[Math.min(2, extractedTerms.length - 1)].en,
            'General Hardware Tool',
            'Draft Blueprint Specification',
            'Hazard Warning Sign'
          ],
          correct_answer: extractedTerms[Math.min(2, extractedTerms.length - 1)].en
        },
        {
          type: 'mcq',
          question: 'ما الغرض الرئيسي من دراسة واستخدام المصطلحات الفنية باللغة الإنجليزية في بيئة العمل الصناعية؟',
          options: [
            'التواصل الدقيق وفهم كتيبات التشغيل ومعايير السلامة العالمية',
            'إلغاء استخدام اللغة العربية في المحادثات اليومية بين الزملاء',
            'حفظ الكلمات دون تطبيقها في الورش والمختبرات العملية',
            'إجراء اختبارات نظرية فقط دون أهمية في الميدان'
          ],
          correct_answer: 'التواصل الدقيق وفهم كتيبات التشغيل ومعايير السلامة العالمية'
        },
        {
          type: 'mcq',
          question: `True or False: Technical terminology in '${title}' requires adherence to international industrial safety standards.`,
          options: [
            'True (صواب - إلزامي في المعايير الصناعية الدولية)',
            'False (خطأ - غير مطلوب في بيئة العمل)',
            'Optional only in administrative offices',
            'Only applies to top management'
          ],
          correct_answer: 'True (صواب - إلزامي في المعايير الصناعية الدولية)'
        }
      ]
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
      ]
    }
  };
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
    return res.status(200).json({
      status: 'ready',
      service: 'BGTI LMS AI Auto-Generation API (Vercel Serverless)',
      endpoints: {
        generate: 'POST /api/generate'
      },
      hasGeminiApiKey: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'YOUR_GEMINI_API_KEY_HERE')
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed. Use POST.' });
  }

  const startTime = Date.now();

  try {
    const { filename, fileType, base64, courseName, weekTitle, weekTopic } = req.body || {};

    if (!base64) {
      return res.status(400).json({
        success: false,
        error: 'لم يتم استلام محتوى الملف (Base64). يرجى التأكد من اختيار ملف PPTX أو PDF.'
      });
    }

    const safeFilename = filename || 'uploaded_document';
    const isPdf = safeFilename.toLowerCase().endsWith('.pdf') || (fileType && fileType.includes('pdf'));
    const isPptx = safeFilename.toLowerCase().endsWith('.pptx') || (fileType && (fileType.includes('presentation') || fileType.includes('powerpoint')));

    if (!isPdf && !isPptx) {
      return res.status(400).json({
        success: false,
        error: 'صيغة الملف غير مدعومة. يرجى رفع ملف PowerPoint (.pptx) أو PDF (.pdf).'
      });
    }

    // Convert Base64 string to Buffer
    const fileBuffer = Buffer.from(base64, 'base64');
    const fileSizeKB = Math.round(fileBuffer.length / 1024);

    // ─── Automatic Supabase Cloud Storage Upload (Bucket: 'lms-files') ──────
    let cloudFileUrl = '';
    const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '').trim().replace(/\/+$/, '');
    const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '').trim();

    if (supabaseUrl && supabaseKey) {
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
    if (isPptx) {
      extractedText = extractTextFromPptxBuffer(fileBuffer);
    } else {
      extractedText = extractTextFromPdfBuffer(fileBuffer);
    }

    const textLength = extractedText ? extractedText.length : 0;
    const apiKey = process.env.GEMINI_API_KEY;
    const hasValidKey = apiKey && apiKey !== 'YOUR_GEMINI_API_KEY_HERE' && apiKey.trim().length > 15;

    let generatedData = null;
    let modeUsed = 'demo_fallback';

    // ─── Call Gemini API if Key is Available ─────────────────────────────────
    if (hasValidKey) {
      try {
        const modelName = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey.trim()}`;

        // Build context block
        let contextBlock = `## بيانات الكورس والأسبوع:\n`;
        if (courseName) contextBlock += `- اسم الكورس التدريبي: ${courseName}\n`;
        if (weekTitle) contextBlock += `- الأسبوع: ${weekTitle}\n`;
        if (weekTopic) contextBlock += `- موضوع الوحدة: ${weekTopic}\n`;

        const parts = [];

        // For PDF: Gemini natively ingests PDF as inlineData with 100% multimodal accuracy!
        if (isPdf) {
          parts.push({
            inlineData: {
              mimeType: 'application/pdf',
              data: base64
            }
          });
          parts.push({
            text: LMS_PROMPT_TEMPLATE.replace('{CONTENT_BLOCK}', `${contextBlock}\n## المحتوى المُستخرج: (راجع وثيقة الـ PDF المرفقة أعلاه بالكامل)`)
          });
        } else {
          // For PPTX: provide extracted slide texts
          const trimmedText = extractedText.length > 15000
            ? extractedText.slice(0, 15000) + '\n\n[... تم اقتصاص بقية النص لتفادي تجاوز الحدود ...]'
            : extractedText;

          const contentSection = `${contextBlock}\n## المحتوى المُستخرج من شرائح العرض (${safeFilename}):\n---\n${trimmedText}\n---`;
          parts.push({
            text: LMS_PROMPT_TEMPLATE.replace('{CONTENT_BLOCK}', contentSection)
          });
        }

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
          console.error(`Gemini API error (Status ${geminiRes.status}):`, errBody);
          // Fall back gracefully rather than throwing 500
          modeUsed = 'demo_fallback_after_gemini_error';
        } else {
          const geminiJson = await geminiRes.json();
          const candidate = geminiJson.candidates?.[0]?.content?.parts?.[0]?.text;
          if (candidate) {
            // Strip any unexpected markdown code fences
            const cleanJsonStr = candidate
              .replace(/^```(?:json)?\s*/i, '')
              .replace(/\s*```$/i, '')
              .trim();

            generatedData = JSON.parse(cleanJsonStr);
            modeUsed = 'gemini';
          }
        }
      } catch (geminiError) {
        console.error('Gemini execution error, falling back:', geminiError);
        modeUsed = 'demo_fallback_after_gemini_exception';
      }
    }

    // ─── Smart Fallback if Gemini not used or failed ──────────────────────────
    if (!generatedData) {
      generatedData = buildDemoContentFromText(extractedText, safeFilename);
    }

    const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);

    return res.status(200).json({
      success: true,
      mode: modeUsed,
      filename: safeFilename,
      fileSizeKB,
      file_url: cloudFileUrl || '',
      text_length: textLength,
      processing_time_seconds: parseFloat(durationSec),
      data: generatedData
    });

  } catch (err) {
    console.error('api/generate handler fatal error:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'حدث خطأ داخلي أثناء معالجة الملف وتوليد المحتوى.'
    });
  }
}
