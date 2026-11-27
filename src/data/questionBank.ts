import { APP_VERSION } from '../lib/updater';

export interface BCSQuestionRecord {
  id: number;
  bcsBatch: string;
  rawEdition: string;
  questionNumber: number | null;
  pageNumber: number | null;
  subject: string;
  subjectBn: string;
  officialSubject: string;
  topicId: string;
  syllabusTopic: string;
  syllabusSubtopic: string;
  isExtraTopic: boolean;
  questionType: string;
  bpscTrendTag: string;
  sameTypeCount: number;
  fitReason: string;
  question: string;
  options: string[];
  correctIndex: number | null;
  correctAnswerRaw: string | null;
  explanation: string;
  image: string | null;
}

interface CompactCatalogEntry {
  serial: number;
  s: string;
  sBn: string;
  os: string;
  t: string;
  st: string;
}

interface CompactQuestionRow {
  id: number;
  b: string;
  ed: string;
  qn: number | null;
  pg: number | null;
  tid: string;
  q: string;
  o: string[];
  ci: number | null;
  ca: string | null;
  ex: string;
  qt: string;
  tr: string;
  tc: number;
  fr: string;
  im?: string;
  s?: string;
  sBn?: string;
  os?: string;
  t?: string;
  st?: string;
}

interface CompactBankPayload {
  version: 2;
  total: number;
  catalog: Record<string, CompactCatalogEntry>;
  questions: CompactQuestionRow[];
}

let cachedPromise: Promise<BCSQuestionRecord[]> | null = null;
let cachedData: BCSQuestionRecord[] | null = null;

function resolveAssetUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `./${cleanPath}`;
}

// One cache per release, so a re-deployed question bank is never served stale.
const DB_CACHE_NAME = `bbbokz-db-${APP_VERSION}`;
if (typeof caches !== 'undefined') {
  void caches
    .keys()
    .then((keys) =>
      Promise.all(
        keys
          .filter((k) => (k.startsWith('bbbokz-db-') || k.startsWith('bcs-monster-db-')) && k !== DB_CACHE_NAME)
          .map((k) => caches.delete(k))
      )
    )
    .catch(() => undefined);
}

function hydrateBank(raw: CompactBankPayload | BCSQuestionRecord[]): BCSQuestionRecord[] {
  if (Array.isArray(raw)) {
    return raw.map((r) => ({
      ...r,
      officialSubject: r.officialSubject || r.subject,
      topicId: r.topicId || 'EXTRA',
      syllabusTopic: r.syllabusTopic || r.subjectBn || r.subject,
      syllabusSubtopic: r.syllabusSubtopic || r.subjectBn || r.subject,
      isExtraTopic: Boolean(r.isExtraTopic),
      questionType: r.questionType || 'Standard MCQ',
      bpscTrendTag: r.bpscTrendTag || 'General BCS Pattern',
      sameTypeCount: r.sameTypeCount || 1,
      fitReason: r.fitReason || '',
      image: r.image ? resolveAssetUrl(r.image) : null
    }));
  }

  const catalog = raw.catalog || {};
  return raw.questions.map((row) => {
    const cat = row.tid !== 'EXTRA' ? catalog[row.tid] : undefined;
    const isExtra = !cat;
    return {
      id: row.id,
      bcsBatch: row.b,
      rawEdition: row.ed,
      questionNumber: row.qn,
      pageNumber: row.pg,
      subject: cat ? cat.s : row.s || 'Special Cadre (Medical/Dental)',
      subjectBn: cat ? cat.sBn : row.sBn || 'স্পেশাল ক্যাডার (মেডিকেল/ডেন্টাল)',
      officialSubject: cat ? cat.os : row.os || 'Professional / Special Cadre (Medical/Dental)',
      topicId: cat ? row.tid : 'EXTRA',
      syllabusTopic: cat ? cat.t : row.t || '[Extra Topic]',
      syllabusSubtopic: cat ? cat.st : row.st || row.t || '[Extra Topic]',
      isExtraTopic: isExtra,
      questionType: row.qt || 'Standard MCQ',
      bpscTrendTag: row.tr || 'General BCS Pattern',
      sameTypeCount: row.tc || 1,
      fitReason: row.fr || '',
      question: row.q,
      options: row.o,
      correctIndex: row.ci,
      correctAnswerRaw: row.ca,
      explanation: row.ex,
      image: row.im ? resolveAssetUrl(row.im) : null
    };
  });
}

/**
 * Lazily fetches and caches the 5,655-question classified BCS Preliminary database (10th–50th BCS).
 * Uses both in-memory promise caching and the browser Cache API so repeat
 * visits load from disk in milliseconds instead of re-downloading ~1.16 MB gzipped.
 */
export function loadBCSQuestionBank(): Promise<BCSQuestionRecord[]> {
  if (cachedData) {
    return Promise.resolve(cachedData);
  }
  if (!cachedPromise) {
    const url = resolveAssetUrl('data/bcs_questions.json');
    cachedPromise = (async () => {
      let response: Response | undefined;
      if (typeof caches !== 'undefined') {
        try {
          const cache = await caches.open(DB_CACHE_NAME);
          response = await cache.match(url);
          if (!response) {
            const netRes = await fetch(url);
            if (!netRes.ok) {
              throw new Error(`Failed to load BCS database (${netRes.status})`);
            }
            await cache.put(url, netRes.clone());
            response = netRes;
          }
        } catch {
          response = undefined;
        }
      }
      if (!response) {
        response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to load BCS database (${response.status})`);
        }
      }
      const raw = (await response.json()) as CompactBankPayload | BCSQuestionRecord[];
      cachedData = hydrateBank(raw);
      return cachedData;
    })().catch((err) => {
      cachedPromise = null;
      throw err;
    });
  }
  return cachedPromise;
}

export function prefetchBCSQuestionBank(): void {
  void loadBCSQuestionBank().catch(() => {
    // Ignore background prefetch failures
  });
}

/**
 * Builds a 200-question BCS Preliminary mock exam set from verified 4-option official-syllabus MCQs.
 */
export function build200MockSet(
  records: BCSQuestionRecord[],
  count = 200
): BCSQuestionRecord[] {
  const isPlayable = (q: BCSQuestionRecord) =>
    q.options.length === 4 &&
    q.correctIndex !== null &&
    q.correctIndex >= 0 &&
    q.correctIndex < 4 &&
    q.question.trim().length > 0;

  const officialEligible = records.filter((q) => !q.isExtraTopic && isPlayable(q));
  const pool =
    officialEligible.length >= count
      ? [...officialEligible]
      : records.filter(isPlayable);

  // Fisher-Yates shuffle on a copy
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  return pool.slice(0, Math.min(count, pool.length));
}
