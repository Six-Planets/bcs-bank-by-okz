import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { recordAttempt } from '../../lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  XCircle,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Trophy,
  AlertTriangle,
  BookOpen,
  Calendar,
  Hash,
  Layers,
  Grid,
  Eye,
  EyeOff,
  Award,
  Eraser,
  Database
} from 'lucide-react';
import {
  BCSQuestionRecord,
  build200MockSet,
  loadBCSQuestionBank
} from '../../data/questionBank';

export interface MockQuestion {
  id: number;
  bcsBatch: string;
  examYear?: string;
  subject: string;
  subjectBn: string;
  topic?: string;
  question: string;
  options: [string, string, string, string];
  correctIndex: number;
  explanation: string;
  image?: string | null;
}

/**
 * Official BCS Preliminary Examination Format Constants
 * - 200 MCQs
 * - 200 Total Marks
 * - 2 Hours (120 Minutes = 7,200 Seconds)
 * - +1.00 for each correct answer
 * - -0.50 for each incorrect answer
 * -  0.00 for unanswered questions
 */
export const BCS_PRELIM_TOTAL_QUESTIONS = 200;
export const BCS_PRELIM_TOTAL_MARKS = 200;
export const BCS_PRELIM_DURATION_SECONDS = 2 * 60 * 60;
export const MARK_PER_CORRECT = 1.0;
export const PENALTY_PER_WRONG = 0.5;

export const MOCK_QUESTIONS: MockQuestion[] = [
  {
    id: 1,
    bcsBatch: '44th BCS',
    examYear: '2022',
    subject: 'Bangladesh Affairs',
    subjectBn: 'বাংলাদেশ বিষয়াবলি',
    topic: 'বাংলাদেশের সংবিধান',
    question:
      'গণপ্রজাতন্ত্রী বাংলাদেশের সংবিধানের কোন অনুচ্ছেদে ‘আইনের দৃষ্টিতে সমতা’র কথা বলা হয়েছে?',
    options: ['অনুচ্ছেদ ২৬', 'অনুচ্ছেদ ২৭', 'অনুচ্ছেদ ২৮', 'অনুচ্ছেদ ২৯'],
    correctIndex: 1,
    explanation:
      'সঠিক উত্তর: অনুচ্ছেদ ২৭। সংবিধানের ২৭ নং অনুচ্ছেদে বলা হয়েছে: “সকল নাগরিক আইনের দৃষ্টিতে সমান এবং আইনের সমান আশ্রয় লাভের অধিকারী।”'
  },
  {
    id: 2,
    bcsBatch: '45th BCS',
    examYear: '2023',
    subject: 'Bangla Literature',
    subjectBn: 'বাংলা সাহিত্য',
    topic: 'আধুনিক যুগ (কাজী নজরুল ইসলাম)',
    question: '‘বিদ্রোহী’ কবিতাটি কাজী নজরুল ইসলামের কোন কাব্যগ্রন্থের অন্তর্গত?',
    options: ['অগ্নিবীণা', 'বিষের বাঁশি', 'সর্বহারা', 'ভাঙার গান'],
    correctIndex: 0,
    explanation:
      'সঠিক উত্তর: অগ্নিবীণা। ১৯২২ সালে প্রকাশিত কাজী নজরুল ইসলামের প্রথম কাব্যগ্রন্থ ‘অগ্নিবীণা’-র দ্বিতীয় কবিতা ‘বিদ্রোহী’।'
  },
  {
    id: 3,
    bcsBatch: '45th BCS',
    examYear: '2023',
    subject: 'English Literature',
    subjectBn: 'ইংরেজি সাহিত্য',
    topic: 'Renaissance & Jacobean Drama',
    question: "Who is the author of the famous play 'Measure for Measure'?",
    options: ['Christopher Marlowe', 'William Shakespeare', 'Ben Jonson', 'John Webster'],
    correctIndex: 1,
    explanation:
      "সঠিক উত্তর: William Shakespeare। 'Measure for Measure' উইলিয়াম শেক্সপিয়ারের একটি বিখ্যাত ট্র্যাজিকমেডি/ডার্ক কমেডি নাটক (১৬০৩–১৬০৪)।"
  },
  {
    id: 4,
    bcsBatch: '44th BCS',
    examYear: '2022',
    subject: 'Mathematical Reasoning',
    subjectBn: 'গাণিতিক যুক্তি',
    topic: 'বাস্তব সংখ্যা ও অসমতা',
    question: 'বাস্তব সংখ্যায় |3x - 2| < 1 অসমতাটির সমাধান কোনটি?',
    options: ['1/3 < x < 1', '-1/3 < x < 1', '1/3 < x < 2', '0 < x < 1'],
    correctIndex: 0,
    explanation:
      'সঠিক উত্তর: 1/3 < x < 1। কারণ -1 < 3x - 2 < 1 ⇒ 1 < 3x < 3 ⇒ 1/3 < x < 1।'
  },
  {
    id: 5,
    bcsBatch: '43rd BCS',
    examYear: '2021',
    subject: 'Bangladesh Affairs',
    subjectBn: 'বাংলাদেশ বিষয়াবলি',
    topic: 'ছয় দফা ও স্বাধিকার আন্দোলন',
    question: 'বাঙালি জাতির মুক্তির সনদ ‘ছয় দফা’ কত সালে আনুষ্ঠানিকভাবে ঘোষণা করা হয়?',
    options: ['১৯৬৪ সালে', '১৯৬৬ সালে', '১৯৬৮ সালে', '১৯৬৯ সালে'],
    correctIndex: 1,
    explanation:
      'সঠিক উত্তর: ১৯৬৬ সালে। ১৯৬৬ সালের ৫–৬ ফেব্রুয়ারি লাহোরে অনুষ্ঠিত সম্মেলনে ঐতিহাসিক ছয় দফা দাবি পেশ করা হয়।'
  },
  {
    id: 6,
    bcsBatch: '43rd BCS',
    examYear: '2021',
    subject: 'General Science',
    subjectBn: 'সাধারণ বিজ্ঞান',
    topic: 'মানবদেহ ও রক্ত সংবহনতন্ত্র',
    question: 'মানবদেহে লোহিত রক্তকণিকার গড় আয়ুষ্কাল কত দিন?',
    options: ['৯০ দিন', '১০০ দিন', '১২০ দিন', '১৫০ দিন'],
    correctIndex: 2,
    explanation:
      'সঠিক উত্তর: ১২০ দিন। মানবদেহের লোহিত রক্তকণিকা অস্থিমজ্জায় উৎপন্ন হয় এবং এর গড় আয়ু প্রায় ১২০ দিন (৪ মাস)।'
  },
  {
    id: 7,
    bcsBatch: '41st BCS',
    examYear: '2021',
    subject: 'International Affairs',
    subjectBn: 'আন্তর্জাতিক বিষয়াবলি',
    topic: 'জাতিসংঘ ও আন্তর্জাতিক সংস্থা',
    question: 'জাতিসংঘের পরিবেশ বিষয়ক সংস্থা (UNEP)-এর সদর দপ্তর কোথায় অবস্থিত?',
    options: ['জেনেভা', 'নাইরোবি', 'ভিয়েনা', 'প্যারিস'],
    correctIndex: 1,
    explanation:
      'সঠিক উত্তর: নাইরোবি। কেনিয়ার রাজধানী নাইরোবিতে জাতিসংঘের পরিবেশ কর্মসূচি (UNEP)-এর সদর দপ্তর অবস্থিত।'
  },
  {
    id: 8,
    bcsBatch: '40th BCS',
    examYear: '2019',
    subject: 'Computer & ICT',
    subjectBn: 'কম্পিউটার ও তথ্যপ্রযুক্তি',
    topic: 'সফটওয়্যার ও অপারেটিং সিস্টেম',
    question: 'নিচের কোনটি অপারেটিং সিস্টেম নয়?',
    options: ['Linux', 'Oracle', 'Ubuntu', 'macOS'],
    correctIndex: 1,
    explanation:
      'সঠিক উত্তর: Oracle। Oracle হলো একটি রিলেশনাল ডাটাবেজ ম্যানেজমেন্ট সিস্টেম (RDBMS), এটি অপারেটিং সিস্টেম নয়।'
  },
  {
    id: 9,
    bcsBatch: '44th BCS',
    examYear: '2022',
    subject: 'Bangla Language',
    subjectBn: 'বাংলা ভাষা ও ব্যাকরণ',
    topic: 'সমার্থক শব্দ',
    question: '‘সূর্য’ শব্দের সমার্থক শব্দ নিচের কোনটি?',
    options: ['অর্ণব', 'আদিত্য', 'শশধর', 'বিধু'],
    correctIndex: 1,
    explanation:
      'সঠিক উত্তর: আদিত্য। ‘আদিত্য’ সূর্যের সমার্থক শব্দ; অন্যদিকে অর্ণব মানে সমুদ্র এবং শশধর ও বিধু মানে চাঁদ।'
  },
  {
    id: 10,
    bcsBatch: '45th BCS',
    examYear: '2023',
    subject: 'Geography & Environment',
    subjectBn: 'ভূগোল, পরিবেশ ও দুর্যোগ ব্যবস্থাপনা',
    topic: 'বাংলাদেশের ভৌগোলিক অবস্থান',
    question: 'বাংলাদেশের একমাত্র প্রবাল দ্বীপ ‘সেন্টমার্টিন’ কোন জেলায় অবস্থিত?',
    options: ['চট্টগ্রাম', 'কক্সবাজার', 'পটুয়াখালী', 'ভোলা'],
    correctIndex: 1,
    explanation:
      'সঠিক উত্তর: কক্সবাজার। সেন্টমার্টিন দ্বীপ বাংলাদেশের সর্বদক্ষিণে কক্সবাজার জেলার টেকনাফ উপজেলার অন্তর্গত।'
  }
];

