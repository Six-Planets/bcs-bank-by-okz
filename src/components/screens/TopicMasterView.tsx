import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BookOpen,
  BookOpenCheck,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Crown,
  Filter,
  Flame,
  GraduationCap,
  Info,
  Layers,
  LayoutGrid,
  ListOrdered,
  RotateCcw,
  Search,
  Sparkles,
  Stethoscope,
  Target,
  TrendingUp,
  XCircle,
  Zap
} from 'lucide-react';
import { RoyalAstrolabe3DEmblem } from '../illustrations/Royal3DEmblems';
import { BCSQuestionRecord, loadBCSQuestionBank } from '../../data/questionBank';
import {
  BCSSyllabusDocument,
  consumeTopicMasterIntent,
  getSubjectTheme,
  loadBCSSyllabus,
  MasteryMap,
  readMasteryMap,
  saveMasteryAnswer
} from '../../data/syllabus';

type MainTab = 'priority' | 'syllabus' | 'trends' | 'extra';
type EraFilter = 'all' | 'recent' | 'mid' | 'classic';
type PriorityTier = 'all' | 'S' | 'A' | 'B';
type PrioritySort = 'score' | 'frequency' | 'recent' | 'consistency' | 'unmastered';
type PriorityViewMode = 'grouped' | 'ranked';

interface FocusTarget {
  kind: 'subject' | 'topic' | 'trend' | 'extra-topic';
  title: string;
  subtitle?: string;
  subject?: string;
  topic?: string;
  subtopic?: string;
  trend?: string;
}

interface RankedSubtopic {
  key: string;
  subject: string;
  topic: string;
  subtopic: string;
  totalCount: number;
  recentCount: number; // 41st-50th BCS
  examSpread: number;
  latestEdition: number;
  mastered: number;
  masteryPct: number;
  priorityScore: number; // 0-100
  tier: 'S' | 'A' | 'B';
  momentum: 'surging' | 'evergreen' | 'steady';
  topTrend: string | null;
}

const OPTION_LETTERS = ['ক', 'খ', 'গ', 'ঘ', 'ঙ', 'চ'];
const PAGE_SIZE = 20;

function editionNum(ed: string): number {
  const n = parseInt(ed, 10);
  return isNaN(n) ? 0 : n;
}

function matchesEra(ed: string, era: EraFilter): boolean {
  if (era === 'all') return true;
  const n = editionNum(ed);
  if (era === 'recent') return n >= 41;
  if (era === 'mid') return n >= 31 && n <= 40;
  return n > 0 && n <= 30;
}

function computeEraBuckets(items: BCSQuestionRecord[]) {
  let e1 = 0;
  let e2 = 0;
  let e3 = 0;
  let e4 = 0;
  for (const q of items) {
    const n = editionNum(q.rawEdition);
    if (n >= 41) e4 += 1;
    else if (n >= 31) e3 += 1;
    else if (n >= 21) e2 += 1;
    else if (n >= 10) e1 += 1;
  }
  return [
    { label: '10th–20th', count: e1 },
    { label: '21st–30th', count: e2 },
    { label: '31st–40th', count: e3 },
    { label: '41st–50th', count: e4 }
  ];
}

