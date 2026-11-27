import { APP_VERSION } from '../lib/updater';

export interface SyllabusSectionDef {
  section: string;
  marks: number;
  topics: string[];
}

export interface SyllabusSubjectDef {
  serial: number;
  name_bn: string;
  name_en: string;
  total_marks: number;
  sections: SyllabusSectionDef[];
}

export interface BCSSyllabusDocument {
  title: string;
  total_marks: number;
  subjects: SyllabusSubjectDef[];
}

export interface SubjectVisualTheme {
  serial: number;
  subjectKey: string;
  shortEn: string;
  nameBn: string;
  marks: number;
  gradient: string;
  badgeBg: string;
  ring: string;
  barGradient: string;
}

/**
 * Official 10 BCS Preliminary Subjects (200 total marks) + Special Cadre fallback.
 * Keys match `BCSQuestionRecord.subject` from `src/data/questionBank.ts`.
 */
export const OFFICIAL_SUBJECT_THEMES: Record<string, SubjectVisualTheme> = {
  'Bangla Language & Literature': {
    serial: 1,
    subjectKey: 'Bangla Language & Literature',
    shortEn: 'Bangla',
    nameBn: 'বাংলা ভাষা ও সাহিত্য',
    marks: 30,
    gradient: 'from-rose-500 to-pink-600',
    badgeBg: 'bg-rose-500/15 border-rose-400/40 text-rose-800 dark:text-rose-200',
    ring: 'hover:border-rose-400/70',
    barGradient: 'from-rose-500 to-pink-500'
  },
  'English Language & Literature': {
    serial: 2,
    subjectKey: 'English Language & Literature',
    shortEn: 'English',
    nameBn: 'ইংরেজি ভাষা ও সাহিত্য',
    marks: 30,
    gradient: 'from-indigo-500 to-blue-600',
    badgeBg: 'bg-indigo-500/15 border-indigo-400/40 text-indigo-800 dark:text-indigo-200',
    ring: 'hover:border-indigo-400/70',
    barGradient: 'from-indigo-500 to-blue-500'
  },
  'Bangladesh Affairs': {
    serial: 3,
    subjectKey: 'Bangladesh Affairs',
    shortEn: 'Bangladesh Affairs',
    nameBn: 'বাংলাদেশ বিষয়াবলি',
    marks: 25,
    gradient: 'from-emerald-500 to-teal-600',
    badgeBg: 'bg-emerald-500/15 border-emerald-400/40 text-emerald-800 dark:text-emerald-200',
    ring: 'hover:border-emerald-400/70',
    barGradient: 'from-emerald-500 to-teal-500'
  },
  'International Affairs': {
    serial: 4,
    subjectKey: 'International Affairs',
    shortEn: 'International Affairs',
    nameBn: 'আন্তর্জাতিক বিষয়াবলি',
    marks: 25,
    gradient: 'from-sky-500 to-cyan-600',
    badgeBg: 'bg-sky-500/15 border-sky-400/40 text-sky-800 dark:text-sky-200',
    ring: 'hover:border-sky-400/70',
    barGradient: 'from-sky-500 to-cyan-500'
  },
  'Geography, Environment & Disaster Management': {
    serial: 5,
    subjectKey: 'Geography, Environment & Disaster Management',
    shortEn: 'Geography & Env.',
    nameBn: 'ভূগোল, পরিবেশ ও দুর্যোগ ব্যবস্থাপনা',
    marks: 10,
    gradient: 'from-lime-500 to-emerald-600',
    badgeBg: 'bg-lime-500/15 border-lime-400/40 text-lime-800 dark:text-lime-200',
    ring: 'hover:border-lime-400/70',
    barGradient: 'from-lime-500 to-emerald-500'
  },
  'General Science': {
    serial: 6,
    subjectKey: 'General Science',
    shortEn: 'General Science',
    nameBn: 'সাধারণ বিজ্ঞান',
    marks: 15,
    gradient: 'from-cyan-500 to-blue-600',
    badgeBg: 'bg-cyan-500/15 border-cyan-400/40 text-cyan-800 dark:text-cyan-200',
    ring: 'hover:border-cyan-400/70',
    barGradient: 'from-cyan-500 to-blue-500'
  },
  'Computer & Information Technology': {
    serial: 7,
    subjectKey: 'Computer & Information Technology',
    shortEn: 'Computer & ICT',
    nameBn: 'কম্পিউটার ও তথ্য প্রযুক্তি',
    marks: 15,
    gradient: 'from-violet-500 to-purple-600',
    badgeBg: 'bg-violet-500/15 border-violet-400/40 text-violet-800 dark:text-violet-200',
    ring: 'hover:border-violet-400/70',
    barGradient: 'from-violet-500 to-purple-500'
  },
  'Mathematical Reasoning': {
    serial: 8,
    subjectKey: 'Mathematical Reasoning',
    shortEn: 'Math Reasoning',
    nameBn: 'গাণিতিক যুক্তি',
    marks: 20,
    gradient: 'from-amber-500 to-orange-600',
    badgeBg: 'bg-amber-500/15 border-amber-400/40 text-amber-800 dark:text-amber-200',
    ring: 'hover:border-amber-400/70',
    barGradient: 'from-amber-500 to-orange-500'
  },
  'Mental Ability': {
    serial: 9,
    subjectKey: 'Mental Ability',
    shortEn: 'Mental Ability',
    nameBn: 'মানসিক দক্ষতা',
    marks: 15,
    gradient: 'from-fuchsia-500 to-purple-600',
    badgeBg: 'bg-fuchsia-500/15 border-fuchsia-400/40 text-fuchsia-800 dark:text-fuchsia-200',
    ring: 'hover:border-fuchsia-400/70',
    barGradient: 'from-fuchsia-500 to-purple-500'
  },
  'Ethics, Values & Good Governance': {
    serial: 10,
    subjectKey: 'Ethics, Values & Good Governance',
    shortEn: 'Ethics & Governance',
    nameBn: 'নৈতিকতা, মূল্যবোধ ও সু-শাসন',
    marks: 15,
    gradient: 'from-teal-500 to-indigo-600',
    badgeBg: 'bg-teal-500/15 border-teal-400/40 text-teal-800 dark:text-teal-200',
    ring: 'hover:border-teal-400/70',
    barGradient: 'from-teal-500 to-indigo-500'
  },
  'Special Cadre (Medical/Dental)': {
    serial: 11,
    subjectKey: 'Special Cadre (Medical/Dental)',
    shortEn: 'Special Cadre',
    nameBn: 'স্পেশাল ক্যাডার (মেডিকেল/ডেন্টাল)',
    marks: 0,
    gradient: 'from-orange-500 to-rose-600',
    badgeBg: 'bg-orange-500/15 border-orange-400/40 text-orange-800 dark:text-orange-200',
    ring: 'hover:border-orange-400/70',
    barGradient: 'from-orange-500 to-rose-500'
  }
};