const CRYSTAL_OPTION_THEMES = [
  {
    keyLabel: 'ক',
    engLabel: 'A',
    crystalClass: 'crystal-opt-violet',
    keycapGradient:
      'bg-gradient-to-br from-violet-500 via-purple-600 to-indigo-700 text-white shadow-[0_4px_10px_rgba(109,40,217,0.4),inset_0_1px_1px_rgba(255,255,255,0.6)]',
    selectedBadgeBg: 'bg-violet-600 text-white border-violet-300/60',
    glowOrb: 'from-violet-400/35 via-fuchsia-300/15 to-transparent',
    unselectedRing: 'border-violet-500/40 dark:border-violet-300/45'
  },
  {
    keyLabel: 'খ',
    engLabel: 'B',
    crystalClass: 'crystal-opt-cyan',
    keycapGradient:
      'bg-gradient-to-br from-cyan-500 via-teal-500 to-sky-700 text-white shadow-[0_4px_10px_rgba(14,116,144,0.4),inset_0_1px_1px_rgba(255,255,255,0.6)]',
    selectedBadgeBg: 'bg-cyan-600 text-white border-cyan-300/60',
    glowOrb: 'from-cyan-400/35 via-teal-300/15 to-transparent',
    unselectedRing: 'border-cyan-600/40 dark:border-cyan-300/45'
  },
  {
    keyLabel: 'গ',
    engLabel: 'C',
    crystalClass: 'crystal-opt-amber',
    keycapGradient:
      'bg-gradient-to-br from-amber-500 via-orange-500 to-red-600 text-white shadow-[0_4px_10px_rgba(180,83,9,0.4),inset_0_1px_1px_rgba(255,255,255,0.6)]',
    selectedBadgeBg: 'bg-amber-600 text-white border-amber-300/60',
    glowOrb: 'from-amber-400/35 via-orange-300/15 to-transparent',
    unselectedRing: 'border-amber-600/40 dark:border-amber-300/45'
  },
  {
    keyLabel: 'ঘ',
    engLabel: 'D',
    crystalClass: 'crystal-opt-rose',
    keycapGradient:
      'bg-gradient-to-br from-pink-500 via-rose-500 to-fuchsia-700 text-white shadow-[0_4px_10px_rgba(190,24,93,0.4),inset_0_1px_1px_rgba(255,255,255,0.6)]',
    selectedBadgeBg: 'bg-rose-600 text-white border-rose-300/60',
    glowOrb: 'from-pink-400/35 via-rose-300/15 to-transparent',
    unselectedRing: 'border-rose-600/40 dark:border-rose-300/45'
  }
] as const;

function splitTimerParts(totalSeconds: number) {
  const clamped = Math.max(0, totalSeconds);
  const hours = Math.floor(clamped / 3600);
  const minutes = Math.floor((clamped % 3600) / 60);
  const seconds = clamped % 60;
  return {
    hours: String(hours).padStart(2, '0'),
    minutes: String(minutes).padStart(2, '0'),
    seconds: String(seconds).padStart(2, '0')
  };
}