function countByKey(items: BCSQuestionRecord[], picker: (q: BCSQuestionRecord) => string) {
  const m = new Map<string, number>();
  for (const q of items) {
    const k = picker(q) || 'Unknown';
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
}

export const TopicMasterView: React.FC = () => {
  const [questions, setQuestions] = useState<BCSQuestionRecord[]>([]);
  const [syllabus, setSyllabus] = useState<BCSSyllabusDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Navigation inside Royal Topic Master
  const [activeTab, setActiveTab] = useState<MainTab>('priority');
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [focus, setFocus] = useState<FocusTarget | null>(null);

  // Tab 1: Royal Priority Study Engine controls
  const [prioSubject, setPrioSubject] = useState<string>('All');
  const [prioTier, setPrioTier] = useState<PriorityTier>('all');
  const [prioSort, setPrioSort] = useState<PrioritySort>('score');
  const [prioViewMode, setPrioViewMode] = useState<PriorityViewMode>('grouped');
  const [prioSearch, setPrioSearch] = useState('');
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  // Tab 3: Interactive Data Matrix & Trends Explorer controls (Zihad's multi-filter dashboard)
  const [expTomo, setExpTomo] = useState<string>('All');
  const [expSubject, setExpSubject] = useState<string>('All');
  const [expTopic, setExpTopic] = useState<string>('All');
  const [expType, setExpType] = useState<string>('All');
  const [trendSearch, setTrendSearch] = useState('');
  const [trendMinCount, setTrendMinCount] = useState<number>(3);
  const [trendSort, setTrendSort] = useState<'count' | 'recent'>('count');

  // Tab 4: Extra topics search
  const [extraSearch, setExtraSearch] = useState('');

  // Level 3: Focused Practice Workspace controls
  const [activeSubtopic, setActiveSubtopic] = useState<string>('All');
  const [eraFilter, setEraFilter] = useState<EraFilter>('all');
  const [studyMode, setStudyMode] = useState(false);
  const [focusSearch, setFocusSearch] = useState('');
  const [page, setPage] = useState(1);

  // Persistent Mastery & Answer State
  const [pickedAnswers, setPickedAnswers] = useState<Record<number, number>>({});
  const [expandedCards, setExpandedCards] = useState<Record<number, boolean>>({});
  const [mastery, setMastery] = useState<MasteryMap>(() => readMasteryMap());
  const topRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([loadBCSQuestionBank(), loadBCSSyllabus().catch(() => null)])
      .then(([qs, syl]) => {
        if (!active) return;
        setQuestions(qs);
        setSyllabus(syl);
        setLoading(false);

        const intent = consumeTopicMasterIntent();
        if (intent) {
          if (intent.tab) setActiveTab(intent.tab);
          if (intent.trend) {
            setActiveTab('trends');
            setFocus({
              kind: 'trend',
              title: intent.trend,
              subtitle: 'BPSC Recurring Pattern',
              trend: intent.trend
            });
          } else if (intent.topic && intent.tab === 'extra') {
            setActiveTab('extra');
            setFocus({
              kind: 'extra-topic',
              title: intent.topic,
              subtitle: intent.subject || 'Extra / Special Cadre',
              subject: intent.subject,
              topic: intent.topic
            });
          } else if (intent.subject && intent.topic) {
            setActiveTab('syllabus');
            setSelectedSubject(intent.subject);
            setFocus({
              kind: 'topic',
              title: intent.topic,
              subtitle: intent.subject,
              subject: intent.subject,
              topic: intent.topic,
              subtopic: intent.subtopic
            });
            setActiveSubtopic(intent.subtopic || 'All');
          } else if (intent.subject) {
            setActiveTab('syllabus');
            setSelectedSubject(intent.subject);
          }
        }
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Failed to load Topic Master data');
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const officialQuestions = useMemo(
    () => questions.filter((q) => !q.isExtraTopic),
    [questions]
  );
  const extraQuestions = useMemo(
    () => questions.filter((q) => q.isExtraTopic),
    [questions]
  );

  const sectionMarksMap = useMemo(() => {
    const m = new Map<string, number>();
    if (!syllabus) return m;
    for (const subj of syllabus.subjects) {
      for (const sec of subj.sections) {
        m.set(sec.section, sec.marks);
      }
    }
    return m;
  }, [syllabus]);

  // Global dashboard telemetry
  const dashboardStats = useMemo(() => {
    let attempted = 0;
    let correct = 0;
    let recentCount = 0;
    const exams = new Set<string>();
    const unitSet = new Set<string>();
    for (const q of officialQuestions) {
      exams.add(q.bcsBatch);
      unitSet.add(`${q.subject}|||${q.syllabusTopic}|||${q.syllabusSubtopic}`);
      if (editionNum(q.rawEdition) >= 41) recentCount += 1;
      const state = mastery[q.id];
      if (state !== undefined) {
        attempted += 1;
        if (state === 1) correct += 1;
      }
    }
    return {
      totalAll: questions.length,
      officialTotal: officialQuestions.length,
      extraTotal: extraQuestions.length,
      examCount: exams.size,
      unitCount: unitSet.size,
      recentCount,
      attempted,
      correct,
      masteryPct: officialQuestions.length
        ? Math.round((correct / officialQuestions.length) * 100)
        : 0
    };
  }, [questions.length, officialQuestions, extraQuestions.length, mastery]);

  // =========================================================================
  // ROYAL PRIORITY ENGINE: Score & Tier Every Official Section & Subsection
  // =========================================================================
  const allRankedSubtopics = useMemo<RankedSubtopic[]>(() => {
    const map = new Map<
      string,
      {
        subject: string;
        topic: string;
        subtopic: string;
        total: number;
        recent: number;
        exams: Set<string>;
        latestEdition: number;
        mastered: number;
        trends: Map<string, number>;
      }
    >();

    for (const q of officialQuestions) {
      const key = `${q.subject}|||${q.syllabusTopic}|||${q.syllabusSubtopic}`;
      let rec = map.get(key);
      if (!rec) {
        rec = {
          subject: q.subject,
          topic: q.syllabusTopic,
          subtopic: q.syllabusSubtopic,
          total: 0,
          recent: 0,
          exams: new Set(),
          latestEdition: 0,
          mastered: 0,
          trends: new Map()
        };
        map.set(key, rec);
      }
      rec.total += 1;
      const ed = editionNum(q.rawEdition);
      if (ed >= 41) rec.recent += 1;
      if (ed > rec.latestEdition) rec.latestEdition = ed;
      rec.exams.add(q.bcsBatch);
      if (mastery[q.id] === 1) rec.mastered += 1;
      if (q.bpscTrendTag && q.bpscTrendTag !== 'General BCS Pattern') {
        rec.trends.set(q.bpscTrendTag, (rec.trends.get(q.bpscTrendTag) ?? 0) + 1);
      }
    }

    const entries = Array.from(map.entries());
    const maxTotal = Math.max(1, ...entries.map(([, v]) => v.total));
    const maxRecent = Math.max(1, ...entries.map(([, v]) => v.recent));
    const maxSpread = Math.max(1, ...entries.map(([, v]) => v.exams.size));

    const scored = entries.map(([key, v]) => {
      // Log-damped normalization so mega-topics don't crush everything else to 5/100
      const freqNorm = Math.log1p(v.total) / Math.log1p(maxTotal);
      const recentNorm = Math.log1p(v.recent) / Math.log1p(maxRecent);
      const spreadNorm = v.exams.size / maxSpread;
      const masteryRatio = v.total > 0 ? v.mastered / v.total : 0;
      const gapBonus = 1 - masteryRatio;

      // Weighted Royal Priority Formula (0..100)
      const rawScore =
        freqNorm * 40 + recentNorm * 32 + spreadNorm * 22 + gapBonus * 6;
      const priorityScore = Math.min(99, Math.max(12, Math.round(rawScore)));

      const tier: 'S' | 'A' | 'B' =
        priorityScore >= 76 ? 'S' : priorityScore >= 54 ? 'A' : 'B';

      const recentShare = v.total > 0 ? v.recent / v.total : 0;
      const momentum: 'surging' | 'evergreen' | 'steady' =
        v.recent >= 10 && recentShare >= 0.34
          ? 'surging'
          : v.exams.size >= 18
          ? 'evergreen'
          : 'steady';

      const topTrend =
        Array.from(v.trends.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

      return {
        key,
        subject: v.subject,
        topic: v.topic,
        subtopic: v.subtopic,
        totalCount: v.total,
        recentCount: v.recent,
        examSpread: v.exams.size,
        latestEdition: v.latestEdition,
        mastered: v.mastered,
        masteryPct: v.total > 0 ? Math.round((v.mastered / v.total) * 100) : 0,
        priorityScore,
        tier,
        momentum,
        topTrend
      };
    });

    return scored.sort((a, b) => b.priorityScore - a.priorityScore || b.totalCount - a.totalCount);
  }, [officialQuestions, mastery]);

  // Pareto 80/20 Insight for S-Tier Must-Study Topics
  const paretoInsight = useMemo(() => {
    const sTier = allRankedSubtopics.filter((x) => x.tier === 'S');
    const sTotal = sTier.reduce((acc, x) => acc + x.totalCount, 0);
    const sRecent = sTier.reduce((acc, x) => acc + x.recentCount, 0);
    const allTotal = Math.max(1, officialQuestions.length);
    const allRecent = Math.max(1, dashboardStats.recentCount);
    return {
      sCount: sTier.length,
      sCoveragePct: Math.round((sTotal / allTotal) * 100),
      sRecentCoveragePct: Math.round((sRecent / allRecent) * 100),
      sQuestions: sTotal
    };
  }, [allRankedSubtopics, officialQuestions.length, dashboardStats.recentCount]);

  // Filtered & sorted Priority Subtopics
  const filteredPrioritySubtopics = useMemo(() => {
    const qLower = prioSearch.trim().toLowerCase();
    const list = allRankedSubtopics.filter((item) => {
      if (prioSubject !== 'All' && item.subject !== prioSubject) return false;
      if (prioTier !== 'all' && item.tier !== prioTier) return false;
      if (qLower) {
        const hay = `${item.subject} ${item.topic} ${item.subtopic} ${item.topTrend ?? ''}`.toLowerCase();
        if (!hay.includes(qLower)) return false;
      }
      return true;
    });

    return [...list].sort((a, b) => {
      if (prioSort === 'frequency') return b.totalCount - a.totalCount || b.priorityScore - a.priorityScore;
      if (prioSort === 'recent') return b.recentCount - a.recentCount || b.priorityScore - a.priorityScore;
      if (prioSort === 'consistency') return b.examSpread - a.examSpread || b.priorityScore - a.priorityScore;
      if (prioSort === 'unmastered') return a.masteryPct - b.masteryPct || b.priorityScore - a.priorityScore;
      return b.priorityScore - a.priorityScore || b.totalCount - a.totalCount;
    });
  }, [allRankedSubtopics, prioSubject, prioTier, prioSearch, prioSort]);

  // Grouped under Subject -> Official Section -> Ranked Subsections
  const groupedPrioritySections = useMemo(() => {
    const secMap = new Map<
      string,
      {
        secKey: string;
        subject: string;
        topic: string;
        marks: number | null;
        totalCount: number;
        recentCount: number;
        mastered: number;
        avgScore: number;
        maxScore: number;
        sCount: number;
        subtopics: RankedSubtopic[];
      }
    >();

    for (const sub of filteredPrioritySubtopics) {
      const secKey = `${sub.subject}|||${sub.topic}`;
      let group = secMap.get(secKey);
      if (!group) {
        group = {
          secKey,
          subject: sub.subject,
          topic: sub.topic,
          marks: sectionMarksMap.get(sub.topic) ?? null,
          totalCount: 0,
          recentCount: 0,
          mastered: 0,
          avgScore: 0,
          maxScore: 0,
          sCount: 0,
          subtopics: []
        };
        secMap.set(secKey, group);
      }
      group.subtopics.push(sub);
      group.totalCount += sub.totalCount;
      group.recentCount += sub.recentCount;
      group.mastered += sub.mastered;
      if (sub.priorityScore > group.maxScore) group.maxScore = sub.priorityScore;
      if (sub.tier === 'S') group.sCount += 1;
    }

    const result = Array.from(secMap.values()).map((g) => ({
      ...g,
      avgScore: Math.round(
        g.subtopics.reduce((acc, s) => acc + s.priorityScore, 0) / Math.max(1, g.subtopics.length)
      )
    }));

    return result.sort((a, b) => {
      if (prioSort === 'frequency') return b.totalCount - a.totalCount;
      if (prioSort === 'recent') return b.recentCount - a.recentCount;
      return b.maxScore - a.maxScore || b.totalCount - a.totalCount;
    });
  }, [filteredPrioritySubtopics, sectionMarksMap, prioSort]);

  // =========================================================================
  // TAB 2: 10 OFFICIAL SUBJECTS & SYLLABUS HIERARCHY
  // =========================================================================
  const subjectCards = useMemo(() => {
    const bySubj = new Map<string, BCSQuestionRecord[]>();
    for (const q of officialQuestions) {
      const list = bySubj.get(q.subject);
      if (list) list.push(q);
      else bySubj.set(q.subject, [q]);
    }

    return Array.from(bySubj.entries())
      .map(([subj, list]) => {
        const theme = getSubjectTheme(subj);
        const topicCounts = new Map<string, number>();
        const subtopicSet = new Set<string>();
        const examSet = new Set<string>();
        let mastered = 0;
        let recent = 0;

        for (const q of list) {
          topicCounts.set(q.syllabusTopic, (topicCounts.get(q.syllabusTopic) ?? 0) + 1);
          subtopicSet.add(q.syllabusSubtopic);
          examSet.add(q.bcsBatch);
          if (mastery[q.id] === 1) mastered += 1;
          if (editionNum(q.rawEdition) >= 41) recent += 1;
        }

        const topTopics = Array.from(topicCounts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3);

        return {
          subject: subj,
          theme,
          totalQuestions: list.length,
          recentQuestions: recent,
          sectionCount: topicCounts.size,
          subtopicCount: subtopicSet.size,
          examCount: examSet.size,
          mastered,
          masteryPct: list.length ? Math.round((mastered / list.length) * 100) : 0,
          topTopics
        };
      })
      .sort((a, b) => a.theme.serial - b.theme.serial);
  }, [officialQuestions, mastery]);

  const subjectDeepDive = useMemo(() => {
    if (!selectedSubject) return null;
    const list = officialQuestions.filter((q) => q.subject === selectedSubject);
    const theme = getSubjectTheme(selectedSubject);
    const eraBuckets = computeEraBuckets(list);
    const exams = new Set(list.map((q) => q.bcsBatch)).size;

    const sectionMap = new Map<
      string,
      {
        topic: string;
        marks: number | null;
        questions: BCSQuestionRecord[];
        subtopics: Map<string, number>;
        trends: Map<string, number>;
        mastered: number;
      }
    >();

    let subjectMastered = 0;
    for (const q of list) {
      const isMast = mastery[q.id] === 1;
      if (isMast) subjectMastered += 1;
      let entry = sectionMap.get(q.syllabusTopic);
      if (!entry) {
        entry = {
          topic: q.syllabusTopic,
          marks: sectionMarksMap.get(q.syllabusTopic) ?? null,
          questions: [],
          subtopics: new Map(),
          trends: new Map(),
          mastered: 0
        };
        sectionMap.set(q.syllabusTopic, entry);
      }
      entry.questions.push(q);
      if (isMast) entry.mastered += 1;
      entry.subtopics.set(q.syllabusSubtopic, (entry.subtopics.get(q.syllabusSubtopic) ?? 0) + 1);
      entry.trends.set(q.bpscTrendTag, (entry.trends.get(q.bpscTrendTag) ?? 0) + 1);
    }

    const syllabusOrder = new Map<string, number>();
    if (syllabus) {
      const matchSubj = syllabus.subjects.find((s) => s.serial === theme.serial);
      matchSubj?.sections.forEach((sec, idx) => syllabusOrder.set(sec.section, idx));
    }

    const sections = Array.from(sectionMap.values())
      .map((s) => ({
        topic: s.topic,
        marks: s.marks,
        count: s.questions.length,
        sharePct: list.length ? Math.round((s.questions.length / list.length) * 100) : 0,
        mastered: s.mastered,
        subtopics: Array.from(s.subtopics.entries()).sort((a, b) => b[1] - a[1]),
        topTrends: Array.from(s.trends.entries())
          .filter(([, c]) => c >= 2)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
      }))
      .sort((a, b) => {
        const oa = syllabusOrder.get(a.topic);
        const ob = syllabusOrder.get(b.topic);
        if (oa !== undefined && ob !== undefined) return oa - ob;
        return b.count - a.count;
      });

    return {
      subject: selectedSubject,
      theme,
      total: list.length,
      exams,
      mastered: subjectMastered,
      masteryPct: list.length ? Math.round((subjectMastered / list.length) * 100) : 0,
      eraBuckets,
      sections
    };
  }, [selectedSubject, officialQuestions, mastery, sectionMarksMap, syllabus]);

  // =========================================================================
  // TAB 3: INTERACTIVE DATA EXPLORER & BPSC RECURRING TRENDS MATRIX
  // =========================================================================
  const explorerDropdowns = useMemo(() => {
    const tomos = Array.from(new Set(officialQuestions.map((q) => q.bcsBatch))).sort(
      (a, b) => parseInt(b, 10) - parseInt(a, 10)
    );
    const topicsPool =
      expSubject === 'All'
        ? officialQuestions
        : officialQuestions.filter((q) => q.subject === expSubject);
    const topics = Array.from(new Set(topicsPool.map((q) => q.syllabusTopic))).sort();
    const types = countByKey(topicsPool, (q) => q.questionType)
      .slice(0, 40)
      .map(([t]) => t);
    return { tomos, topics, types };
  }, [officialQuestions, expSubject]);

  const explorerFiltered = useMemo(() => {
    const qLower = trendSearch.trim().toLowerCase();
    return officialQuestions.filter((q) => {
      if (expTomo !== 'All' && q.bcsBatch !== expTomo) return false;
      if (expSubject !== 'All' && q.subject !== expSubject) return false;
      if (expTopic !== 'All' && q.syllabusTopic !== expTopic) return false;
      if (expType !== 'All' && q.questionType !== expType) return false;
      if (qLower) {
        const hay = `${q.bpscTrendTag} ${q.syllabusTopic} ${q.syllabusSubtopic} ${q.question} ${q.questionType}`.toLowerCase();
        if (!hay.includes(qLower)) return false;
      }
      return true;
    });
  }, [officialQuestions, expTomo, expSubject, expTopic, expType, trendSearch]);

  const explorerCharts = useMemo(() => {
    return {
      bySubject: countByKey(explorerFiltered, (q) => q.subject).slice(0, 10),
      bySection: countByKey(explorerFiltered, (q) => q.syllabusTopic).slice(0, 10),
      byTrend: countByKey(explorerFiltered, (q) => q.bpscTrendTag).slice(0, 10)
    };
  }, [explorerFiltered]);

  const trendCards = useMemo(() => {
    const map = new Map<
      string,
      {
        tag: string;
        count: number;
        recentCount: number;
        latestEdition: number;
        exams: Set<string>;
        subjectCounts: Map<string, number>;
      }
    >();

    for (const q of explorerFiltered) {
      let rec = map.get(q.bpscTrendTag);
      if (!rec) {
        rec = {
          tag: q.bpscTrendTag,
          count: 0,
          recentCount: 0,
          latestEdition: 0,
          exams: new Set(),
          subjectCounts: new Map()
        };
        map.set(q.bpscTrendTag, rec);
      }
      rec.count += 1;
      const ed = editionNum(q.rawEdition);
      if (ed >= 41) rec.recentCount += 1;
      if (ed > rec.latestEdition) rec.latestEdition = ed;
      rec.exams.add(q.bcsBatch);
      rec.subjectCounts.set(q.subject, (rec.subjectCounts.get(q.subject) ?? 0) + 1);
    }

    return Array.from(map.values())
      .filter((t) => t.count >= trendMinCount)
      .map((t) => {
        const primarySubject =
          Array.from(t.subjectCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || 'General';
        return {
          tag: t.tag,
          count: t.count,
          recentCount: t.recentCount,
          latestEdition: t.latestEdition,
          examSpread: t.exams.size,
          primarySubject
        };
      })
      .sort((a, b) =>
        trendSort === 'recent'
          ? b.recentCount - a.recentCount || b.count - a.count
          : b.count - a.count
      )
      .slice(0, 60);
  }, [explorerFiltered, trendMinCount, trendSort]);

  // =========================================================================
  // TAB 4: SPECIAL CADRE & EXTRA TOPICS
  // =========================================================================
  const extraTopicCards = useMemo(() => {
    const map = new Map<string, { topic: string; subject: string; count: number; exams: Set<string> }>();
    for (const q of extraQuestions) {
      let rec = map.get(q.syllabusTopic);
      if (!rec) {
        rec = { topic: q.syllabusTopic, subject: q.subject, count: 0, exams: new Set() };
        map.set(q.syllabusTopic, rec);
      }
      rec.count += 1;
      rec.exams.add(q.bcsBatch);
    }
    const qLower = extraSearch.trim().toLowerCase();
    return Array.from(map.values())
      .filter(
        (x) =>
          !qLower ||
          x.topic.toLowerCase().includes(qLower) ||
          x.subject.toLowerCase().includes(qLower)
      )
      .sort((a, b) => b.count - a.count);
  }, [extraQuestions, extraSearch]);

  // =========================================================================
  // LEVEL 3: FOCUSED PRACTICE WORKSPACE
  // =========================================================================
  const focusBaseQuestions = useMemo(() => {
    if (!focus) return [];
    return questions.filter((q) => {
      if (focus.kind === 'subject') return !q.isExtraTopic && q.subject === focus.subject;
      if (focus.kind === 'topic') {
        return !q.isExtraTopic && q.subject === focus.subject && q.syllabusTopic === focus.topic;
      }
      if (focus.kind === 'trend') return !q.isExtraTopic && q.bpscTrendTag === focus.trend;
      if (focus.kind === 'extra-topic') return q.isExtraTopic && q.syllabusTopic === focus.topic;
      return false;
    });
  }, [questions, focus]);

  const focusSubtopics = useMemo(() => {
    if (!focus || focus.kind !== 'topic') return [];
    const counts = new Map<string, number>();
    for (const q of focusBaseQuestions) {
      counts.set(q.syllabusSubtopic, (counts.get(q.syllabusSubtopic) ?? 0) + 1);
    }
    const list = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
    return list.length > 1 ? list : [];
  }, [focus, focusBaseQuestions]);

  const focusFilteredQuestions = useMemo(() => {
    const qLower = focusSearch.trim().toLowerCase();
    return focusBaseQuestions.filter((q) => {
      if (activeSubtopic !== 'All' && q.syllabusSubtopic !== activeSubtopic) return false;
      if (!matchesEra(q.rawEdition, eraFilter)) return false;
      if (qLower) {
        const hay =
          `${q.question} ${q.options.join(' ')} ${q.explanation} ${q.syllabusSubtopic} ${q.bpscTrendTag} ${q.bcsBatch}`.toLowerCase();
        if (!hay.includes(qLower)) return false;
      }
      return true;
    });
  }, [focusBaseQuestions, activeSubtopic, eraFilter, focusSearch]);

  const focusMastery = useMemo(() => {
    let mastered = 0;
    for (const q of focusFilteredQuestions) {
      if (mastery[q.id] === 1) mastered += 1;
    }
    return {
      mastered,
      total: focusFilteredQuestions.length,
      pct: focusFilteredQuestions.length
        ? Math.round((mastered / focusFilteredQuestions.length) * 100)
        : 0
    };
  }, [focusFilteredQuestions, mastery]);

  const totalPages = Math.max(1, Math.ceil(focusFilteredQuestions.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const focusPageItems = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return focusFilteredQuestions.slice(start, start + PAGE_SIZE);
  }, [focusFilteredQuestions, safePage]);

  const openFocus = (target: FocusTarget, initialSubtopic = 'All') => {
    setFocus(target);
    setActiveSubtopic(initialSubtopic);
    setEraFilter('all');
    setFocusSearch('');
    setPage(1);
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleTabSwitch = (tab: MainTab) => {
    setActiveTab(tab);
    setFocus(null);
    if (tab !== 'syllabus') setSelectedSubject(null);
    setPage(1);
  };

  const handlePickAnswer = (q: BCSQuestionRecord, idx: number) => {
    setPickedAnswers((prev) => ({ ...prev, [q.id]: idx }));
    if (q.correctIndex !== null) {
      setMastery(saveMasteryAnswer(q.id, idx === q.correctIndex));
    }
  };

  const toggleSectionCollapse = (secKey: string) => {
    setCollapsedSections((prev) => ({ ...prev, [secKey]: !prev[secKey] }));
  };

  const renderTierBadge = (tier: 'S' | 'A' | 'B') => {
    if (tier === 'S') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500/25 via-yellow-500/20 to-orange-500/25 border border-amber-400/60 text-amber-800 dark:text-amber-200 font-royal font-bold text-[10px] tracking-wider uppercase">
          <Crown className="w-3 h-3 text-amber-500 dark:text-amber-300" />
          <span>S-Tier Must Study</span>
        </span>
      );
    }
    if (tier === 'A') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-violet-500/18 border border-violet-400/45 text-violet-800 dark:text-violet-200 font-rounded font-bold text-[10px]">
          <Flame className="w-3 h-3 text-violet-500 dark:text-violet-300" />
          <span>A-Tier High Yield</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-500/15 border border-sky-400/35 text-sky-800 dark:text-sky-200 font-rounded font-bold text-[10px]">
        <span>B-Tier Core</span>
      </span>
    );
  };

  const renderMomentumBadge = (m: 'surging' | 'evergreen' | 'steady') => {
    if (m === 'surging') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/15 border border-rose-400/35 text-rose-700 dark:text-rose-300 font-rounded font-bold text-[10px]">
          <Zap className="w-3 h-3" />
          <span>41–50th Surging</span>
        </span>
      );
    }
    if (m === 'evergreen') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-400/35 text-emerald-700 dark:text-emerald-300 font-rounded font-bold text-[10px]">
          <Sparkles className="w-3 h-3" />
          <span>Evergreen Favorite</span>
        </span>
      );
    }
    return null;
  };

  return (
    <div
      ref={topRef}
      className="relative section-card-tm rounded-[2.1rem] sm:rounded-[2.6rem] p-4 sm:p-7 lg:p-8 space-y-5 overflow-hidden"
    >
      {/* Royal Gold Shimmer Top Accent */}
      <div className="royal-shimmer-beam" aria-hidden="true" />

      {/* ====================================================================
          ROYAL DASHBOARD HEADER & LIVE STATUS TELEMETRY
         ==================================================================== */}
      <div className="relative z-10 flex flex-col lg:flex-row items-center gap-5 pb-4 border-b border-amber-400/25">
        <div className="relative shrink-0">
          <div className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-tr from-amber-400/30 to-violet-500/25 blur-xl scale-110" />
          <RoyalAstrolabe3DEmblem className="relative w-24 h-24 sm:w-28 sm:h-28 animate-float-gentle drop-shadow-[0_14px_24px_rgba(245,158,11,0.32)]" />
        </div>

        <div className="text-center lg:text-left space-y-2 flex-1 min-w-0">
          <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500/20 via-yellow-500/15 to-violet-500/20 border border-amber-400/50 text-amber-800 dark:text-amber-200 font-royal font-bold text-[10px] sm:text-[11px] tracking-[0.12em] uppercase">
              <Crown className="w-3.5 h-3.5 text-amber-500 dark:text-amber-300" />
              <span>Royal Topic Master • OKZ Data Intelligence</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/40 text-emerald-800 dark:text-emerald-200 font-rounded font-bold text-[11px]">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Dashboard Status: Live &amp; Indexed</span>
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-rounded font-extrabold tracking-tight">
            <span className="bg-gradient-to-r from-amber-600 via-yellow-600 to-violet-700 dark:from-amber-200 dark:via-yellow-300 dark:to-violet-200 bg-clip-text text-transparent">
              Zihad&apos;s Topic Selection &amp; Priority Engine
            </span>
          </h1>
          <p className="theme-text-secondary font-bangla text-xs sm:text-sm max-w-3xl leading-relaxed">
            ১০ম–৫০তম বিসিএস-এর {dashboardStats.totalAll.toLocaleString()}টি প্রশ্ন বিশ্লেষণ করে অধ্যায় ও সাব-টপিক অনুযায়ী ফ্রিকোয়েন্সি, সাম্প্রতিক ট্রেন্ড ও গুরুত্বপূর্ণ টপিক বাছাই করুন
          </p>
        </div>
      </div>

      {/* LIVE 5-METRIC ROYAL STATUS BAR */}
      {!loading && !error && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          <div className="p-3.5 rounded-2xl theme-subcard border border-amber-400/30">
            <div className="text-[10px] font-rounded font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
              Questions Analyzed
            </div>
            <div className="text-xl sm:text-2xl font-rounded font-extrabold theme-text-primary mt-0.5">
              {dashboardStats.totalAll.toLocaleString()}
            </div>
            <div className="text-[11px] font-rounded theme-text-muted">
              {dashboardStats.examCount} BCS Editions (10–50th)
            </div>
          </div>

          <div className="p-3.5 rounded-2xl theme-subcard border border-indigo-400/30">
            <div className="text-[10px] font-rounded font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
              Official Syllabus
            </div>
            <div className="text-xl sm:text-2xl font-rounded font-extrabold theme-text-primary mt-0.5">
              {dashboardStats.unitCount} Units
            </div>
            <div className="text-[11px] font-rounded theme-text-muted">
              10 Subjects • 200 Marks
            </div>
          </div>

          <div className="p-3.5 rounded-2xl theme-subcard border border-amber-400/40 bg-gradient-to-br from-amber-500/10 to-transparent">
            <div className="text-[10px] font-rounded font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
              S-Tier Must-Study
            </div>
            <div className="text-xl sm:text-2xl font-rounded font-extrabold theme-text-primary mt-0.5">
              {paretoInsight.sCount} Topics
            </div>
            <div className="text-[11px] font-rounded text-amber-700 dark:text-amber-300 font-semibold">
              Covers {paretoInsight.sCoveragePct}% of all Qs
            </div>
          </div>

          <div className="p-3.5 rounded-2xl theme-subcard border border-rose-400/30">
            <div className="text-[10px] font-rounded font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300">
              41st–50th Modern Era
            </div>
            <div className="text-xl sm:text-2xl font-rounded font-extrabold theme-text-primary mt-0.5">
              {dashboardStats.recentCount.toLocaleString()}
            </div>
            <div className="text-[11px] font-rounded theme-text-muted">
              High-signal recent MCQs
            </div>
          </div>

          <div className="col-span-2 sm:col-span-1 p-3.5 rounded-2xl theme-subcard border border-emerald-400/30">
            <div className="flex items-center justify-between text-[10px] font-rounded font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
              <span>Your Mastery</span>
              <span>{dashboardStats.masteryPct}%</span>
            </div>
            <div className="text-xl sm:text-2xl font-rounded font-extrabold theme-text-primary mt-0.5">
              {dashboardStats.correct.toLocaleString()} Qs
            </div>
            <div className="mt-1.5 h-1.5 rounded-full bg-slate-400/20 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300"
                style={{ width: `${Math.max(4, dashboardStats.masteryPct)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          4-TAB ROYAL NAVIGATION BAR
         ==================================================================== */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1.5 rounded-2xl theme-subcard border border-amber-400/25">
        {(
          [
            {
              id: 'priority' as const,
              label: 'Priority Ranker',
              badge: `${paretoInsight.sCount} S-Tier`,
              icon: <Crown className="w-3.5 h-3.5 shrink-0" />
            },
            {
              id: 'syllabus' as const,
              label: 'Syllabus Tree',
              badge: '10 Subj',
              icon: <Layers className="w-3.5 h-3.5 shrink-0" />
            },
            {
              id: 'trends' as const,
              label: 'Data & Trends',
              badge: 'Matrix',
              icon: <BarChart3 className="w-3.5 h-3.5 shrink-0" />
            },
            {
              id: 'extra' as const,
              label: 'Special Cadre',
              badge: `${extraQuestions.length}`,
              icon: <Stethoscope className="w-3.5 h-3.5 shrink-0" />
            }
          ] as const
        ).map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabSwitch(tab.id)}
              className={`py-2.5 px-2.5 sm:px-3.5 rounded-xl font-rounded font-bold text-xs sm:text-sm transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                active
                  ? tab.id === 'priority'
                    ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-violet-600 text-white shadow-md'
                    : 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md'
                  : 'theme-text-secondary hover:theme-text-primary'
              }`}
            >
              {tab.icon}
              <span className="truncate">{tab.label}</span>
              <span
                className={`hidden md:inline-block px-1.5 py-0.5 rounded-md text-[10px] ${
                  active ? 'bg-white/20 text-white' : 'bg-indigo-500/12 theme-text-muted'
                }`}
              >
                {tab.badge}
              </span>
            </button>
          );
        })}
      </div>

      {/* Loading / Error */}
      {loading && (
        <div className="p-10 rounded-3xl theme-subcard text-center font-rounded font-bold theme-text-secondary">
          Initializing Royal Topic Master &amp; indexing 5,655 BCS questions...
        </div>
      )}

      {error && (
        <div className="p-6 rounded-3xl bg-rose-500/15 border border-rose-400/40 text-rose-800 dark:text-rose-200 font-rounded font-bold text-sm">
          {error}
        </div>
      )}

      {/* ====================================================================
          LEVEL 3: FOCUSED PRACTICE & STUDY WORKSPACE
         ==================================================================== */}
      {!loading && !error && focus && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setFocus(null)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl theme-subcard font-rounded font-bold text-xs sm:text-sm theme-text-primary hover:scale-[1.02] transition-transform cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-amber-500" />
              <span>
                {activeTab === 'priority'
                  ? 'Back to Priority Ranker'
                  : focus.kind === 'trend'
                  ? 'Back to Data & Trends'
                  : focus.kind === 'extra-topic'
                  ? 'Back to Special Cadre'
                  : selectedSubject
                  ? `Back to ${getSubjectTheme(selectedSubject).shortEn}`
                  : 'Back to Syllabus Tree'}
              </span>
            </button>

            <span className="font-rounded font-bold text-xs theme-text-secondary">
              {focusFilteredQuestions.length.toLocaleString()} questions • Mastered{' '}
              <span className="text-emerald-600 dark:text-emerald-400">{focusMastery.pct}%</span>
            </span>
          </div>

          {/* Topic Focus Card */}
          <div className="p-4 sm:p-5 rounded-3xl theme-subcard border border-amber-400/25 space-y-3.5">
            <div className="space-y-1">
              {focus.subtitle && (
                <span className="inline-block text-[11px] font-rounded font-bold uppercase tracking-wider text-amber-600 dark:text-amber-300">
                  {focus.subtitle}
                </span>
              )}
              <h2 className="text-lg sm:text-xl font-bangla font-bold theme-text-primary leading-snug">
                {focus.title}
              </h2>
            </div>

            {/* Mastery Bar */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs font-rounded font-semibold theme-text-muted">
                <span>Topic Mastery Progress</span>
                <span className="text-emerald-600 dark:text-emerald-300 font-bold">
                  {focusMastery.mastered} / {focusMastery.total} ({focusMastery.pct}%)
                </span>
              </div>
              <div className="h-2 rounded-full bg-slate-400/20 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-500 via-emerald-500 to-teal-400 transition-all duration-300"
                  style={{ width: `${focusMastery.pct}%` }}
                />
              </div>
            </div>

            {/* Official Subtopic Filter Chips */}
            {focusSubtopics.length > 0 && (
              <div className="space-y-1.5 pt-1 border-t border-slate-300/35 dark:border-slate-700/45">
                <span className="block text-[11px] font-rounded font-bold uppercase tracking-wider theme-text-muted">
                  Official Subsections
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveSubtopic('All');
                      setPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-xl font-rounded font-bold text-xs cursor-pointer transition-all ${
                      activeSubtopic === 'All'
                        ? 'bg-gradient-to-r from-amber-500 to-violet-600 text-white shadow-xs'
                        : 'bg-white/65 dark:bg-slate-900/55 theme-text-secondary hover:theme-text-primary'
                    }`}
                  >
                    All ({focusBaseQuestions.length})
                  </button>
                  {focusSubtopics.map(([st, cnt]) => {
                    const active = activeSubtopic === st;
                    return (
                      <button
                        key={st}
                        type="button"
                        onClick={() => {
                          setActiveSubtopic(active ? 'All' : st);
                          setPage(1);
                        }}
                        className={`px-3 py-1.5 rounded-xl font-bangla font-semibold text-xs text-left cursor-pointer transition-all ${
                          active
                            ? 'bg-gradient-to-r from-amber-500 to-violet-600 text-white shadow-xs'
                            : 'bg-white/65 dark:bg-slate-900/55 theme-text-secondary hover:theme-text-primary'
                        }`}
                      >
                        {st.length > 56 ? `${st.slice(0, 55)}…` : st}{' '}
                        <span className="opacity-75">({cnt})</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Era filter + Search + Quiz/Study Mode */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-1">
              <div className="relative flex-1">
                <Search className="w-4 h-4 theme-text-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={focusSearch}
                  onChange={(e) => {
                    setFocusSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="এই টপিকের প্রশ্ন খুঁজুন..."
                  className="w-full pl-10 pr-4 py-2 rounded-2xl bg-white/80 dark:bg-slate-900/75 border border-slate-300/60 dark:border-slate-700/70 font-bangla text-sm theme-text-primary focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-2 flex-wrap">
                <div className="inline-flex rounded-xl p-0.5 bg-white/70 dark:bg-slate-900/65 border border-slate-300/60 dark:border-slate-700/60">
                  {(
                    [
                      { id: 'all', label: 'All' },
                      { id: 'recent', label: '41–50th' },
                      { id: 'mid', label: '31–40th' },
                      { id: 'classic', label: '10–30th' }
                    ] as const
                  ).map((era) => (
                    <button
                      key={era.id}
                      type="button"
                      onClick={() => {
                        setEraFilter(era.id);
                        setPage(1);
                      }}
                      className={`px-2.5 py-1 rounded-lg font-rounded font-bold text-[11px] cursor-pointer transition-all ${
                        eraFilter === era.id
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'theme-text-secondary hover:theme-text-primary'
                      }`}
                    >
                      {era.label}
                    </button>
                  ))}
                </div>

                <div className="inline-flex rounded-xl p-0.5 bg-white/70 dark:bg-slate-900/65 border border-slate-300/60 dark:border-slate-700/60">
                  <button
                    type="button"
                    onClick={() => setStudyMode(false)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-rounded font-bold text-[11px] cursor-pointer ${
                      !studyMode ? 'bg-indigo-600 text-white' : 'theme-text-secondary'
                    }`}
                  >
                    <GraduationCap className="w-3 h-3" />
                    <span>Quiz</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setStudyMode(true)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-rounded font-bold text-[11px] cursor-pointer ${
                      studyMode ? 'bg-emerald-600 text-white' : 'theme-text-secondary'
                    }`}
                  >
                    <BookOpenCheck className="w-3 h-3" />
                    <span>Study</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Question Cards */}
          {focusPageItems.length === 0 ? (
            <div className="p-8 rounded-3xl theme-subcard text-center font-rounded text-sm theme-text-secondary">
              No questions match this filter combination. Try switching to “All” eras.
            </div>
          ) : (
            <div className="space-y-4">
              {focusPageItems.map((q) => {
                const picked = pickedAnswers[q.id];
                const isPicked = picked !== undefined;
                const reveal = studyMode || isPicked || Boolean(expandedCards[q.id]);
                return (
                  <article
                    key={q.id}
                    className="p-4 sm:p-6 rounded-3xl theme-subcard space-y-3.5 shadow-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-rounded font-bold text-xs">
                          {q.bcsBatch}
                          {q.questionNumber ? ` • Q${q.questionNumber}` : ''}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            openFocus({
                              kind: 'trend',
                              title: q.bpscTrendTag,
                              subtitle: `BPSC Recurring Trend (${q.sameTypeCount}x)`,
                              trend: q.bpscTrendTag
                            })
                          }
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-400/40 text-emerald-800 dark:text-emerald-200 font-rounded font-bold text-[11px] hover:bg-emerald-500/25 cursor-pointer"
                        >
                          <TrendingUp className="w-3 h-3" />
                          <span>
                            {q.bpscTrendTag} ({q.sameTypeCount}x)
                          </span>
                        </button>
                      </div>

                      {!studyMode && (
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedCards((prev) => ({ ...prev, [q.id]: !prev[q.id] }))
                          }
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-500/15 text-amber-800 dark:text-amber-200 font-rounded font-bold text-xs cursor-pointer hover:bg-amber-500/25"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>{reveal ? 'Hide' : 'Answer'}</span>
                        </button>
                      )}
                    </div>

                    <h3 className="font-bangla font-bold text-base sm:text-lg theme-text-primary leading-relaxed">
                      {q.question}
                    </h3>

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

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {q.options.map((opt, idx) => {
                        const isThisPicked = picked === idx;
                        const isCorrectOpt = q.correctIndex === idx;
                        let cardCls =
                          'bg-white/75 dark:bg-slate-900/65 border-slate-300/60 dark:border-slate-700/70 theme-text-primary hover:border-amber-400';
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
                            onClick={() => handlePickAnswer(q, idx)}
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

                    {reveal && (
                      <div className="p-3.5 sm:p-4 rounded-2xl bg-indigo-500/10 border border-indigo-400/30 text-xs sm:text-sm theme-text-secondary leading-relaxed space-y-2">
                        {q.correctIndex === null && q.correctAnswerRaw && (
                          <div className="font-bangla font-bold text-emerald-700 dark:text-emerald-300">
                            উত্তর: {q.correctAnswerRaw}
                          </div>
                        )}
                        <div className="font-bangla text-xs">
                          <span className="font-rounded font-bold theme-text-primary">
                            Official Subsection:{' '}
                          </span>
                          <span>{q.syllabusSubtopic}</span>
                        </div>
                        {q.fitReason && (
                          <div className="flex items-start gap-1.5 font-rounded text-xs theme-text-muted">
                            <Info className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                            <span>{q.fitReason}</span>
                          </div>
                        )}
                        {q.explanation && (
                          <div className="pt-2 border-t border-indigo-400/20 font-bangla theme-text-primary/90 whitespace-pre-line">
                            {q.explanation}
                          </div>
                        )}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setPage((p) => Math.max(1, p - 1));
                  topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                disabled={safePage <= 1}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl theme-subcard font-rounded font-bold text-xs sm:text-sm theme-text-primary disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>
              <span className="font-rounded font-bold text-xs sm:text-sm theme-text-secondary">
                Page {safePage} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => {
                  setPage((p) => Math.min(totalPages, p + 1));
                  topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                disabled={safePage >= totalPages}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-violet-600 text-white font-rounded font-bold text-xs sm:text-sm shadow-md disabled:opacity-40 cursor-pointer"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ====================================================================
          TAB 1: ROYAL PRIORITY STUDY ENGINE ("MOST IMPORTANT TOPICS TO STUDY")
         ==================================================================== */}
      {!loading && !error && !focus && activeTab === 'priority' && (
        <div className="space-y-4">
          {/* Pareto 80/20 Strategic Intelligence Banner */}
          <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-amber-500/16 via-violet-500/14 to-indigo-500/16 border border-amber-400/45 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 via-orange-500 to-violet-600 text-white flex items-center justify-center shrink-0 shadow-md">
                <Target className="w-5 h-5" />
              </span>
              <div className="space-y-0.5">
                <div className="text-xs font-royal font-bold uppercase tracking-wider text-amber-800 dark:text-amber-200">
                  80/20 Smart Study Intelligence
                </div>
                <p className="font-rounded text-xs sm:text-sm theme-text-primary font-semibold leading-snug">
                  Mastering just the top{' '}
                  <strong className="text-amber-600 dark:text-amber-300">
                    {paretoInsight.sCount} S-Tier subsections
                  </strong>{' '}
                  covers{' '}
                  <strong className="text-emerald-600 dark:text-emerald-300">
                    {paretoInsight.sCoveragePct}%
                  </strong>{' '}
                  of all historical BCS questions ({paretoInsight.sQuestions.toLocaleString()} MCQs) and{' '}
                  <strong className="text-violet-600 dark:text-violet-300">
                    {paretoInsight.sRecentCoveragePct}%
                  </strong>{' '}
                  of modern 41st–50th BCS papers!
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setPrioTier(prioTier === 'S' ? 'all' : 'S')}
              className="shrink-0 px-4 py-2 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-rounded font-bold text-xs shadow-md hover:scale-[1.03] active:scale-95 transition-transform cursor-pointer"
            >
              {prioTier === 'S' ? 'Show All Tiers' : 'Filter S-Tier Only'}
            </button>
          </div>

          {/* Priority Control Deck */}
          <div className="p-4 rounded-3xl theme-subcard space-y-3">
            {/* Subject Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
              <button
                type="button"
                onClick={() => setPrioSubject('All')}
                className={`shrink-0 px-3 py-1.5 rounded-xl font-rounded font-bold text-xs cursor-pointer transition-all ${
                  prioSubject === 'All'
                    ? 'bg-gradient-to-r from-amber-500 to-violet-600 text-white shadow-xs'
                    : 'bg-white/65 dark:bg-slate-900/55 theme-text-secondary hover:theme-text-primary'
                }`}
              >
                All 10 Subjects
              </button>
              {subjectCards.map((sc) => (
                <button
                  key={sc.subject}
                  type="button"
                  onClick={() => setPrioSubject(sc.subject)}
                  className={`shrink-0 px-3 py-1.5 rounded-xl font-rounded font-bold text-xs cursor-pointer transition-all ${
                    prioSubject === sc.subject
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-white/65 dark:bg-slate-900/55 theme-text-secondary hover:theme-text-primary'
                  }`}
                >
                  {sc.theme.shortEn}
                </button>
              ))}
            </div>

            {/* Search + Tier + Sort + Group/Rank View Switch */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-2.5">
              <div className="relative flex-1">
                <Search className="w-4 h-4 theme-text-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={prioSearch}
                  onChange={(e) => setPrioSearch(e.target.value)}
                  placeholder="Search section, subsection, or trend (e.g. সংবিধান, Grammar, মুক্তিযুদ্ধ)..."
                  className="w-full pl-10 pr-4 py-2 rounded-2xl bg-white/80 dark:bg-slate-900/75 border border-slate-300/60 dark:border-slate-700/70 font-bangla text-sm theme-text-primary focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Tier filter */}
                <div className="inline-flex rounded-xl p-0.5 bg-white/70 dark:bg-slate-900/65 border border-slate-300/60 dark:border-slate-700/60">
                  {(
                    [
                      { id: 'all', label: 'All' },
                      { id: 'S', label: 'S-Tier' },
                      { id: 'A', label: 'A-Tier' },
                      { id: 'B', label: 'B-Tier' }
                    ] as const
                  ).map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setPrioTier(t.id)}
                      className={`px-2.5 py-1 rounded-lg font-rounded font-bold text-[11px] cursor-pointer ${
                        prioTier === t.id
                          ? 'bg-amber-500 text-white'
                          : 'theme-text-secondary hover:theme-text-primary'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                {/* Sort selector */}
                <select
                  value={prioSort}
                  onChange={(e) => setPrioSort(e.target.value as PrioritySort)}
                  aria-label="Sort priority topics"
                  className="px-3 py-1.5 rounded-xl bg-white/80 dark:bg-slate-900/75 border border-slate-300/60 dark:border-slate-700/70 font-rounded font-bold text-xs theme-text-primary focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer"
                >
                  <option value="score">Sort: Royal Priority Score</option>
                  <option value="frequency">Sort: Most Asked (All BCS)</option>
                  <option value="recent">Sort: 41st–50th Hot Surge</option>
                  <option value="consistency">Sort: Exam Consistency</option>
                  <option value="unmastered">Sort: Unmastered First</option>
                </select>

                {/* Grouping vs Flat Rank toggle */}
                <div className="inline-flex rounded-xl p-0.5 bg-white/70 dark:bg-slate-900/65 border border-slate-300/60 dark:border-slate-700/60">
                  <button
                    type="button"
                    onClick={() => setPrioViewMode('grouped')}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-rounded font-bold text-[11px] cursor-pointer ${
                      prioViewMode === 'grouped' ? 'bg-indigo-600 text-white' : 'theme-text-secondary'
                    }`}
                  >
                    <LayoutGrid className="w-3 h-3" />
                    <span>Sections</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrioViewMode('ranked')}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-rounded font-bold text-[11px] cursor-pointer ${
                      prioViewMode === 'ranked' ? 'bg-indigo-600 text-white' : 'theme-text-secondary'
                    }`}
                  >
                    <ListOrdered className="w-3 h-3" />
                    <span>Ranked</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* VIEW A: GROUPED UNDER SECTIONS & SUBSECTIONS */}
          {prioViewMode === 'grouped' ? (
            groupedPrioritySections.length === 0 ? (
              <div className="p-8 rounded-3xl theme-subcard text-center font-rounded text-sm theme-text-secondary">
                No syllabus sections match these filters.
              </div>
            ) : (
              <div className="space-y-3.5">
                {groupedPrioritySections.map((group) => {
                  const theme = getSubjectTheme(group.subject);
                  const isCollapsed = Boolean(collapsedSections[group.secKey]);
                  const secMasteryPct = group.totalCount
                    ? Math.round((group.mastered / group.totalCount) * 100)
                    : 0;
                  return (
                    <div
                      key={group.secKey}
                      className="rounded-3xl theme-subcard border border-amber-400/20 overflow-hidden shadow-sm"
                    >
                      {/* Section Header */}
                      <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-indigo-500/8 via-transparent to-amber-500/8">
                        <div className="space-y-1.5 min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span
                              className={`px-2.5 py-0.5 rounded-full border font-rounded font-bold text-[10px] ${theme.badgeBg}`}
                            >
                              {theme.shortEn}
                            </span>
                            {group.marks !== null && (
                              <span className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-400/40 text-amber-800 dark:text-amber-200 font-rounded font-bold text-[10px]">
                                {group.marks} Marks
                              </span>
                            )}
                            <span className="px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-700 dark:text-indigo-200 font-rounded font-bold text-[10px]">
                              {group.totalCount} Qs • {group.recentCount} recent
                            </span>
                            {group.sCount > 0 && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-200 font-rounded font-bold text-[10px]">
                                <Crown className="w-2.5 h-2.5" />
                                {group.sCount} S-Tier
                              </span>
                            )}
                          </div>
                          <h3 className="font-bangla font-bold text-base sm:text-lg theme-text-primary leading-snug">
                            {group.topic}
                          </h3>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <div className="px-3 py-1.5 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-amber-400/35 text-center">
                            <div className="text-[9px] font-rounded font-bold uppercase tracking-wider theme-text-muted">
                              Peak Score
                            </div>
                            <div className="text-sm font-rounded font-extrabold text-amber-600 dark:text-amber-300">
                              {group.maxScore}/100
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              openFocus({
                                kind: 'topic',
                                title: group.topic,
                                subtitle: `${theme.nameBn} • Full Section`,
                                subject: group.subject,
                                topic: group.topic
                              })
                            }
                            className="inline-flex items-center gap-1 px-3.5 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-rounded font-bold text-xs shadow-sm hover:scale-[1.02] cursor-pointer"
                          >
                            <span>Drill ({group.totalCount})</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => toggleSectionCollapse(group.secKey)}
                            aria-label={isCollapsed ? 'Expand subsections' : 'Collapse subsections'}
                            className="p-2.5 rounded-2xl bg-white/65 dark:bg-slate-900/60 theme-text-secondary hover:theme-text-primary cursor-pointer"
                          >
                            {isCollapsed ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronUp className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Subsections Table/Grid */}
                      {!isCollapsed && (
                        <div className="p-3 sm:p-4 pt-2 border-t border-slate-300/25 dark:border-white/10 space-y-2">
                          <div className="flex items-center justify-between text-[11px] font-rounded theme-text-muted px-1">
                            <span>
                              {group.subtopics.length} Ranked Subsection
                              {group.subtopics.length > 1 ? 's' : ''}
                            </span>
                            <span>Section Mastery: {secMasteryPct}%</span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                            {group.subtopics.map((sub) => (
                              <button
                                key={sub.key}
                                type="button"
                                onClick={() =>
                                  openFocus(
                                    {
                                      kind: 'topic',
                                      title: sub.topic,
                                      subtitle: `${theme.nameBn} • Priority Score ${sub.priorityScore}/100`,
                                      subject: sub.subject,
                                      topic: sub.topic,
                                      subtopic: sub.subtopic
                                    },
                                    sub.subtopic
                                  )
                                }
                                className="group text-left p-3.5 rounded-2xl bg-white/70 dark:bg-slate-950/60 border border-slate-300/45 dark:border-white/10 hover:border-amber-400/70 transition-all cursor-pointer space-y-2"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    {renderTierBadge(sub.tier)}
                                    {renderMomentumBadge(sub.momentum)}
                                  </div>
                                  <span className="shrink-0 font-rounded font-extrabold text-xs px-2 py-0.5 rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-300">
                                    {sub.priorityScore} pts
                                  </span>
                                </div>

                                <h4 className="font-bangla font-bold text-sm theme-text-primary leading-snug group-hover:text-amber-700 dark:group-hover:text-amber-200 transition-colors">
                                  {sub.subtopic}
                                </h4>

                                {/* Priority bar */}
                                <div className="h-1.5 rounded-full bg-slate-400/20 overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${
                                      sub.tier === 'S'
                                        ? 'bg-gradient-to-r from-amber-500 via-yellow-400 to-orange-500'
                                        : sub.tier === 'A'
                                        ? 'bg-gradient-to-r from-violet-500 to-indigo-500'
                                        : 'bg-gradient-to-r from-sky-500 to-cyan-400'
                                    }`}
                                    style={{ width: `${sub.priorityScore}%` }}
                                  />
                                </div>

                                <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] font-rounded theme-text-muted">
                                  <span>
                                    <strong className="theme-text-primary">{sub.totalCount}</strong> Qs •{' '}
                                    <strong className="text-rose-600 dark:text-rose-300">
                                      {sub.recentCount}
                                    </strong>{' '}
                                    in 41–50th • {sub.examSpread} exams
                                  </span>
                                  <span className="text-indigo-600 dark:text-amber-300 font-bold group-hover:translate-x-0.5 transition-transform">
                                    Practice →
                                  </span>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            /* VIEW B: FLAT RANKED SUBTOPIC LEADERBOARD (#1 to #89) */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredPrioritySubtopics.map((sub, idx) => {
                const theme = getSubjectTheme(sub.subject);
                return (
                  <button
                    key={sub.key}
                    type="button"
                    onClick={() =>
                      openFocus(
                        {
                          kind: 'topic',
                          title: sub.topic,
                          subtitle: `${theme.nameBn} • Ranked #${idx + 1} (${sub.priorityScore}/100)`,
                          subject: sub.subject,
                          topic: sub.topic,
                          subtopic: sub.subtopic
                        },
                        sub.subtopic
                      )
                    }
                    className="group text-left p-4 rounded-3xl theme-subcard border border-transparent hover:border-amber-400/65 transition-all hover:scale-[1.01] cursor-pointer space-y-2.5 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`w-9 h-9 rounded-xl font-rounded font-extrabold text-xs flex items-center justify-center shrink-0 shadow-sm ${
                            idx < 3
                              ? 'bg-gradient-to-br from-amber-400 to-orange-600 text-white'
                              : 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-200'
                          }`}
                        >
                          #{idx + 1}
                        </span>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                            {renderTierBadge(sub.tier)}
                            <span className="text-[10px] font-rounded font-bold theme-text-muted">
                              {theme.shortEn}
                            </span>
                          </div>
                          <h3 className="font-bangla font-bold text-sm sm:text-base theme-text-primary leading-snug truncate">
                            {sub.subtopic}
                          </h3>
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        <div className="text-base font-rounded font-extrabold text-amber-600 dark:text-amber-300 leading-none">
                          {sub.priorityScore}
                        </div>
                        <div className="text-[9px] font-rounded uppercase theme-text-muted">
                          Score
                        </div>
                      </div>
                    </div>

                    <p className="font-bangla text-xs theme-text-muted truncate">
                      Section: {sub.topic}
                    </p>

                    <div className="h-1.5 rounded-full bg-slate-400/20 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          sub.tier === 'S'
                            ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                            : 'bg-gradient-to-r from-indigo-500 to-violet-500'
                        }`}
                        style={{ width: `${sub.priorityScore}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-rounded font-semibold theme-text-secondary">
                      <span>
                        {sub.totalCount} Qs · {sub.recentCount} recent · {sub.examSpread} exams
                      </span>
                      <span className="text-emerald-600 dark:text-emerald-300 font-bold">
                        {sub.masteryPct}% mastered
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ====================================================================
          TAB 2: SYLLABUS HIERARCHY TREE (10 SUBJECTS -> SECTIONS -> SUBTOPICS)
         ==================================================================== */}
      {!loading && !error && !focus && activeTab === 'syllabus' && !subjectDeepDive && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {subjectCards.map((card) => (
            <button
              key={card.subject}
              type="button"
              onClick={() => {
                setSelectedSubject(card.subject);
                topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className={`group text-left p-5 rounded-3xl theme-subcard border-2 border-transparent ${card.theme.ring} transition-all hover:scale-[1.01] cursor-pointer space-y-3.5 shadow-sm`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${card.theme.gradient} text-white font-rounded font-extrabold text-sm flex items-center justify-center shrink-0 shadow-md`}
                  >
                    {String(card.theme.serial).padStart(2, '0')}
                  </span>
                  <div className="min-w-0">
                    <h2 className="font-bangla font-bold text-base sm:text-lg theme-text-primary leading-snug truncate">
                      {card.theme.nameBn}
                    </h2>
                    <p className="font-rounded font-semibold text-xs theme-text-muted truncate">
                      {card.subject}
                    </p>
                  </div>
                </div>
                <span
                  className={`shrink-0 px-2.5 py-1 rounded-full border font-rounded font-bold text-xs ${card.theme.badgeBg}`}
                >
                  {card.theme.marks} Marks
                </span>
              </div>

              <div className="flex items-center justify-between text-xs font-rounded font-semibold theme-text-secondary">
                <span>
                  <strong className="theme-text-primary">{card.totalQuestions.toLocaleString()}</strong>{' '}
                  Qs • {card.sectionCount} sections • {card.subtopicCount} subsections
                </span>
                <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-300 font-bold group-hover:translate-x-0.5 transition-transform">
                  <span>Deep Dive</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>

              <div className="h-2 rounded-full bg-slate-400/20 overflow-hidden">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${card.theme.barGradient}`}
                  style={{
                    width: `${Math.max(
                      10,
                      Math.round((card.totalQuestions / (subjectCards[0]?.totalQuestions || 1)) * 100)
                    )}%`
                  }}
                />
              </div>

              <div className="flex flex-wrap gap-1.5">
                {card.topTopics.map(([topic, cnt]) => (
                  <span
                    key={topic}
                    className="px-2.5 py-1 rounded-xl bg-white/65 dark:bg-slate-900/55 border border-slate-300/45 dark:border-slate-700/55 font-bangla text-[11px] font-semibold theme-text-secondary"
                  >
                    {topic.length > 28 ? `${topic.slice(0, 27)}…` : topic} · {cnt}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* TAB 2 — LEVEL 2: SUBJECT DEEP-DIVE */}
      {!loading && !error && !focus && activeTab === 'syllabus' && subjectDeepDive && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setSelectedSubject(null)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl theme-subcard font-rounded font-bold text-xs sm:text-sm theme-text-primary hover:scale-[1.02] transition-transform cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-amber-500" />
              <span>All 10 Subjects</span>
            </button>

            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar max-w-full">
              {subjectCards.map((sc) => (
                <button
                  key={sc.subject}
                  type="button"
                  onClick={() => setSelectedSubject(sc.subject)}
                  className={`shrink-0 px-2.5 py-1 rounded-xl font-rounded font-bold text-[11px] cursor-pointer transition-all ${
                    sc.subject === subjectDeepDive.subject
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'theme-subcard theme-text-secondary hover:theme-text-primary'
                  }`}
                >
                  {sc.theme.shortEn}
                </button>
              ))}
            </div>
          </div>

          <div className="p-5 sm:p-6 rounded-3xl theme-subcard space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`px-3 py-0.5 rounded-full border font-rounded font-bold text-xs ${subjectDeepDive.theme.badgeBg}`}
                  >
                    Official Weight: {subjectDeepDive.theme.marks} / 200 Marks
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-500/12 font-rounded font-bold text-xs theme-text-secondary">
                    {subjectDeepDive.total.toLocaleString()} Historical Qs • {subjectDeepDive.exams} Exams
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bangla font-bold theme-text-primary">
                  {subjectDeepDive.theme.nameBn}
                </h2>
                <p className="font-rounded text-xs sm:text-sm theme-text-muted">
                  {subjectDeepDive.subject}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  openFocus({
                    kind: 'subject',
                    title: subjectDeepDive.theme.nameBn,
                    subtitle: `${subjectDeepDive.subject} • All Syllabus Topics`,
                    subject: subjectDeepDive.subject
                  })
                }
                className={`shrink-0 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r ${subjectDeepDive.theme.gradient} text-white font-rounded font-bold text-xs sm:text-sm shadow-md hover:scale-[1.02] active:scale-[0.98] transition-transform cursor-pointer`}
              >
                <BookOpen className="w-4 h-4" />
                <span>Practice All ({subjectDeepDive.total})</span>
              </button>
            </div>

            {/* 4-Era BPSC Evolution Spark Bars */}
            <div className="pt-3 border-t border-slate-300/35 dark:border-slate-700/45 space-y-2">
              <div className="flex items-center justify-between text-xs font-rounded font-bold theme-text-muted">
                <span>BPSC Question Trend Across Eras</span>
                <span>Mastery: {subjectDeepDive.masteryPct}%</span>
              </div>
              <div className="grid grid-cols-4 gap-2 sm:gap-3">
                {subjectDeepDive.eraBuckets.map((b) => {
                  const maxB = Math.max(1, ...subjectDeepDive.eraBuckets.map((x) => x.count));
                  const pct = Math.max(8, Math.round((b.count / maxB) * 100));
                  return (
                    <div
                      key={b.label}
                      className="p-2.5 rounded-2xl bg-white/60 dark:bg-slate-900/50 space-y-1.5"
                    >
                      <div className="flex items-baseline justify-between gap-1">
                        <span className="text-[10px] sm:text-xs font-rounded font-bold theme-text-muted">
                          {b.label}
                        </span>
                        <strong className="text-xs sm:text-sm font-rounded theme-text-primary">
                          {b.count}
                        </strong>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-400/20 overflow-hidden">
                        <div
                          className={`h-full rounded-full bg-gradient-to-r ${subjectDeepDive.theme.barGradient}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="space-y-3.5">
            {subjectDeepDive.sections.map((sec) => (
              <div
                key={sec.topic}
                className="p-4 sm:p-5 rounded-3xl theme-subcard space-y-3.5 shadow-sm"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {sec.marks !== null && (
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-400/40 text-amber-800 dark:text-amber-200 font-rounded font-bold text-[11px]">
                          {sec.marks} Marks
                        </span>
                      )}
                      <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-700 dark:text-indigo-200 font-rounded font-bold text-[11px]">
                        {sec.count} Qs ({sec.sharePct}% of subject)
                      </span>
                      {sec.mastered > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-rounded font-bold text-[11px]">
                          ✓ {sec.mastered} mastered
                        </span>
                      )}
                    </div>
                    <h3 className="font-bangla font-bold text-base sm:text-lg theme-text-primary leading-snug">
                      {sec.topic}
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      openFocus({
                        kind: 'topic',
                        title: sec.topic,
                        subtitle: subjectDeepDive.theme.nameBn,
                        subject: subjectDeepDive.subject,
                        topic: sec.topic
                      })
                    }
                    className="shrink-0 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-rounded font-bold text-xs shadow-sm transition-colors cursor-pointer"
                  >
                    <span>Practice ({sec.count})</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="h-1.5 rounded-full bg-slate-400/20 overflow-hidden">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${subjectDeepDive.theme.barGradient}`}
                    style={{ width: `${Math.max(4, sec.sharePct)}%` }}
                  />
                </div>

                <div className="space-y-1.5">
                  <span className="block text-[11px] font-rounded font-bold uppercase tracking-wider theme-text-muted">
                    Exact Official Subsections
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {sec.subtopics.map(([sub, cnt]) => (
                      <button
                        key={sub}
                        type="button"
                        onClick={() =>
                          openFocus(
                            {
                              kind: 'topic',
                              title: sec.topic,
                              subtitle: subjectDeepDive.theme.nameBn,
                              subject: subjectDeepDive.subject,
                              topic: sec.topic,
                              subtopic: sub
                            },
                            sub
                          )
                        }
                        className="px-3 py-1.5 rounded-xl bg-white/70 dark:bg-slate-900/55 border border-slate-300/55 dark:border-slate-700/60 hover:border-amber-400 font-bangla font-semibold text-xs text-left theme-text-primary transition-colors cursor-pointer"
                      >
                        {sub.length > 74 ? `${sub.slice(0, 73)}…` : sub}{' '}
                        <span className="font-rounded text-indigo-600 dark:text-amber-300 font-bold">
                          ({cnt})
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ====================================================================
          TAB 3: ZIHAD'S INTERACTIVE DATA EXPLORER & BPSC TRENDS MATRIX
         ==================================================================== */}
      {!loading && !error && !focus && activeTab === 'trends' && (
        <div className="space-y-4">
          {/* Multi-Dimensional Filter Matrix */}
          <div className="p-4 sm:p-5 rounded-3xl theme-subcard border border-amber-400/25 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 font-rounded font-bold text-xs sm:text-sm theme-text-primary">
                <Filter className="w-4 h-4 text-amber-500" />
                <span>Multi-Filter Analytics Matrix ({explorerFiltered.length.toLocaleString()} matching Qs)</span>
              </div>
              {(expTomo !== 'All' || expSubject !== 'All' || expTopic !== 'All' || expType !== 'All' || trendSearch) && (
                <button
                  type="button"
                  onClick={() => {
                    setExpTomo('All');
                    setExpSubject('All');
                    setExpTopic('All');
                    setExpType('All');
                    setTrendSearch('');
                  }}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-rose-500/15 text-rose-700 dark:text-rose-300 font-rounded font-bold text-xs cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              <div>
                <label className="block text-[10px] font-rounded font-bold uppercase tracking-wider theme-text-muted mb-1">
                  1. BCS Edition (Tomo)
                </label>
                <select
                  value={expTomo}
                  onChange={(e) => setExpTomo(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white/80 dark:bg-slate-900/75 border border-slate-300/60 dark:border-slate-700/70 font-rounded text-xs font-semibold theme-text-primary"
                >
                  <option value="All">All BCS Exams (10th–50th)</option>
                  {explorerDropdowns.tomos.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-rounded font-bold uppercase tracking-wider theme-text-muted mb-1">
                  2. Official Subject
                </label>
                <select
                  value={expSubject}
                  onChange={(e) => {
                    setExpSubject(e.target.value);
                    setExpTopic('All');
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-white/80 dark:bg-slate-900/75 border border-slate-300/60 dark:border-slate-700/70 font-rounded text-xs font-semibold theme-text-primary"
                >
                  <option value="All">All 10 Official Subjects</option>
                  {subjectCards.map((sc) => (
                    <option key={sc.subject} value={sc.subject}>
                      {sc.theme.shortEn} ({sc.totalQuestions})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-rounded font-bold uppercase tracking-wider theme-text-muted mb-1">
                  3. Official Section
                </label>
                <select
                  value={expTopic}
                  onChange={(e) => setExpTopic(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white/80 dark:bg-slate-900/75 border border-slate-300/60 dark:border-slate-700/70 font-bangla text-xs font-semibold theme-text-primary"
                >
                  <option value="All">All Sections</option>
                  {explorerDropdowns.topics.map((t) => (
                    <option key={t} value={t}>
                      {t.slice(0, 64)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-rounded font-bold uppercase tracking-wider theme-text-muted mb-1">
                  4. Question Pattern
                </label>
                <select
                  value={expType}
                  onChange={(e) => setExpType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white/80 dark:bg-slate-900/75 border border-slate-300/60 dark:border-slate-700/70 font-rounded text-xs font-semibold theme-text-primary"
                >
                  <option value="All">All Question Types</option>
                  {explorerDropdowns.types.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <div className="relative flex-1">
                <Search className="w-4 h-4 theme-text-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={trendSearch}
                  onChange={(e) => setTrendSearch(e.target.value)}
                  placeholder="Search trend, keyword, or question text..."
                  className="w-full pl-10 pr-4 py-2 rounded-2xl bg-white/80 dark:bg-slate-900/75 border border-slate-300/60 dark:border-slate-700/70 font-rounded text-sm theme-text-primary focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <div className="inline-flex rounded-xl p-0.5 bg-white/70 dark:bg-slate-900/65 border border-slate-300/60 dark:border-slate-700/60">
                  {[2, 3, 6, 12].map((minC) => (
                    <button
                      key={minC}
                      type="button"
                      onClick={() => setTrendMinCount(minC)}
                      className={`px-2.5 py-1 rounded-lg font-rounded font-bold text-xs cursor-pointer ${
                        trendMinCount === minC
                          ? 'bg-emerald-600 text-white'
                          : 'theme-text-secondary'
                      }`}
                    >
                      {minC}+
                    </button>
                  ))}
                </div>

                <div className="inline-flex rounded-xl p-0.5 bg-white/70 dark:bg-slate-900/65 border border-slate-300/60 dark:border-slate-700/60">
                  <button
                    type="button"
                    onClick={() => setTrendSort('count')}
                    className={`px-2.5 py-1 rounded-lg font-rounded font-bold text-xs cursor-pointer ${
                      trendSort === 'count' ? 'bg-indigo-600 text-white' : 'theme-text-secondary'
                    }`}
                  >
                    Most Asked
                  </button>
                  <button
                    type="button"
                    onClick={() => setTrendSort('recent')}
                    className={`px-2.5 py-1 rounded-lg font-rounded font-bold text-xs cursor-pointer ${
                      trendSort === 'recent' ? 'bg-rose-600 text-white' : 'theme-text-secondary'
                    }`}
                  >
                    41–50th Hot
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 3 Interactive Visual Analytics Bar Charts (Cross-Filtering!) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
            {/* Chart 1: By Official Subject */}
            <div className="p-4 rounded-3xl theme-subcard space-y-2.5">
              <h3 className="font-rounded font-bold text-xs sm:text-sm text-indigo-700 dark:text-indigo-300">
                Distribution by Subject (Click to filter)
              </h3>
              <div className="space-y-2">
                {explorerCharts.bySubject.map(([label, val]) => {
                  const max = explorerCharts.bySubject[0]?.[1] || 1;
                  const short = getSubjectTheme(label).shortEn;
                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => setExpSubject(expSubject === label ? 'All' : label)}
                      className="w-full text-left group cursor-pointer"
                    >
                      <div className="flex justify-between text-[11px] font-rounded mb-0.5">
                        <span className="truncate theme-text-secondary group-hover:theme-text-primary font-semibold">
                          {short}
                        </span>
                        <strong className="theme-text-primary">{val}</strong>
                      </div>
                      <div className="h-2 rounded-full bg-slate-400/20 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-sky-400"
                          style={{ width: `${Math.max(4, Math.round((val / max) * 100))}%` }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Chart 2: Top Sections */}
            <div className="p-4 rounded-3xl theme-subcard space-y-2.5">
              <h3 className="font-rounded font-bold text-xs sm:text-sm text-amber-700 dark:text-amber-300">
                Top Syllabus Sections (Click to filter)
              </h3>
              <div className="space-y-2">
                {explorerCharts.bySection.map(([label, val]) => {
                  const max = explorerCharts.bySection[0]?.[1] || 1;
                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => setExpTopic(expTopic === label ? 'All' : label)}
                      className="w-full text-left group cursor-pointer"
                    >
                      <div className="flex justify-between text-[11px] font-bangla mb-0.5 gap-2">
                        <span className="truncate theme-text-secondary group-hover:theme-text-primary font-semibold">
                          {label}
                        </span>
                        <strong className="font-rounded theme-text-primary shrink-0">{val}</strong>
                      </div>
                      <div className="h-2 rounded-full bg-slate-400/20 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-400"
                          style={{ width: `${Math.max(4, Math.round((val / max) * 100))}%` }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Chart 3: Top Recurring Trends */}
            <div className="p-4 rounded-3xl theme-subcard space-y-2.5">
              <h3 className="font-rounded font-bold text-xs sm:text-sm text-emerald-700 dark:text-emerald-300">
                Top Recurring BPSC Trends (Click to drill)
              </h3>
              <div className="space-y-2">
                {explorerCharts.byTrend.map(([label, val]) => {
                  const max = explorerCharts.byTrend[0]?.[1] || 1;
                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() =>
                        openFocus({
                          kind: 'trend',
                          title: label,
                          subtitle: `BPSC Recurring Trend (${val} matching questions)`,
                          trend: label
                        })
                      }
                      className="w-full text-left group cursor-pointer"
                    >
                      <div className="flex justify-between text-[11px] font-rounded mb-0.5 gap-2">
                        <span className="truncate theme-text-secondary group-hover:theme-text-primary font-semibold">
                          {label}
                        </span>
                        <strong className="theme-text-primary shrink-0">{val}x</strong>
                      </div>
                      <div className="h-2 rounded-full bg-slate-400/20 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400"
                          style={{ width: `${Math.max(4, Math.round((val / max) * 100))}%` }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Ranked Recurring Trend Cards */}
          {trendCards.length === 0 ? (
            <div className="p-8 rounded-3xl theme-subcard text-center font-rounded text-sm theme-text-secondary">
              No recurring trends match this filter. Try lowering the minimum frequency to 2+.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {trendCards.map((t, idx) => {
                const maxC = trendCards[0]?.count || 1;
                const pct = Math.max(8, Math.round((t.count / maxC) * 100));
                const subjTheme = getSubjectTheme(t.primarySubject);
                const isHotRecent = t.latestEdition >= 45;

                return (
                  <button
                    key={t.tag}
                    type="button"
                    onClick={() =>
                      openFocus({
                        kind: 'trend',
                        title: t.tag,
                        subtitle: `BPSC Recurring Trend • ${t.count} questions across ${t.examSpread} exams`,
                        trend: t.tag
                      })
                    }
                    className="group text-left p-4 rounded-3xl theme-subcard border border-transparent hover:border-emerald-400/60 transition-all hover:scale-[1.01] cursor-pointer space-y-2.5 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-rounded font-extrabold text-xs flex items-center justify-center shrink-0">
                          #{idx + 1}
                        </span>
                        <div className="min-w-0">
                          <h3 className="font-rounded font-bold text-sm sm:text-base theme-text-primary leading-snug truncate">
                            {t.tag}
                          </h3>
                          <span className="text-[11px] font-rounded font-semibold theme-text-muted">
                            {subjTheme.shortEn} • {t.examSpread} BCS exams
                          </span>
                        </div>
                      </div>

                      <span className="shrink-0 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/40 text-emerald-800 dark:text-emerald-200 font-rounded font-extrabold text-xs">
                        {t.count}x
                      </span>
                    </div>

                    <div className="h-1.5 rounded-full bg-slate-400/20 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400"
                        style={{ width: `${pct}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-rounded font-bold">
                      <div className="flex items-center gap-1.5">
                        {isHotRecent && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-700 dark:text-rose-300">
                            <Flame className="w-3 h-3" />
                            <span>Asked in {t.latestEdition}th BCS</span>
                          </span>
                        )}
                        {t.recentCount > 0 && (
                          <span className="theme-text-muted">{t.recentCount} in 41st–50th</span>
                        )}
                      </div>
                      <span className="text-amber-600 dark:text-amber-300 group-hover:translate-x-0.5 transition-transform">
                        Practice →
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ====================================================================
          TAB 4: EXTRA & SPECIAL CADRE TOPICS
         ==================================================================== */}
      {!loading && !error && !focus && activeTab === 'extra' && (
        <div className="space-y-4">
          <div className="p-4 sm:p-5 rounded-3xl theme-subcard space-y-3">
            <div className="flex items-start gap-3">
              <span className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-rose-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                <Stethoscope className="w-5 h-5" />
              </span>
              <div className="space-y-1">
                <h2 className="font-rounded font-bold text-base sm:text-lg theme-text-primary">
                  Special Cadre &amp; Out-of-Syllabus Topics ({extraQuestions.length} Questions)
                </h2>
                <p className="font-bangla text-xs sm:text-sm theme-text-secondary">
                  বিশেষ বিসিএস (৪৮তম, ৪২তম, ৩৯তম মেডিকেল/ডেন্টাল ক্যাডার) ও সাধারণ ২০০ নম্বরের সিলেবাসের বাইরের প্রশ্নগুলো আলাদাভাবে সাজানো হয়েছে যাতে আপনার মূল সিলেবাসের অ্যানালিটিক্স নির্ভুল থাকে।
                </p>
              </div>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 theme-text-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={extraSearch}
                onChange={(e) => setExtraSearch(e.target.value)}
                placeholder="Search Medical/Dental or Extra Topic..."
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white/80 dark:bg-slate-900/75 border border-slate-300/60 dark:border-slate-700/70 font-rounded text-sm theme-text-primary focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {extraTopicCards.map((item) => (
              <button
                key={item.topic}
                type="button"
                onClick={() =>
                  openFocus({
                    kind: 'extra-topic',
                    title: item.topic,
                    subtitle: item.subject,
                    subject: item.subject,
                    topic: item.topic
                  })
                }
                className="group text-left p-4 rounded-3xl theme-subcard border border-transparent hover:border-amber-400/60 transition-all hover:scale-[1.01] cursor-pointer flex items-center justify-between gap-3 shadow-sm"
              >
                <div className="min-w-0 space-y-1">
                  <span className="inline-block px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-800 dark:text-amber-200 font-rounded font-bold text-[10px]">
                    {item.subject}
                  </span>
                  <h3 className="font-rounded font-bold text-sm theme-text-primary leading-snug truncate">
                    {item.topic.replace(/^\[Extra Topic\]\s*/i, '')}
                  </h3>
                  <p className="text-[11px] font-rounded theme-text-muted">
                    {Array.from(item.exams).join(', ')}
                  </p>
                </div>

                <span className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500/15 text-amber-800 dark:text-amber-200 font-rounded font-bold text-xs">
                  <span>{item.count} Q</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