export function getSubjectTheme(subject: string): SubjectVisualTheme {
  return (
    OFFICIAL_SUBJECT_THEMES[subject] ?? {
      serial: 99,
      subjectKey: subject,
      shortEn: subject,
      nameBn: subject,
      marks: 0,
      gradient: 'from-slate-500 to-indigo-600',
      badgeBg: 'bg-slate-500/15 border-slate-400/40 text-slate-800 dark:text-slate-200',
      ring: 'hover:border-indigo-400/70',
      barGradient: 'from-slate-500 to-indigo-500'
    }
  );
}

/** Official marks map by section title for quick lookup in Topic Master. */
let cachedSyllabus: BCSSyllabusDocument | null = null;
let syllabusPromise: Promise<BCSSyllabusDocument> | null = null;

export function loadBCSSyllabus(): Promise<BCSSyllabusDocument> {
  if (cachedSyllabus) return Promise.resolve(cachedSyllabus);
  if (!syllabusPromise) {
    syllabusPromise = fetch(`./data/bcs_syllabus.json?v=${encodeURIComponent(APP_VERSION)}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load syllabus (${res.status})`);
        return res.json() as Promise<BCSSyllabusDocument>;
      })
      .then((doc) => {
        cachedSyllabus = doc;
        return doc;
      })
      .catch((err) => {
        syllabusPromise = null;
        throw err;
      });
  }
  return syllabusPromise;
}

/* --------------------------------------------------------------------------
 * Persistent local practice mastery tracking (shared by Question Bank & Topic Master)
 * Stores questionId -> 1 (correct) | 0 (attempted/wrong)
 * -------------------------------------------------------------------------- */
const MASTERY_STORAGE_KEY = 'bbbokz-mastery-v1';

export type MasteryMap = Record<number, 0 | 1>;

export function readMasteryMap(): MasteryMap {
  try {
    const raw = localStorage.getItem(MASTERY_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as MasteryMap) : {};
  } catch {
    return {};
  }
}

export function saveMasteryAnswer(questionId: number, isCorrect: boolean): MasteryMap {
  const current = readMasteryMap();
  current[questionId] = isCorrect ? 1 : 0;
  try {
    localStorage.setItem(MASTERY_STORAGE_KEY, JSON.stringify(current));
  } catch {
    /* storage full or private mode */
  }
  return current;
}

/* --------------------------------------------------------------------------
 * Lightweight cross-screen navigation intent (e.g. click a topic chip in
 * Question Bank to open that exact topic inside Topic Master)
 * -------------------------------------------------------------------------- */
export interface TopicMasterIntent {
  tab?: 'priority' | 'syllabus' | 'trends' | 'extra';
  subject?: string;
  topic?: string;
  subtopic?: string;
  trend?: string;
}

let pendingTopicIntent: TopicMasterIntent | null = null;

export function setTopicMasterIntent(intent: TopicMasterIntent | null): void {
  pendingTopicIntent = intent;
}

export function consumeTopicMasterIntent(): TopicMasterIntent | null {
  const value = pendingTopicIntent;
  pendingTopicIntent = null;
  return value;
}