interface MockTestArenaProps {
  onBackHome: () => void;
}

export const MockTestArena: React.FC<MockTestArenaProps> = ({ onBackHome }) => {
  // Full 200-question BCS Preliminary set (starts with curated fallback, upgrades immediately from 5,655-Q DB)
  const [examQuestions, setExamQuestions] = useState<MockQuestion[]>(MOCK_QUESTIONS);
  const [allBankRecords, setAllBankRecords] = useState<BCSQuestionRecord[] | null>(null);
  // 0-indexed slot in the 200-question BCS Preliminary exam (0..199)
  const [currentSlot, setCurrentSlot] = useState(0);
  // Map of questionNumber (1..200) -> selected option index (0..3)
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);
  // Optional Instant-Check Practice toggle (OFF by default so standard exam does NOT expose answers)
  const [instantFeedbackMode, setInstantFeedbackMode] = useState(false);
  // 200-Question Matrix Drawer toggle
  const [showNavigator, setShowNavigator] = useState(false);
  const [navigatorRange, setNavigatorRange] = useState<0 | 1 | 2 | 3>(0); // 0: 1-50, 1: 51-100, 2: 101-150, 3: 151-200
  const [remainingSeconds, setRemainingSeconds] = useState(BCS_PRELIM_DURATION_SECONDS);

  // Load the 5,655-question BCS Preliminary database and populate all 200 mock slots
  useEffect(() => {
    let active = true;
    loadBCSQuestionBank()
      .then((records) => {
        if (!active) return;
        setAllBankRecords(records);
        const set200 = build200MockSet(records, BCS_PRELIM_TOTAL_QUESTIONS).map(
          (r): MockQuestion => ({
            id: r.id,
            bcsBatch: r.bcsBatch,
            subject: r.subject,
            subjectBn: r.subjectBn,
            topic: r.syllabusTopic,
            question: r.question,
            options: r.options as [string, string, string, string],
            correctIndex: r.correctIndex ?? 0,
            explanation: r.explanation,
            image: r.image
          })
        );
        if (set200.length > 0) {
          setExamQuestions(set200);
        }
      })
      .catch(() => {
        // Keep curated MOCK_QUESTIONS fallback if offline/fetch fails
      });
    return () => {
      active = false;
    };
  }, []);

  // Automatic 2-Hour BCS Preliminary countdown when the mock test is active
  useEffect(() => {
    if (isSubmitted) return;
    const interval = window.setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          window.clearInterval(interval);
          setIsSubmitted(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [isSubmitted]);

  const currentQuestionNumber = currentSlot + 1; // 1..200
  // Retrieve question from loaded 200-question BCS database
  const currentQuestion: MockQuestion | null =
    currentSlot < examQuestions.length ? examQuestions[currentSlot] : null;

  const selectedAnswer = answers[currentQuestionNumber] ?? null;
  // Reveal correct/incorrect evaluation ONLY when in Review mode (after submit) or when Instant Practice mode is explicitly enabled
  const shouldRevealEvaluation = isReviewing || instantFeedbackMode;

  const handleSelectOption = useCallback(
    (optionIdx: number) => {
      if (isSubmitted && !isReviewing) return;
      if (isReviewing) return; // Read-only during post-exam review
      setAnswers((prev) => {
        // Clicking the already-selected option in Exam Mode deselects it (allowing candidate to avoid -0.50 negative marking)
        if (!instantFeedbackMode && prev[currentQuestionNumber] === optionIdx) {
          const next = { ...prev };
          delete next[currentQuestionNumber];
          return next;
        }
        return {
          ...prev,
          [currentQuestionNumber]: optionIdx
        };
      });
    },
    [currentQuestionNumber, instantFeedbackMode, isReviewing, isSubmitted]
  );

  const handleClearSelection = useCallback(() => {
    if (isReviewing) return;
    setAnswers((prev) => {
      const next = { ...prev };
      delete next[currentQuestionNumber];
      return next;
    });
  }, [currentQuestionNumber, isReviewing]);

  const handleRestartTest = useCallback(() => {
    setAnswers({});
    setCurrentSlot(0);
    setIsSubmitted(false);
    setIsReviewing(false);
    setRemainingSeconds(BCS_PRELIM_DURATION_SECONDS);
    if (allBankRecords && allBankRecords.length > 0) {
      const freshSet = build200MockSet(allBankRecords, BCS_PRELIM_TOTAL_QUESTIONS).map(
        (r): MockQuestion => ({
          id: r.id,
          bcsBatch: r.bcsBatch,
          subject: r.subject,
          subjectBn: r.subjectBn,
          topic: r.syllabusTopic,
          question: r.question,
          options: r.options as [string, string, string, string],
          correctIndex: r.correctIndex ?? 0,
          explanation: r.explanation,
          image: r.image
        })
      );
      if (freshSet.length > 0) {
        setExamQuestions(freshSet);
      }
    }
  }, [allBankRecords]);

  // Calculate official BCS Preliminary score (+1.00 correct, -0.50 incorrect, 0 unanswered)
  const examStats = useMemo(() => {
    let correctCount = 0;
    let wrongCount = 0;

    Object.entries(answers).forEach(([qNumStr, pickedIdx]) => {
      const qIndex = Number(qNumStr) - 1;
      const qObj = examQuestions[qIndex];
      if (!qObj) return;
      if (pickedIdx === qObj.correctIndex) {
        correctCount += 1;
      } else {
        wrongCount += 1;
      }
    });

    const answeredCount = correctCount + wrongCount;
    const unansweredCount = BCS_PRELIM_TOTAL_QUESTIONS - answeredCount;
    const positiveMarks = correctCount * MARK_PER_CORRECT;
    const negativeDeduction = wrongCount * PENALTY_PER_WRONG;
    const netScore = Math.max(0, positiveMarks - negativeDeduction);

    return {
      answeredCount,
      unansweredCount,
      correctCount,
      wrongCount,
      positiveMarks,
      negativeDeduction,
      netScore
    };
  }, [answers, examQuestions]);

  // Save every finished exam to the server (queued offline, sent when back online).
  const savedRef = useRef(false);
  useEffect(() => {
    if (!isSubmitted) {
      savedRef.current = false;
      return;
    }
    if (savedRef.current || examStats.answeredCount === 0) return;
    savedRef.current = true;
    const subjects: Record<string, { correct: number; total: number }> = {};
    examQuestions.forEach((q, i) => {
      const key = q.subject || 'Other';
      const row = (subjects[key] ??= { correct: 0, total: 0 });
      row.total += 1;
      if (answers[i + 1] === q.correctIndex) row.correct += 1;
    });
    const total = Math.max(examQuestions.length, examStats.answeredCount);
    void recordAttempt({
      mode: instantFeedbackMode ? 'practice' : 'mock',
      total,
      correct: examStats.correctCount,
      wrong: examStats.wrongCount,
      skipped: Math.max(0, total - examStats.answeredCount),
      score: examStats.netScore,
      duration_sec: BCS_PRELIM_DURATION_SECONDS - remainingSeconds,
      subjects
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSubmitted]);

  const timerParts = splitTimerParts(remainingSeconds);
  const timeProgressPercent = (remainingSeconds / BCS_PRELIM_DURATION_SECONDS) * 100;
  const isLowTimeWarning = remainingSeconds <= 15 * 60 && remainingSeconds > 5 * 60;
  const isCriticalTime = remainingSeconds <= 5 * 60;

  const timeElapsedSeconds = BCS_PRELIM_DURATION_SECONDS - remainingSeconds;
  const elapsedMinutes = Math.floor(timeElapsedSeconds / 60);
  const elapsedRemSeconds = timeElapsedSeconds % 60;

  return (
    <div className="w-full max-w-5xl mx-auto px-3 sm:px-6 pt-3 sm:pt-6 pb-10 sm:pb-14 select-none">
      {/* ============================================================================
          1. TOP COMMAND BAR: Back Navigation + Exam Format Status + Crystal Chronometer
         ============================================================================ */}
      <header className="mb-3.5 sm:mb-5 flex flex-wrap items-center justify-between gap-2.5 sm:gap-4">
        {/* Left: Back to Arena + Exam Mode Indicator */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onBackHome}
            className="inline-flex items-center gap-1.5 sm:gap-2 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-2xl section-card-branding theme-text-primary font-rounded font-bold text-xs sm:text-sm hover:scale-103 active:scale-95 transition-transform cursor-pointer shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-500" />
            <span>Back to Arena</span>
          </button>

          {/* Official 200-Mark BCS Prelim Format Pill (Visible on Tablet/Desktop) */}
          <div className="hidden md:flex items-center gap-2 px-3.5 py-2 rounded-2xl crystal-meta-panel text-xs font-rounded font-bold theme-text-primary">
            <Sparkles className="w-3.5 h-3.5 text-violet-500 shrink-0" />
            <span>BCS Prelim Official Format</span>
            <span className="px-2 py-0.5 rounded-md bg-indigo-500/15 text-indigo-700 dark:text-indigo-200 text-[11px]">
              200 MCQs • 200 Marks
            </span>
          </div>
        </div>

        {/* TOP-RIGHT CORNER: Upgraded Multi-Chamber Crystal Chronometer (2-Hour Countdown) */}
        <div
          role="timer"
          aria-label="BCS Preliminary Examination Countdown Timer"
          className={`relative rounded-2xl sm:rounded-[1.35rem] px-2.5 py-1.5 sm:px-4 sm:py-2 transition-all shrink-0 overflow-hidden ${
            isCriticalTime
              ? 'bg-gradient-to-r from-rose-600 via-red-600 to-orange-600 text-white border-2 border-rose-300 shadow-[0_10px_28px_-4px_rgba(225,29,72,0.65)] animate-pulse'
              : isLowTimeWarning
              ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white border-2 border-amber-200 shadow-[0_10px_25px_-4px_rgba(245,158,11,0.55)]'
              : 'crystal-timer-shell'
          }`}
        >
          {/* Top Specular Crystal Rim */}
          <div className="pointer-events-none absolute inset-x-3 top-0.5 h-1.5 rounded-full bg-gradient-to-b from-white/70 to-transparent dark:from-white/25" />

          <div className="relative z-10 flex items-center gap-2 sm:gap-3">
            {/* Status Jewel + Label */}
            <div className="flex items-center gap-1.5">
              {isCriticalTime || isLowTimeWarning ? (
                <AlertTriangle className="w-4 h-4 text-white shrink-0" />
              ) : (
                <span className="relative flex h-2.5 w-2.5 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                </span>
              )}
              <div className="hidden sm:flex flex-col leading-tight">
                <span
                  className={`text-[9px] font-rounded font-extrabold uppercase tracking-wider ${
                    isCriticalTime || isLowTimeWarning ? 'text-white/90' : 'theme-text-muted'
                  }`}
                >
                  {isReviewing ? 'Exam Ended' : 'Time Remaining'}
                </span>
                <span
                  className={`text-[10px] font-rounded font-bold ${
                    isCriticalTime || isLowTimeWarning
                      ? 'text-white'
                      : 'text-indigo-600 dark:text-indigo-300'
                  }`}
                >
                  2 Hours (120m)
                </span>
              </div>
            </div>

            {/* 3-Chamber Crystal Digital Display: HRS : MIN : SEC */}
            <div className="flex items-center gap-1 sm:gap-1.5 font-rounded tabular-nums">
              {[
                { val: timerParts.hours, unit: 'HRS' },
                { val: timerParts.minutes, unit: 'MIN' },
                { val: timerParts.seconds, unit: 'SEC' }
              ].map((seg, i) => (
                <React.Fragment key={seg.unit}>
                  <div
                    className={`px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-lg sm:rounded-xl flex flex-col items-center justify-center min-w-[30px] sm:min-w-[38px] ${
                      isCriticalTime || isLowTimeWarning
                        ? 'bg-black/25 border border-white/30 text-white'
                        : 'crystal-timer-cell theme-text-primary'
                    }`}
                  >
                    <span className="text-xs sm:text-base font-extrabold leading-none tracking-tight">
                      {seg.val}
                    </span>
                    <span
                      className={`text-[7px] sm:text-[8px] font-bold tracking-widest mt-0.5 leading-none ${
                        isCriticalTime || isLowTimeWarning ? 'text-white/80' : 'theme-text-muted'
                      }`}
                    >
                      {seg.unit}
                    </span>
                  </div>
                  {i < 2 && (
                    <span
                      className={`font-rounded font-extrabold text-xs sm:text-sm -mt-1 ${
                        isCriticalTime || isLowTimeWarning
                          ? 'text-white'
                          : 'text-indigo-500 dark:text-indigo-300'
                      }`}
                    >
                      :
                    </span>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Bottom Micro Time-Progress Bar */}
          <div className="mt-1.5 w-full h-1 rounded-full bg-indigo-950/10 dark:bg-white/10 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isCriticalTime
                  ? 'bg-white'
                  : isLowTimeWarning
                  ? 'bg-amber-200'
                  : 'bg-gradient-to-r from-indigo-500 via-violet-500 to-emerald-400'
              }`}
              style={{ width: `${timeProgressPercent}%` }}
            />
          </div>
        </div>
      </header>

      {/* ============================================================================
          MAIN EXAM ARENA OR RESULT SUMMARY
         ============================================================================ */}
      {!isSubmitted || isReviewing ? (
        <div className="section-card-mock rounded-[1.85rem] sm:rounded-[2.5rem] p-3.5 sm:p-6 lg:p-8 space-y-3.5 sm:space-y-5 relative overflow-hidden">
          {/* Exam Progress & Controls Strip */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-1">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Review Mode Banner if Reviewing */}
              {isReviewing ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/50 text-emerald-900 dark:text-emerald-200 font-rounded font-bold text-xs">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Answer Review Mode (+1 / -0.50 Revealed)</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-400/35 text-indigo-900 dark:text-indigo-200 font-rounded font-bold text-[11px] sm:text-xs">
                  <Award className="w-3.5 h-3.5 text-indigo-500" />
                  <span>
                    Answered: {examStats.answeredCount} / {BCS_PRELIM_TOTAL_QUESTIONS}
                  </span>
                </span>
              )}

              {/* Marking Scheme Pill */}
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full theme-subcard font-rounded font-bold text-[11px] sm:text-xs theme-text-secondary">
                <span className="text-emerald-600 dark:text-emerald-400">+1.00</span>
                <span>/</span>
                <span className="text-rose-600 dark:text-rose-400">-0.50</span>
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Configurable Practice Instant-Check Toggle (Only during active test) */}
              {!isReviewing && (
                <button
                  type="button"
                  onClick={() => setInstantFeedbackMode((v) => !v)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-rounded font-bold text-[11px] sm:text-xs transition-all cursor-pointer border ${
                    instantFeedbackMode
                      ? 'bg-violet-600 text-white border-violet-400 shadow-sm'
                      : 'theme-subcard theme-text-secondary hover:border-indigo-400/50'
                  }`}
                  title="Toggle between strict Exam Mode (answers hidden until submission) and Practice Mode (instant answer check)"
                >
                  {instantFeedbackMode ? (
                    <>
                      <Eye className="w-3.5 h-3.5" />
                      <span>Practice Check: ON</span>
                    </>
                  ) : (
                    <>
                      <EyeOff className="w-3.5 h-3.5" />
                      <span>Exam Mode</span>
                    </>
                  )}
                </button>
              )}

              {/* 200-Question Matrix Navigator Toggle */}
              <button
                type="button"
                onClick={() => setShowNavigator((v) => !v)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-rounded font-bold text-[11px] sm:text-xs transition-all cursor-pointer border ${
                  showNavigator
                    ? 'bg-indigo-600 text-white border-indigo-400 shadow-sm'
                    : 'theme-subcard theme-text-primary hover:border-indigo-400/50'
                }`}
              >
                <Grid className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-300" />
                <span>200-Q Palette</span>
              </button>
            </div>
          </div>

          {/* Collapsible 200-Question Matrix Navigator */}
          <AnimatePresence>
            {showNavigator && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="p-3.5 sm:p-5 rounded-2xl crystal-meta-panel space-y-3 mb-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-rounded font-bold text-xs sm:text-sm theme-text-primary">
                        BCS 200-Question Navigator
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-400/40 text-emerald-800 dark:text-emerald-200 font-rounded font-bold text-[10px]">
                        Q 1–{examQuestions.length} Loaded from BCS Bank
                      </span>
                    </div>

                    {/* Range Tabs: 1-50, 51-100, 101-150, 151-200 */}
                    <div className="flex items-center gap-1">
                      {(['1–50', '51–100', '101–150', '151–200'] as const).map((label, rIdx) => (
                        <button
                          key={label}
                          type="button"
                          onClick={() => setNavigatorRange(rIdx as 0 | 1 | 2 | 3)}
                          className={`px-2.5 py-1 rounded-lg font-rounded font-bold text-[11px] cursor-pointer transition-all ${
                            navigatorRange === rIdx
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : 'theme-subcard theme-text-secondary'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 50-Slot Grid for the Selected Range */}
                  <div className="grid grid-cols-10 gap-1.5">
                    {Array.from({ length: 50 }, (_, i) => {
                      const slotIdx = navigatorRange * 50 + i;
                      const qNum = slotIdx + 1;
                      const isCurrent = slotIdx === currentSlot;
                      const isLoaded = slotIdx < examQuestions.length;
                      const isAnswered = answers[qNum] !== undefined;

                      return (
                        <button
                          key={qNum}
                          type="button"
                          onClick={() => {
                            setCurrentSlot(slotIdx);
                            setShowNavigator(false);
                          }}
                          className={`h-7 sm:h-8 rounded-lg font-rounded font-bold text-[11px] transition-all cursor-pointer flex items-center justify-center ${
                            isCurrent
                              ? 'bg-indigo-600 text-white ring-2 ring-indigo-300 scale-105'
                              : isAnswered
                              ? 'bg-emerald-500 text-white shadow-xs'
                              : isLoaded
                              ? 'bg-indigo-500/15 border border-indigo-400/45 theme-text-primary hover:bg-indigo-500/25'
                              : 'bg-slate-500/10 border border-slate-400/20 theme-text-muted opacity-60 hover:opacity-90'
                          }`}
                          title={
                            isLoaded
                              ? `Question ${qNum} (Loaded)`
                              : `Question ${qNum} (Unavailable in offline sample database)`
                          }
                        >
                          {qNum}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ============================================================================
              3. SEPARATE QUESTION INFORMATION SECTION (METADATA PANEL)
                 Physically separate from the question card. Never fabricates metadata.
             ============================================================================ */}
          <div
            aria-label="Question Metadata Information"
            className="crystal-meta-panel rounded-2xl px-3.5 py-2.5 sm:px-5 sm:py-3 flex flex-wrap items-center justify-between gap-2"
          >
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2.5">
              {/* Question Number out of 200 */}
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-rounded font-bold text-[11px] sm:text-xs shadow-xs">
                <Hash className="w-3 h-3 opacity-85" />
                <span>
                  Question {String(currentQuestionNumber).padStart(2, '0')} /{' '}
                  {BCS_PRELIM_TOTAL_QUESTIONS}
                </span>
              </span>

              {currentQuestion ? (
                <>
                  {/* BCS Batch & Exam Year Badge */}
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-500/15 border border-amber-500/35 text-amber-950 dark:text-amber-200 font-rounded font-bold text-[11px] sm:text-xs">
                    <Calendar className="w-3 h-3 text-amber-600 dark:text-amber-300 shrink-0" />
                    <span>{currentQuestion.bcsBatch}</span>
                    {currentQuestion.examYear && (
                      <span className="opacity-75">({currentQuestion.examYear})</span>
                    )}
                  </span>

                  {/* Subject Name Badge */}
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-cyan-500/15 border border-cyan-500/35 text-cyan-950 dark:text-cyan-200 font-rounded font-bold text-[11px] sm:text-xs">
                    <BookOpen className="w-3 h-3 text-cyan-600 dark:text-cyan-300 shrink-0" />
                    <span>{currentQuestion.subject}</span>
                    <span className="hidden sm:inline font-bangla opacity-85">
                      • {currentQuestion.subjectBn}
                    </span>
                  </span>

                  {/* Topic / Chapter Badge (Shown if available) */}
                  {currentQuestion.topic && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-fuchsia-500/12 border border-fuchsia-500/30 text-fuchsia-950 dark:text-fuchsia-200 font-bangla font-bold text-[11px] sm:text-xs">
                      <Layers className="w-3 h-3 text-fuchsia-600 dark:text-fuchsia-300 shrink-0" />
                      <span>{currentQuestion.topic}</span>
                    </span>
                  )}
                </>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-500/15 border border-slate-400/30 theme-text-secondary font-rounded font-bold text-xs">
                  <Database className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Unloaded Question Slot (#{currentQuestionNumber} of 200)</span>
                </span>
              )}
            </div>

            {/* Deselect / Clear Option Button (Available when an option is selected during exam) */}
            {selectedAnswer !== null && !isReviewing && (
              <button
                type="button"
                onClick={handleClearSelection}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-rose-500/15 border border-rose-400/40 text-rose-700 dark:text-rose-300 font-rounded font-bold text-[11px] hover:bg-rose-500/25 transition-colors cursor-pointer"
              >
                <Eraser className="w-3 h-3" />
                <span>Clear Choice</span>
              </button>
            )}
          </div>

          {/* ============================================================================
              4. DEDICATED CRYSTAL QUESTION STAGE & 4 GLOSSY CRYSTAL ANSWER CARDS
             ============================================================================ */}
          {currentQuestion ? (
            <>
              {/* DEDICATED QUESTION PRESENTATION AREA — Contains ONLY the pure question text */}
              <div
                aria-label="Question Prompt"
                className="crystal-question-stage rounded-[1.5rem] sm:rounded-[2rem] px-5 py-6 sm:px-8 sm:py-8 lg:px-10 lg:py-9 relative overflow-hidden"
              >
                {/* Prismatic Top Edge Crystal Beam */}
                <div className="pointer-events-none absolute inset-x-8 top-0 h-[3px] rounded-full bg-gradient-to-r from-transparent via-violet-400/80 to-transparent" />
                {/* Soft Ambient Crystal Refraction Orbs */}
                <div className="pointer-events-none absolute -right-12 -top-12 w-36 h-36 rounded-full bg-gradient-to-bl from-violet-400/20 via-cyan-300/15 to-transparent blur-xl" />
                <div className="pointer-events-none absolute -left-12 -bottom-12 w-36 h-36 rounded-full bg-gradient-to-tr from-pink-400/20 via-amber-300/15 to-transparent blur-xl" />

                <h1 className="relative z-10 text-lg sm:text-2xl lg:text-[26px] font-bangla font-bold theme-text-primary leading-relaxed tracking-normal">
                  {currentQuestion.question}
                </h1>
                {currentQuestion.image && (
                  <div className="relative z-10 mt-4 p-3 rounded-2xl bg-white/90 dark:bg-slate-950/75 border border-slate-300/60 dark:border-slate-700/70 inline-block max-w-full">
                    <img
                      src={currentQuestion.image}
                      alt={`Question ${currentQuestionNumber} diagram`}
                      className="max-h-56 w-auto rounded-xl object-contain"
                    />
                  </div>
                )}
              </div>

              {/* FOUR LARGE GLOSSY CRYSTAL 3D ANSWER-OPTION CARDS */}
              <div
                role="radiogroup"
                aria-label="Answer Options"
                className="grid grid-cols-2 max-[340px]:grid-cols-1 gap-3 sm:gap-4 lg:gap-5 pt-0.5"
              >
                {currentQuestion.options.map((opt, idx) => {
                  const theme = CRYSTAL_OPTION_THEMES[idx];
                  const isPicked = selectedAnswer === idx;
                  const isCorrect = idx === currentQuestion.correctIndex;

                  // Evaluation states ( ONLY revealed in Review Mode or Instant Practice Mode )
                  const showAsCorrect = shouldRevealEvaluation && isCorrect;
                  const showAsWrong = shouldRevealEvaluation && isPicked && !isCorrect;

                  let evaluationRing = '';
                  if (shouldRevealEvaluation) {
                    if (isCorrect) {
                      evaluationRing = 'ring-3 ring-emerald-500 dark:ring-emerald-400';
                    } else if (isPicked && !isCorrect) {
                      evaluationRing = 'ring-3 ring-rose-500 dark:ring-rose-400';
                    }
                  }

                  return (
                    <motion.button
                      key={`${currentQuestion.id}-opt-${idx}`}
                      type="button"
                      role="radio"
                      aria-checked={isPicked}
                      data-selected={isPicked ? 'true' : 'false'}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => handleSelectOption(idx)}
                      className={`crystal-opt-base ${theme.crystalClass} ${evaluationRing} group min-h-[104px] sm:min-h-[128px] lg:min-h-[138px] p-3.5 sm:p-5 lg:p-6 rounded-[1.4rem] sm:rounded-[1.8rem] text-left flex flex-col justify-between cursor-pointer overflow-hidden focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500`}
                    >
                      {/* Top Specular Crystal Reflection Arc */}
                      <div className="pointer-events-none absolute inset-x-4 top-1 h-2.5 rounded-full bg-gradient-to-b from-white/75 to-transparent dark:from-white/25" />

                      {/* Corner Prism Glow */}
                      <div
                        className={`pointer-events-none absolute -right-8 -top-8 w-28 h-28 rounded-full bg-gradient-to-bl ${theme.glowOrb} blur-md group-hover:scale-125 transition-transform duration-300`}
                      />

                      {/* Top Row: 3D Jewel Keycap (ক, খ, গ, ঘ) + Non-Color Selection / Evaluation Indicator */}
                      <div className="relative z-10 w-full flex items-center justify-between gap-1.5">
                        <span
                          className={`inline-flex items-center justify-center w-7 h-7 sm:w-9 sm:h-9 rounded-xl font-bangla font-extrabold text-xs sm:text-sm ${theme.keycapGradient}`}
                        >
                          {theme.keyLabel}
                        </span>

                        {/* Status Badge:
                            - In normal Exam Mode: shows Selected ("নির্বাচিত") vs Unselected circle.
                            - In Review / Practice Mode: shows Correct (+1.00) or Wrong (-0.50). */}
                        {!shouldRevealEvaluation ? (
                          isPicked ? (
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full font-bangla font-bold text-[10px] sm:text-xs border shadow-xs ${theme.selectedBadgeBg}`}
                            >
                              <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 stroke-[2.5]" />
                              <span>নির্বাচিত</span>
                            </span>
                          ) : (
                            <span
                              aria-hidden="true"
                              className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 ${theme.unselectedRing} bg-white/40 dark:bg-white/10 group-hover:scale-110 transition-transform`}
                            />
                          )
                        ) : showAsCorrect ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-emerald-500 text-white font-bangla font-bold text-[10px] sm:text-xs shadow-sm">
                            <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
                            <span>{isPicked ? 'সঠিক (+১.০০)' : 'সঠিক উত্তর'}</span>
                          </span>
                        ) : showAsWrong ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-rose-600 text-white font-bangla font-bold text-[10px] sm:text-xs shadow-sm">
                            <XCircle className="w-3.5 h-3.5 stroke-[2.5]" />
                            <span>ভুল (-০.৫০)</span>
                          </span>
                        ) : null}
                      </div>

                      {/* Option Answer Text — Large, Crisp, Balanced */}
                      <div className="relative z-10 mt-2.5 sm:mt-3.5">
                        <span className="block font-bangla font-bold text-sm sm:text-lg lg:text-xl leading-snug break-words">
                          {opt}
                        </span>
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              {/* EXPLANATION PANEL (Only shown when evaluation is revealed: Review Mode or Instant Practice Mode) */}
              <AnimatePresence mode="wait">
                {shouldRevealEvaluation && (selectedAnswer !== null || isReviewing) && (
                  <motion.div
                    key={`exp-${currentQuestion.id}`}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.2 }}
                    className={`p-4 sm:p-5 rounded-2xl border text-xs sm:text-sm font-bangla flex items-start gap-3 ${
                      selectedAnswer === currentQuestion.correctIndex
                        ? 'bg-emerald-500/15 border-emerald-400/50 theme-text-primary'
                        : 'bg-indigo-500/15 border-indigo-400/45 theme-text-primary'
                    }`}
                  >
                    <CheckCircle2
                      className={`w-5 h-5 shrink-0 mt-0.5 ${
                        selectedAnswer === currentQuestion.correctIndex
                          ? 'text-emerald-500'
                          : 'text-indigo-500'
                      }`}
                    />
                    <div className="leading-relaxed">{currentQuestion.explanation}</div>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          ) : (
            /* HONEST UNLOADED QUESTION SLOT STATE (When viewing slots 11..200 of the 200-question format) */
            <div className="crystal-question-stage rounded-[1.75rem] sm:rounded-[2rem] p-6 sm:p-10 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/15 border border-indigo-400/35 mx-auto flex items-center justify-center text-indigo-600 dark:text-indigo-300">
                <Database className="w-7 h-7" />
              </div>
              <div className="space-y-1.5 max-w-lg mx-auto">
                <h2 className="text-lg sm:text-2xl font-rounded font-bold theme-text-primary">
                  Question #{currentQuestionNumber} of {BCS_PRELIM_TOTAL_QUESTIONS} Not Loaded in
                  Offline Bank
                </h2>
                <p className="font-bangla text-xs sm:text-sm theme-text-secondary leading-relaxed">
                  পূর্ণাঙ্গ বিসিএস প্রিলিমিনারি পরীক্ষার ফরম্যাট অনুযায়ী ২০০টি প্রশ্নের কাঠামো ও নেগেটিভ মার্কিং (+১.০০ / -০.৫০) সক্রিয় রয়েছে। বর্তমান অফলাইন ডাটাবেজে প্রথম {MOCK_QUESTIONS.length}টি যাচাইকৃত বিসিএস প্রশ্ন যুক্ত আছে।
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setCurrentSlot(0)}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-rounded font-bold text-xs sm:text-sm shadow-md cursor-pointer hover:scale-103 transition-transform"
                >
                  Jump to Question 01
                </button>
                <button
                  type="button"
                  onClick={() => setShowNavigator(true)}
                  className="px-4 py-2.5 rounded-xl theme-subcard font-rounded font-bold text-xs sm:text-sm theme-text-primary cursor-pointer hover:scale-103 transition-transform"
                >
                  Open 200-Question Palette
                </button>
              </div>
            </div>
          )}

          {/* ============================================================================
              5. QUESTION NAVIGATION & SUBMISSION FOOTER
             ============================================================================ */}
          <div className="pt-1.5 sm:pt-2 flex flex-col lg:flex-row items-center justify-between gap-3">
            {/* Quick-Jump Strip for Active 10-Question Window + "...200" Palette Trigger */}
            <div className="grid grid-cols-11 sm:flex items-center justify-center gap-1 sm:gap-1.5 w-full lg:w-auto py-0.5">
              {Array.from({ length: 10 }, (_, offset) => {
                const idx = Math.floor(currentSlot / 10) * 10 + offset;
                if (idx >= examQuestions.length) return null;
                const q = examQuestions[idx];
                const qNum = idx + 1;
                const isCurrent = idx === currentSlot;
                const isAnswered = answers[qNum] !== undefined;
                return (
                  <button
                    key={`${q.id}-${qNum}`}
                    type="button"
                    onClick={() => setCurrentSlot(idx)}
                    aria-label={`Go to Question ${qNum}`}
                    className={`h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl font-rounded font-bold text-[11px] sm:text-xs transition-all cursor-pointer flex items-center justify-center ${
                      isCurrent
                        ? 'bg-indigo-600 text-white shadow-md scale-105'
                        : isAnswered
                        ? 'bg-emerald-500/20 border border-emerald-400/60 text-emerald-800 dark:text-emerald-200'
                        : 'theme-subcard theme-text-secondary hover:border-indigo-400/50'
                    }`}
                  >
                    {qNum}
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => setShowNavigator((v) => !v)}
                aria-label="View all 200 question slots"
                className="h-7 sm:px-2.5 sm:h-8 rounded-lg sm:rounded-xl bg-indigo-500/15 border border-indigo-400/40 text-indigo-700 dark:text-indigo-200 font-rounded font-extrabold text-[10px] sm:text-xs cursor-pointer flex items-center justify-center hover:bg-indigo-500/25 transition-colors"
                title="Open full 200-question BCS navigator"
              >
                …200
              </button>
            </div>

            {/* Prev / Next / Submit Exam Controls */}
            <div className="grid grid-cols-3 sm:flex items-center gap-1.5 sm:gap-2 w-full lg:w-auto sm:justify-between lg:justify-end shrink-0">
              <button
                type="button"
                onClick={() => setCurrentSlot((prev) => Math.max(0, prev - 1))}
                disabled={currentSlot === 0}
                className="inline-flex items-center justify-center gap-1 px-2.5 py-2 sm:px-4 sm:py-2.5 rounded-xl theme-subcard font-rounded font-bold text-xs sm:text-sm theme-text-primary disabled:opacity-40 disabled:pointer-events-none hover:scale-103 active:scale-95 transition-transform cursor-pointer whitespace-nowrap"
              >
                <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                <span>Prev</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  setCurrentSlot((prev) =>
                    Math.min(BCS_PRELIM_TOTAL_QUESTIONS - 1, prev + 1)
                  )
                }
                disabled={currentSlot >= BCS_PRELIM_TOTAL_QUESTIONS - 1}
                className="inline-flex items-center justify-center gap-1 px-2.5 py-2 sm:px-5 sm:py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-rounded font-bold text-xs sm:text-sm shadow-md hover:scale-103 active:scale-95 transition-transform cursor-pointer whitespace-nowrap disabled:opacity-40"
              >
                <span className="sm:hidden">Next</span>
                <span className="hidden sm:inline">Next Question</span>
                <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              </button>

              {isReviewing ? (
                <button
                  type="button"
                  onClick={() => setIsReviewing(false)}
                  className="inline-flex items-center justify-center gap-1 sm:gap-1.5 px-2.5 py-2 sm:px-5 sm:py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-rounded font-bold text-xs sm:text-sm shadow-md hover:scale-103 active:scale-95 transition-transform cursor-pointer whitespace-nowrap"
                >
                  <Trophy className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                  <span>Result Card</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsSubmitted(true)}
                  className="inline-flex items-center justify-center gap-1 sm:gap-1.5 px-2.5 py-2 sm:px-5 sm:py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-rounded font-bold text-xs sm:text-sm shadow-md hover:scale-103 active:scale-95 transition-transform cursor-pointer whitespace-nowrap"
                >
                  <Trophy className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                  <span>Submit Exam</span>
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* ============================================================================
            6. OFFICIAL BCS PRELIMINARY 200-MARK SCORECARD & NEGATIVE MARKING REPORT
           ============================================================================ */
        <div className="section-card-mock rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-10 text-center space-y-6">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 mx-auto flex items-center justify-center text-white shadow-xl">
            <Trophy className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <span className="inline-block px-3.5 py-1 rounded-full bg-indigo-500/20 text-indigo-700 dark:text-indigo-200 font-rounded font-bold text-xs">
              BCS Preliminary Official 200-Mark Evaluation
            </span>
            <h1 className="text-2xl sm:text-4xl font-rounded font-extrabold theme-text-primary">
              Net Score: {examStats.netScore.toFixed(2)} / {BCS_PRELIM_TOTAL_MARKS}.00
            </h1>
            <p className="font-bangla text-sm sm:text-base theme-text-secondary">
              মোট প্রশ্ন: ২০০টি (লোডেড প্রশ্ন: {MOCK_QUESTIONS.length}টি) • উত্তর প্রদান: {examStats.answeredCount}টি • সময় ব্যয়: {elapsedMinutes} মিনিট {elapsedRemSeconds} সেকেন্ড
            </p>
          </div>

          {/* 4-Column BCS Negative Marking Breakdown */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto">
            <div className="p-4 rounded-2xl crystal-meta-panel">
              <div className="text-xl sm:text-2xl font-rounded font-extrabold text-emerald-600 dark:text-emerald-400">
                +{examStats.positiveMarks.toFixed(2)}
              </div>
              <div className="text-[11px] sm:text-xs font-rounded font-bold theme-text-secondary mt-0.5">
                Correct ({examStats.correctCount} × 1.00)
              </div>
            </div>

            <div className="p-4 rounded-2xl crystal-meta-panel">
              <div className="text-xl sm:text-2xl font-rounded font-extrabold text-rose-600 dark:text-rose-400">
                -{examStats.negativeDeduction.toFixed(2)}
              </div>
              <div className="text-[11px] sm:text-xs font-rounded font-bold theme-text-secondary mt-0.5">
                Penalty ({examStats.wrongCount} × 0.50)
              </div>
            </div>

            <div className="p-4 rounded-2xl crystal-meta-panel">
              <div className="text-xl sm:text-2xl font-rounded font-extrabold theme-text-primary">
                {examStats.unansweredCount}
              </div>
              <div className="text-[11px] sm:text-xs font-rounded font-bold theme-text-secondary mt-0.5">
                Unanswered (0.00)
              </div>
            </div>

            <div className="p-4 rounded-2xl crystal-meta-panel">
              <div className="text-xl sm:text-2xl font-rounded font-extrabold text-indigo-600 dark:text-indigo-400">
                {examStats.netScore.toFixed(2)}
              </div>
              <div className="text-[11px] sm:text-xs font-rounded font-bold theme-text-secondary mt-0.5">
                Final Marks / 200
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setCurrentSlot(0);
                setIsReviewing(true);
              }}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl theme-subcard font-rounded font-bold text-sm theme-text-primary hover:scale-105 active:scale-95 transition-transform cursor-pointer"
            >
              <BookOpen className="w-4 h-4 text-indigo-500" />
              <span>Review Answers & Explanations</span>
            </button>

            <button
              type="button"
              onClick={handleRestartTest}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 text-white font-rounded font-bold text-sm shadow-lg hover:scale-105 active:scale-95 transition-transform cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Start Fresh 200-Mark Mock</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
