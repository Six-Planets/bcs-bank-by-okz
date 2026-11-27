import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Search,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  Sparkles,
  BookOpenCheck,
  GraduationCap,
  Grid2x2,
  RotateCcw,
  ArrowUpRight
} from 'lucide-react';
import { ArchiveMonolith3DEmblem } from '../illustrations/Royal3DEmblems';
import { BCSQuestionRecord, loadBCSQuestionBank } from '../../data/questionBank';
import {
  getSubjectTheme,
  MasteryMap,
  readMasteryMap,
  saveMasteryAnswer,
  TopicMasterIntent
} from '../../data/syllabus';

const OPTION_LETTERS = ['ক', 'খ', 'গ', 'ঘ', 'ঙ', 'চ'];
const PAGE_SIZE = 20;

interface QuestionBankViewProps {
  onOpenTopicMaster?: (intent?: TopicMasterIntent) => void;
}

export const QuestionBankView: React.FC<QuestionBankViewProps> = ({ onOpenTopicMaster }) => {
  const [questions, setQuestions] = useState<BCSQuestionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedBatch, setSelectedBatch] = useState<string>('All');
  const [showAllBatchesGrid, setShowAllBatchesGrid] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<string>('All');
  const [onlyWithImages, setOnlyWithImages] = useState(false);
  const [studyMode, setStudyMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);

  const [pickedAnswers, setPickedAnswers] = useState<Record<number, number>>({});
  const [expandedExplanations, setExpandedExplanations] = useState<Record<number, boolean>>({});
  const [, setMastery] = useState<MasteryMap>(() => readMasteryMap());
  const listTopRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let active = true;
    loadBCSQuestionBank()
      .then((data) => {
        if (!active) return;
        setQuestions(data);
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Failed to load question bank');
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // All 40 BCS batches sorted descending (50th -> 10th)
  const batchOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const q of questions) {
      counts.set(q.bcsBatch, (counts.get(q.bcsBatch) ?? 0) + 1);
    }
    return Array.from(counts.entries()).sort((a, b) => {
      const numA = parseInt(a[0], 10);
      const numB = parseInt(b[0], 10);
      if (!isNaN(numA) && !isNaN(numB)) return numB - numA;
      return a[0].localeCompare(b[0]);
    });
  }, [questions]);

  // Subjects scoped to the currently selected BCS batch, ordered by official syllabus serial
  const subjectOptions = useMemo(() => {
    const base =
      selectedBatch === 'All'
        ? questions
        : questions.filter((q) => q.bcsBatch === selectedBatch);
    const counts = new Map<string, number>();
    for (const q of base) {
      counts.set(q.subject, (counts.get(q.subject) ?? 0) + 1);
    }
    return Array.from(counts.entries()).sort(
      (a, b) => getSubjectTheme(a[0]).serial - getSubjectTheme(b[0]).serial
    );
  }, [questions, selectedBatch]);

  const diagramCount = useMemo(() => {
    return questions.reduce((acc, q) => {
      if (selectedBatch !== 'All' && q.bcsBatch !== selectedBatch) return acc;
      if (selectedSubject !== 'All' && q.subject !== selectedSubject) return acc;
      return acc + (q.image ? 1 : 0);
    }, 0);
  }, [questions, selectedBatch, selectedSubject]);

  const filteredQuestions = useMemo(() => {
    const qLower = searchQuery.trim().toLowerCase();
    return questions.filter((item) => {
      if (selectedBatch !== 'All' && item.bcsBatch !== selectedBatch) return false;
      if (selectedSubject !== 'All' && item.subject !== selectedSubject) return false;
      if (onlyWithImages && !item.image) return false;
      if (qLower) {
        const hay =
          `${item.question} ${item.options.join(' ')} ${item.explanation} ${item.bcsBatch} ${item.subjectBn}`.toLowerCase();
        if (!hay.includes(qLower)) return false;
      }
      return true;
    });
  }, [questions, selectedBatch, selectedSubject, onlyWithImages, searchQuery]);

  // Live session score for Practice Mode
  const sessionScore = useMemo(() => {
    let attempted = 0;
    let correct = 0;
    for (const [idStr, picked] of Object.entries(pickedAnswers)) {
      const id = Number(idStr);
      const q = questions.find((item) => item.id === id);
      if (!q || q.correctIndex === null) continue;
      attempted += 1;
      if (picked === q.correctIndex) correct += 1;
    }
    return { attempted, correct };
  }, [pickedAnswers, questions]);

  const totalPages = Math.max(1, Math.ceil(filteredQuestions.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredQuestions.slice(start, start + PAGE_SIZE);
  }, [filteredQuestions, safePage]);

  const hasFilters =
    selectedBatch !== 'All' ||
    selectedSubject !== 'All' ||
    onlyWithImages ||
    searchQuery.trim() !== '';

  const handleBatchPick = (batch: string) => {
    setSelectedBatch(batch);
    setSelectedSubject('All');
    setShowAllBatchesGrid(false);
    setPage(1);
  };

  const handleReset = () => {
    setSelectedBatch('All');
    setSelectedSubject('All');
    setOnlyWithImages(false);
    setSearchQuery('');
    setPage(1);
  };

  const handlePickOption = (q: BCSQuestionRecord, idx: number) => {
    setPickedAnswers((prev) => ({ ...prev, [q.id]: idx }));
    if (q.correctIndex !== null) {
      setMastery(saveMasteryAnswer(q.id, idx === q.correctIndex));
    }
  };

  const goToPage = (next: number) => {
    setPage(next);
    listTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Compact numbered page buttons
  const pageNumbers = useMemo(() => {
    const pages: number[] = [];
    const start = Math.max(1, safePage - 2);
    const end = Math.min(totalPages, safePage + 2);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }, [safePage, totalPages]);

  return (
    <div className="section-card-qb rounded-[2rem] sm:rounded-[2.5rem] p-4 sm:p-7 lg:p-8 space-y-5">
      {/* Clean Airy Header */}
      <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
        <ArchiveMonolith3DEmblem className="w-24 h-24 sm:w-28 sm:h-28 shrink-0 animate-float-gentle drop-shadow-[0_14px_24px_rgba(14,165,233,0.32)]" />
        <div className="text-center sm:text-left space-y-1.5 flex-1">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/15 border border-sky-400/40 text-sky-800 dark:text-sky-200 font-rounded font-bold text-xs">
              {loading
                ? 'Loading Question Bank...'
                : `${questions.length.toLocaleString()} Questions • ${batchOptions.length} BCS Papers`}
            </span>
            {sessionScore.attempted > 0 && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/40 text-emerald-800 dark:text-emerald-200 font-rounded font-bold text-xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>
                  {sessionScore.correct}/{sessionScore.attempted} (
                  {Math.round((sessionScore.correct / sessionScore.attempted) * 100)}%)
                </span>
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-rounded font-bold theme-text-primary">
            BCS Question Bank
          </h1>
          <p className="theme-text-secondary font-bangla text-sm sm:text-base">
            ১০ম থেকে ৫০তম বিসিএস প্রিলিমিনারি বিগত সালের প্রশ্নপত্র ও ব্যাখ্যাসহ সমাধান
          </p>
        </div>
      </div>

      {/* Step 1: Clean BCS Exam Paper Strip */}
      {!loading && !error && (
        <div className="p-3.5 sm:p-4 rounded-3xl theme-subcard space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-rounded font-bold uppercase tracking-wider theme-text-muted">
              Select BCS Exam Paper
            </span>
            <button
              type="button"
              onClick={() => setShowAllBatchesGrid((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-sky-500/15 text-sky-700 dark:text-sky-300 font-rounded font-bold text-xs hover:bg-sky-500/25 transition-colors cursor-pointer"
            >
              <Grid2x2 className="w-3.5 h-3.5" />
              <span>{showAllBatchesGrid ? 'Compact Bar' : `All ${batchOptions.length} Papers`}</span>
            </button>
          </div>

          {showAllBatchesGrid ? (
            <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-8 gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleBatchPick('All')}
                className={`px-2.5 py-2 rounded-xl font-rounded font-bold text-xs transition-all cursor-pointer border ${
                  selectedBatch === 'All'
                    ? 'bg-sky-600 text-white border-sky-400 shadow-sm'
                    : 'bg-white/65 dark:bg-slate-900/55 border-slate-300/60 dark:border-slate-700/60 theme-text-primary hover:border-sky-400'
                }`}
              >
                All
              </button>
              {batchOptions.map(([batch, cnt]) => {
                const shortLabel = batch.replace(' BCS', '');
                const active = selectedBatch === batch;
                return (
                  <button
                    key={batch}
                    type="button"
                    onClick={() => handleBatchPick(batch)}
                    className={`px-2 py-2 rounded-xl font-rounded font-bold text-xs transition-all cursor-pointer border flex flex-col items-center leading-tight ${
                      active
                        ? 'bg-sky-600 text-white border-sky-400 shadow-sm'
                        : 'bg-white/65 dark:bg-slate-900/55 border-slate-300/60 dark:border-slate-700/60 theme-text-primary hover:border-sky-400'
                    }`}
                  >
                    <span>{shortLabel}</span>
                    <span className={`text-[10px] font-semibold ${active ? 'text-sky-100' : 'theme-text-muted'}`}>
                      {cnt} Q
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-0.5">
              <button
                type="button"
                onClick={() => handleBatchPick('All')}
                className={`shrink-0 px-3.5 py-2 rounded-2xl font-rounded font-bold text-xs transition-all cursor-pointer border ${
                  selectedBatch === 'All'
                    ? 'bg-sky-600 text-white border-sky-400 shadow-sm'
                    : 'bg-white/70 dark:bg-slate-900/60 border-slate-300/60 dark:border-slate-700/60 theme-text-secondary hover:theme-text-primary'
                }`}
              >
                All Exams ({questions.length.toLocaleString()})
              </button>
              {batchOptions.map(([batch, cnt]) => {
                const active = selectedBatch === batch;
                return (
                  <button
                    key={batch}
                    type="button"
                    onClick={() => handleBatchPick(batch)}
                    className={`shrink-0 px-3.5 py-2 rounded-2xl font-rounded font-bold text-xs transition-all cursor-pointer border ${
                      active
                        ? 'bg-sky-600 text-white border-sky-400 shadow-sm'
                        : 'bg-white/70 dark:bg-slate-900/60 border-slate-300/60 dark:border-slate-700/60 theme-text-secondary hover:theme-text-primary'
                    }`}
                  >
                    {batch} <span className="opacity-70">· {cnt}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Subject Filter Pills (clean horizontal strip) */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1 border-t border-slate-300/35 dark:border-slate-700/45">
            <button
              type="button"
              onClick={() => {
                setSelectedSubject('All');
                setPage(1);
              }}
              className={`shrink-0 px-3 py-1.5 rounded-xl font-rounded font-bold text-xs transition-all cursor-pointer ${
                selectedSubject === 'All'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white/55 dark:bg-slate-900/50 theme-text-secondary hover:theme-text-primary'
              }`}
            >
              All Subjects
            </button>
            {subjectOptions.map(([subj, cnt]) => {
              const theme = getSubjectTheme(subj);
              const active = selectedSubject === subj;
              return (
                <button
                  key={subj}
                  type="button"
                  onClick={() => {
                    setSelectedSubject(active ? 'All' : subj);
                    setPage(1);
                  }}
                  className={`shrink-0 px-3 py-1.5 rounded-xl font-rounded font-bold text-xs transition-all cursor-pointer ${
                    active
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-white/55 dark:bg-slate-900/50 theme-text-secondary hover:theme-text-primary'
                  }`}
                >
                  {theme.shortEn} <span className="opacity-70">({cnt})</span>
                </button>
              );
            })}
          </div>

          {/* Search + Practice/Study Mode + Diagrams */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-1">
            <div className="relative flex-1">
              <Search className="w-4 h-4 theme-text-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="প্রশ্ন, অপশন বা ব্যাখ্যা খুঁজুন..."
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white/80 dark:bg-slate-900/70 border border-slate-300/60 dark:border-slate-700/70 font-bangla text-sm theme-text-primary focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-2 flex-wrap">
              {/* Practice vs Study mode */}
              <div className="inline-flex rounded-xl p-0.5 bg-white/70 dark:bg-slate-900/65 border border-slate-300/60 dark:border-slate-700/60">
                <button
                  type="button"
                  onClick={() => setStudyMode(false)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-rounded font-bold text-xs cursor-pointer transition-all ${
                    !studyMode
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'theme-text-secondary hover:theme-text-primary'
                  }`}
                >
                  <GraduationCap className="w-3.5 h-3.5" />
                  <span>Practice</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStudyMode(true)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-rounded font-bold text-xs cursor-pointer transition-all ${
                    studyMode
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'theme-text-secondary hover:theme-text-primary'
                  }`}
                >
                  <BookOpenCheck className="w-3.5 h-3.5" />
                  <span>Study</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  setOnlyWithImages((v) => !v);
                  setPage(1);
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-rounded font-bold text-xs transition-all cursor-pointer border ${
                  onlyWithImages
                    ? 'bg-fuchsia-600 text-white border-fuchsia-400 shadow-xs'
                    : 'bg-white/70 dark:bg-slate-900/60 border-slate-300/60 dark:border-slate-700/60 theme-text-secondary'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Diagrams ({diagramCount})</span>
              </button>

              {hasFilters && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-500/15 text-rose-700 dark:text-rose-300 font-rounded font-bold text-xs cursor-pointer hover:bg-rose-500/25 transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Results meta strip */}
      <div ref={listTopRef} className="flex items-center justify-between gap-2 px-1">
        <p className="font-rounded font-bold text-xs sm:text-sm theme-text-secondary">
          {selectedBatch === 'All' ? 'All 10th–50th BCS' : selectedBatch}
          {selectedSubject !== 'All' ? ` • ${getSubjectTheme(selectedSubject).shortEn}` : ''}
          {' — '}
          <span className="theme-text-primary">{filteredQuestions.length.toLocaleString()} questions</span>
        </p>
        {totalPages > 1 && (
          <span className="font-rounded font-semibold text-xs theme-text-muted">
            Page {safePage} / {totalPages}
          </span>
        )}
      </div>

      {/* Loading / Error / Empty */}
      {loading && (
        <div className="p-10 rounded-3xl theme-subcard text-center font-rounded font-bold theme-text-secondary">
          Loading 5,655 BCS Preliminary questions...
        </div>
      )}

      {error && (
        <div className="p-6 rounded-3xl bg-rose-500/15 border border-rose-400/40 text-rose-800 dark:text-rose-200 font-rounded font-bold text-sm">
          {error}
        </div>
      )}

      {!loading && !error && pageItems.length === 0 && (
        <div className="p-10 rounded-3xl theme-subcard text-center space-y-2">
          <p className="font-rounded font-bold theme-text-primary">No matching questions found</p>
          <p className="font-bangla text-sm theme-text-secondary">
            অন্য কোনো বিসিএস ব্যাচ, বিষয় বা কীওয়ার্ড দিয়ে চেষ্টা করুন।
          </p>
        </div>
      )}

      {/* Clean, Spacious Question Cards */}
      {!loading && !error && pageItems.length > 0 && (
        <div className="space-y-4">
          {pageItems.map((q) => {
            const picked = pickedAnswers[q.id];
            const isPicked = picked !== undefined;
            const reveal = studyMode || isPicked || Boolean(expandedExplanations[q.id]);
            const subjTheme = getSubjectTheme(q.subject);

            return (
              <article
                key={q.id}
                className="p-4 sm:p-6 rounded-3xl theme-subcard space-y-4 shadow-sm"
              >
                {/* Minimal 3-pill header */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-indigo-600 text-white font-rounded font-bold text-xs">
                      {q.bcsBatch}
                      {q.questionNumber ? ` • Q${q.questionNumber}` : ''}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full border font-rounded font-bold text-xs ${subjTheme.badgeBg}`}
                    >
                      {subjTheme.shortEn}
                    </span>
                    {onOpenTopicMaster && (
                      <button
                        type="button"
                        onClick={() =>
                          onOpenTopicMaster({
                            tab: q.isExtraTopic ? 'extra' : 'syllabus',
                            subject: q.subject,
                            topic: q.syllabusTopic
                          })
                        }
                        title="Explore this topic in Topic Master"
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/65 dark:bg-slate-900/60 border border-slate-300/60 dark:border-slate-700/70 theme-text-secondary hover:text-indigo-600 dark:hover:text-indigo-300 font-bangla font-semibold text-xs transition-colors cursor-pointer"
                      >
                        <span className="max-w-[200px] truncate">{q.syllabusTopic}</span>
                        <ArrowUpRight className="w-3 h-3 shrink-0 opacity-70" />
                      </button>
                    )}
                  </div>

                  {!studyMode && (
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedExplanations((prev) => ({ ...prev, [q.id]: !prev[q.id] }))
                      }
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-sky-500/15 text-sky-700 dark:text-sky-300 font-rounded font-bold text-xs cursor-pointer hover:bg-sky-500/25 transition-colors"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>{reveal ? 'Hide' : 'Answer'}</span>
                    </button>
                  )}
                </div>

                {/* Question Stem */}
                <h2 className="font-bangla font-bold text-base sm:text-lg theme-text-primary leading-relaxed">
                  {q.question}
                </h2>

                {/* Diagram image */}
                {q.image && (
                  <div className="p-3 rounded-2xl bg-white/95 dark:bg-slate-950/75 border border-slate-300/60 dark:border-slate-700/70 inline-block max-w-full">
                    <img
                      src={q.image}
                      alt={`Question ${q.id} diagram`}
                      loading="lazy"
                      className="max-h-56 w-auto rounded-xl object-contain"
                    />
                  </div>
                )}

                {/* 2x2 Options Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {q.options.map((opt, idx) => {
                    const isThisPicked = picked === idx;
                    const isCorrectOpt = q.correctIndex === idx;

                    let cardCls =
                      'bg-white/70 dark:bg-slate-900/55 border-slate-300/60 dark:border-slate-700/70 theme-text-primary hover:border-sky-400';
                    if (reveal && isCorrectOpt) {
                      cardCls =
                        'bg-emerald-500/20 border-emerald-500 text-emerald-950 dark:text-emerald-100';
                    } else if (reveal && isThisPicked && !isCorrectOpt) {
                      cardCls = 'bg-rose-500/20 border-rose-500 text-rose-950 dark:text-rose-100';
                    }

                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handlePickOption(q, idx)}
                        className={`p-3 rounded-2xl border text-left flex items-center justify-between gap-2.5 transition-all cursor-pointer ${cardCls}`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="w-7 h-7 rounded-lg bg-indigo-500/15 text-indigo-700 dark:text-indigo-200 font-bangla font-bold text-xs flex items-center justify-center shrink-0">
                            {OPTION_LETTERS[idx] ?? idx + 1}
                          </span>
                          <span className="font-bangla font-semibold text-sm sm:text-base break-words">
                            {opt}
                          </span>
                        </div>
                        {reveal && isCorrectOpt && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        )}
                        {reveal && isThisPicked && !isCorrectOpt && (
                          <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Clean Explanation Drawer */}
                {reveal && (q.explanation || q.correctAnswerRaw) && (
                  <div className="p-3.5 sm:p-4 rounded-2xl bg-sky-500/10 border border-sky-400/30 font-bangla text-xs sm:text-sm theme-text-secondary leading-relaxed space-y-1.5">
                    {q.correctIndex === null && q.correctAnswerRaw && (
                      <div className="font-bold text-emerald-700 dark:text-emerald-300">
                        উত্তর: {q.correctAnswerRaw}
                      </div>
                    )}
                    {q.explanation && <div className="whitespace-pre-line">{q.explanation}</div>}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {/* Clean Numbered Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between gap-2 pt-2">
          <button
            type="button"
            onClick={() => goToPage(Math.max(1, safePage - 1))}
            disabled={safePage <= 1}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl theme-subcard font-rounded font-bold text-xs sm:text-sm theme-text-primary disabled:opacity-40 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Prev</span>
          </button>

          <div className="flex items-center gap-1.5">
            {pageNumbers.map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => goToPage(num)}
                className={`w-9 h-9 rounded-xl font-rounded font-bold text-xs transition-all cursor-pointer ${
                  num === safePage
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'theme-subcard theme-text-secondary hover:theme-text-primary'
                }`}
              >
                {num}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => goToPage(Math.min(totalPages, safePage + 1))}
            disabled={safePage >= totalPages}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-600 text-white font-rounded font-bold text-xs sm:text-sm shadow-md disabled:opacity-40 cursor-pointer"
          >
            <span>Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
