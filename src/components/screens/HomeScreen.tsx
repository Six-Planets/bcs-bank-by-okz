import React, { useEffect, useState } from 'react';
import {
  ArrowUpRight,
  Crown,
  Flame,
  Layers,
  Play,
  Sparkles,
  Target,
  TrendingUp
} from 'lucide-react';
import {
  RoyalAstrolabe3DEmblem,
  ArenaCrystal3DEmblem,
  ArchiveMonolith3DEmblem,
  ConservatoryTome3DEmblem,
  LighthouseBeacon3DEmblem
} from '../illustrations/Royal3DEmblems';
import { BCSCountdownFlipCard } from '../sections/BCSCountdownFlipCard';
import { BCSBankBrandingBar } from '../sections/BCSBankBrandingBar';
import { FloatingArt } from '../common/FloatingArt';
import { Pavilion3D } from '../common/Pavilion3D';
import { loadBCSQuestionBank } from '../../data/questionBank';
import { getSubjectTheme, readMasteryMap, setTopicMasterIntent } from '../../data/syllabus';
import type { ActiveView } from './DestinationViews';

const AstrolabeArt = React.memo(RoyalAstrolabe3DEmblem);
const ArenaArt = React.memo(ArenaCrystal3DEmblem);
const ArchiveArt = React.memo(ArchiveMonolith3DEmblem);
const ConservatoryArt = React.memo(ConservatoryTome3DEmblem);
const LighthouseArt = React.memo(LighthouseBeacon3DEmblem);

interface HotTopicChip {
  subject: string;
  topic: string;
  subtopic: string;
  count: number;
}

interface HeroTelemetry {
  totalQs: number;
  examCount: number;
  masteredCount: number;
  hotTopics: HotTopicChip[];
}

interface HomeScreenProps {
  onOpen: (view: ActiveView) => void;
}

/**
 * BCS Bank by OKZ (BBBOKZ) — Spatial 3D Sanctuary Homepage
 * --------------------------------------------------------
 * Architectural layout completely distinct from BCS Monster:
 *  - Generous open-world breathing gutters so the 3D Emerald Pond Village /
 *    Royal Observatory panorama & water mirror shine vividly around every pavilion.
 *  - Every section behaves as a physical 3D glass-and-gold pavilion with live
 *    pointer tilt, dynamic specular light sheen, and bespoke 3D luxury emblems.
 *  - Exact 7 requested sections (Private Tutor removed; Topic Master elevated to
 *    the Royal Flagship Centerpiece; asymmetric golden-ratio pavilion rows below)
 *    + Floating Royal Pier Bottom Menu Bar.
 */
export const HomeScreen: React.FC<HomeScreenProps> = React.memo(({ onOpen }) => {
  const [telemetry, setTelemetry] = useState<HeroTelemetry>({
    totalQs: 5655,
    examCount: 40,
    masteredCount: Object.values(readMasteryMap()).filter((v) => v === 1).length,
    hotTopics: []
  });

  useEffect(() => {
    let alive = true;
    loadBCSQuestionBank()
      .then((records) => {
        if (!alive) return;
        const official = records.filter((r) => !r.isExtraTopic);
        const exams = new Set(records.map((r) => r.bcsBatch)).size;
        const subMap = new Map<string, HotTopicChip>();
        for (const q of official) {
          const key = `${q.subject}|||${q.syllabusTopic}|||${q.syllabusSubtopic}`;
          const cur = subMap.get(key);
          if (cur) cur.count += 1;
          else
            subMap.set(key, {
              subject: q.subject,
              topic: q.syllabusTopic,
              subtopic: q.syllabusSubtopic,
              count: 1
            });
        }
        const hotTopics = Array.from(subMap.values())
          .sort((a, b) => b.count - a.count)
          .slice(0, 3);
        const masteredCount = Object.values(readMasteryMap()).filter((v) => v === 1).length;
        setTelemetry({
          totalQs: records.length,
          examCount: exams,
          masteredCount,
          hotTopics
        });
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  const openTopicMasterTab = (
    e: React.MouseEvent,
    tab: 'priority' | 'syllabus' | 'trends'
  ) => {
    e.stopPropagation();
    setTopicMasterIntent({ tab });
    onOpen('topic-master');
  };

  const openSpecificHotTopic = (e: React.MouseEvent, chip: HotTopicChip) => {
    e.stopPropagation();
    setTopicMasterIntent({
      tab: 'syllabus',
      subject: chip.subject,
      topic: chip.topic,
      subtopic: chip.subtopic
    });
    onOpen('topic-master');
  };

  return (
    <div className="w-full max-w-[1160px] mx-auto px-3.5 sm:px-6 lg:px-10 pt-3.5 sm:pt-5 pb-32 sm:pb-36 space-y-4 sm:space-y-5">
      {/* ====================================================================
          UPPER SKY SANCTUARY: SECTION 1 (FLIP CARD) + SECTION 2 (BRAND & THEME)
         ==================================================================== */}
      <div className="space-y-3 sm:space-y-3.5">
        <BCSCountdownFlipCard />
        <BCSBankBrandingBar />
      </div>

      {/* ====================================================================
          SECTION 3 (CROWN JEWEL MONUMENT): TOPIC MASTER ROYAL CITADEL
          Elevated into the flagship hero spot with interactive 3D tilt,
          rotating 3D Royal Astrolabe, and live clickable S-Tier hot signals!
         ==================================================================== */}
      <Pavilion3D
        onClick={() => onOpen('topic-master')}
        maxTilt={3.2}
        rimClass="from-amber-300/80 via-yellow-200/75 to-violet-400/75"
        className="group rounded-[2.2rem] sm:rounded-[2.75rem] section-card-royal-hero px-5 py-6 sm:px-9 sm:py-8 lg:px-11 lg:py-9 overflow-hidden cursor-pointer select-none"
      >
        <div className="royal-shimmer-beam" aria-hidden="true" />

        {/* Architectural Gold Filigree Corner Brackets */}
        <div className="pointer-events-none absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-amber-300/70 rounded-tl-xl" />
        <div className="pointer-events-none absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-amber-300/70 rounded-tr-xl" />
        <div className="pointer-events-none absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-amber-300/50 rounded-bl-xl" />
        <div className="pointer-events-none absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-amber-300/50 rounded-br-xl" />

        {/* Ambient Celestial Glow Orbs inside Citadel */}
        <div className="pointer-events-none absolute -top-28 -right-12 w-[26rem] h-[26rem] rounded-full glow-orb bg-gradient-to-br from-amber-400/32 via-yellow-300/18 to-violet-500/24 group-hover:scale-110 transition-transform duration-700" />
        <div className="pointer-events-none absolute -bottom-28 -left-16 w-80 h-80 rounded-full glow-orb bg-gradient-to-tr from-emerald-400/22 via-indigo-500/25 to-amber-400/18" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
          {/* LEFT WING: Royal Editorial Identity, Live Hot S-Tier Signals & CTAs */}
          <div className="lg:col-span-7 space-y-4 text-center lg:text-left order-2 lg:order-1">
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-gradient-to-r from-amber-500/25 via-yellow-400/20 to-violet-500/20 border border-amber-400/60 text-amber-900 dark:text-amber-200 font-royal font-bold text-[10px] sm:text-[11px] tracking-[0.15em] uppercase shadow-sm">
                <Crown className="w-3.5 h-3.5 text-amber-500 dark:text-amber-300" />
                <span>Royal Citadel • OKZ Topic Engine</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/40 text-emerald-800 dark:text-emerald-200 font-rounded font-bold text-[10px] sm:text-[11px]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>{telemetry.totalQs.toLocaleString()} MCQs Indexed</span>
              </span>
            </div>

            <div className="space-y-1.5">
              <h1 className="text-3xl sm:text-4xl lg:text-[3.25rem] font-royal font-extrabold tracking-tight leading-[1.06]">
                <span className="bg-gradient-to-r from-amber-600 via-yellow-500 to-violet-700 dark:from-amber-200 dark:via-yellow-300 dark:to-amber-100 bg-clip-text text-transparent">
                  Topic Master
                </span>
              </h1>
              <p className="text-xs sm:text-base font-bangla font-medium theme-text-secondary max-w-xl mx-auto lg:mx-0 leading-relaxed">
                ১০ম–৫০তম বিসিএস-এর সম্পূর্ণ প্রশ্ন-ডেটা বিশ্লেষণ করে অধ্যায় ও সাব-টপিক অনুযায়ী সবচেয়ে গুরুত্বপূর্ণ টপিক বাছাই করার রয়্যাল অ্যানালিটিক্স ড্যাশবোর্ড
              </p>
            </div>

            {/* Live Clickable Top-3 Highest-Yield Subtopics Preview */}
            {telemetry.hotTopics.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-center lg:justify-start gap-1.5 text-[10px] font-royal font-bold uppercase tracking-widest text-amber-700 dark:text-amber-300">
                  <Flame className="w-3 h-3 text-amber-500" />
                  <span>Top Recurring S-Tier Signals — Tap to Drill</span>
                </div>
                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-1.5">
                  {telemetry.hotTopics.map((chip) => (
                    <button
                      key={`${chip.subject}-${chip.subtopic}`}
                      type="button"
                      onClick={(e) => openSpecificHotTopic(e, chip)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl theme-subcard border border-amber-400/35 hover:border-amber-400 text-[11px] font-bangla font-semibold theme-text-primary hover:scale-[1.02] transition-all cursor-pointer"
                    >
                      <span className="font-rounded font-bold text-amber-600 dark:text-amber-300">
                        {getSubjectTheme(chip.subject).shortEn}:
                      </span>
                      <span className="max-w-[140px] truncate">{chip.subtopic}</span>
                      <span className="px-1.5 py-0.5 rounded-md bg-amber-500/18 text-amber-800 dark:text-amber-200 font-rounded font-extrabold text-[10px]">
                        {chip.count}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Primary Royal Pedestal CTAs */}
            <div className="pt-1 flex flex-wrap items-center justify-center lg:justify-start gap-2.5">
              <button
                type="button"
                onClick={(e) => openTopicMasterTab(e, 'priority')}
                className="btn-royal-gold inline-flex items-center gap-2.5 px-6 sm:px-8 py-3 sm:py-3.5 rounded-full text-white font-rounded font-bold text-sm sm:text-base tracking-wide cursor-pointer"
              >
                <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/20 flex items-center justify-center shadow-inner">
                  <Crown className="w-4 h-4 text-amber-100" />
                </span>
                <span>Enter Royal Topic Master</span>
              </button>

              <button
                type="button"
                onClick={(e) => openTopicMasterTab(e, 'trends')}
                className="inline-flex items-center gap-1.5 px-4 py-3 rounded-full theme-subcard border border-amber-400/40 font-rounded font-bold text-xs sm:text-sm theme-text-primary hover:scale-[1.03] active:scale-95 transition-transform cursor-pointer"
              >
                <TrendingUp className="w-4 h-4 text-amber-500" />
                <span>Data &amp; Trends Matrix</span>
              </button>
            </div>
          </div>

          {/* RIGHT WING: Sculpted 3D Royal Astrolabe + Live Orbiting Telemetry Badges */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center gap-3 order-1 lg:order-2">
            <div className="relative flex items-center justify-center">
              <FloatingArt
                variant="gentle"
                className="relative group-hover:scale-[1.04] transition-transform duration-500"
              >
                <AstrolabeArt className="w-48 h-48 sm:w-60 sm:h-60 lg:w-64 lg:h-64 drop-shadow-[0_22px_36px_rgba(245,158,11,0.32)]" />
              </FloatingArt>
            </div>

            {/* Compact 3-Metric Orbit Strip */}
            <div className="grid grid-cols-3 gap-2 w-full max-w-sm">
              <div className="px-2.5 py-2 rounded-2xl theme-subcard border border-amber-400/30 text-center">
                <div className="text-sm sm:text-base font-rounded font-extrabold theme-text-primary">
                  {telemetry.examCount}
                </div>
                <div className="text-[10px] font-rounded theme-text-muted flex items-center justify-center gap-0.5">
                  <Layers className="w-2.5 h-2.5 text-amber-500" />
                  <span>BCS Exams</span>
                </div>
              </div>
              <div className="px-2.5 py-2 rounded-2xl theme-subcard border border-violet-400/30 text-center">
                <div className="text-sm sm:text-base font-rounded font-extrabold theme-text-primary">
                  89
                </div>
                <div className="text-[10px] font-rounded theme-text-muted flex items-center justify-center gap-0.5">
                  <Sparkles className="w-2.5 h-2.5 text-violet-400" />
                  <span>Units</span>
                </div>
              </div>
              <div className="px-2.5 py-2 rounded-2xl theme-subcard border border-emerald-400/30 text-center">
                <div className="text-sm sm:text-base font-rounded font-extrabold theme-text-primary">
                  {telemetry.masteredCount}
                </div>
                <div className="text-[10px] font-rounded theme-text-muted flex items-center justify-center gap-0.5">
                  <Target className="w-2.5 h-2.5 text-emerald-400" />
                  <span>Mastered</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Pavilion3D>

      {/* ====================================================================
          FLOATING LAGOON PAVILIONS — ASYMMETRIC GOLDEN-RATIO SPATIAL GRID
          (7/5 + 5/7 editorial masonry — zero BCS Monster clone symmetry,
          generous open gutters letting the pond & sanctuary horizon breathe!)
         ==================================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-5">
        {/* SECTION 4: MOCK TEST — 3D Crystalline Arena Dock (7 cols) */}
        <Pavilion3D
          onClick={() => onOpen('mock-test')}
          maxTilt={4.5}
          rimClass="from-fuchsia-400/65 via-violet-400/70 to-sky-400/65"
          className="md:col-span-7 group rounded-[2rem] section-card-mock p-5 sm:px-7 sm:py-6 overflow-hidden cursor-pointer select-none flex flex-col sm:flex-row items-center justify-between gap-4"
        >
          <div className="pointer-events-none absolute -right-10 -top-10 w-56 h-56 rounded-full glow-orb bg-gradient-to-bl from-violet-400/40 via-pink-400/30 to-transparent group-hover:scale-110 transition-transform duration-500" />

          <div className="relative z-10 space-y-2.5 text-center sm:text-left order-2 sm:order-1 flex-1">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5">
              <span className="px-2.5 py-0.5 rounded-full bg-violet-500/20 border border-violet-400/45 text-violet-800 dark:text-violet-200 font-rounded font-bold text-[10px] uppercase tracking-wider">
                200 MCQs • 120 Mins
              </span>
              <span className="px-2 py-0.5 rounded-full bg-white/60 dark:bg-slate-950/60 font-rounded font-bold text-[10px] theme-text-muted">
                -0.50 Negative Marking
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-rounded font-extrabold theme-text-primary group-hover:text-violet-600 dark:group-hover:text-violet-300 transition-colors">
              Mock Test Arena
            </h2>
            <p className="text-xs sm:text-sm font-bangla theme-text-secondary max-w-sm leading-relaxed">
              ত্রিমাত্রিক ক্রিস্টাল পরিবেশে পূর্ণাঙ্গ ২০০ নম্বরের বিসিএস প্রিলিমিনারি মক টেস্ট দিন
            </p>
            <div className="pt-1 flex justify-center sm:justify-start">
              <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full btn-3d-start text-white font-rounded font-bold text-xs">
                <Play className="w-3 h-3 fill-white" />
                <span>Start Exam</span>
              </span>
            </div>
          </div>

          <FloatingArt
            variant="gentle"
            className="relative z-10 shrink-0 group-hover:scale-105 transition-transform duration-500 order-1 sm:order-2"
          >
            <ArenaArt className="w-24 h-24 sm:w-32 sm:h-32 drop-shadow-[0_14px_24px_rgba(139,92,246,0.35)]" />
          </FloatingArt>
        </Pavilion3D>

        {/* SECTION 5: QUESTION BANK — 3D Sapphire Archive Monolith (5 cols) */}
        <Pavilion3D
          onClick={() => onOpen('question-bank')}
          maxTilt={4.8}
          rimClass="from-cyan-300/70 via-sky-400/70 to-indigo-400/65"
          className="md:col-span-5 group rounded-[2rem] section-card-qb p-5 sm:px-6 sm:py-6 overflow-hidden cursor-pointer select-none flex flex-col sm:flex-row md:flex-col lg:flex-row items-center justify-between gap-3.5"
        >
          <div className="pointer-events-none absolute -right-10 -bottom-10 w-52 h-52 rounded-full glow-orb bg-gradient-to-tl from-sky-400/40 via-cyan-300/30 to-transparent group-hover:scale-110 transition-transform duration-500" />

          <div className="relative z-10 space-y-2 text-center sm:text-left md:text-center lg:text-left order-2 sm:order-1 flex-1">
            <span className="inline-block px-2.5 py-0.5 rounded-full bg-sky-500/20 border border-sky-400/45 text-sky-800 dark:text-sky-200 font-rounded font-bold text-[10px] uppercase tracking-wider">
              10th–50th Archive
            </span>
            <h2 className="text-xl sm:text-2xl font-rounded font-extrabold theme-text-primary group-hover:text-sky-600 dark:group-hover:text-sky-300 transition-colors">
              Question Bank
            </h2>
            <p className="text-xs sm:text-sm font-bangla theme-text-secondary leading-snug">
              বিগত ৪০টি বিসিএস-এর ৫,৬৫৫টি নির্ভুল প্রশ্ন ও ব্যাখ্যাসহ সমাধান
            </p>
            <div className="inline-flex items-center gap-1 text-xs font-rounded font-bold text-sky-700 dark:text-sky-300 pt-0.5">
              <span>Explore Vault</span>
              <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>
          </div>

          <FloatingArt
            variant="reverse"
            className="relative z-10 shrink-0 group-hover:scale-105 transition-transform duration-500 order-1 sm:order-2"
          >
            <ArchiveArt className="w-24 h-24 sm:w-28 sm:h-28 drop-shadow-[0_14px_24px_rgba(14,165,233,0.35)]" />
          </FloatingArt>
        </Pavilion3D>

        {/* SECTION 6: STUDY MATERIALS — 3D Emerald Conservatory (5 cols) */}
        <Pavilion3D
          onClick={() => onOpen('study-materials')}
          maxTilt={4.8}
          rimClass="from-emerald-300/70 via-teal-400/70 to-amber-300/55"
          className="md:col-span-5 group rounded-[2rem] section-card-sm p-5 sm:px-6 sm:py-6 overflow-hidden cursor-pointer select-none flex flex-col sm:flex-row md:flex-col lg:flex-row items-center justify-between gap-3.5"
        >
          <div className="pointer-events-none absolute -right-10 -top-10 w-48 h-48 rounded-full glow-orb bg-gradient-to-bl from-emerald-400/40 via-teal-300/30 to-transparent group-hover:scale-110 transition-transform duration-500" />

          <div className="relative z-10 space-y-2 text-center sm:text-left md:text-center lg:text-left order-2 sm:order-1 flex-1">
            <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/45 text-emerald-800 dark:text-emerald-200 font-rounded font-bold text-[10px] uppercase tracking-wider">
              Revision Conservatory
            </span>
            <h2 className="text-xl sm:text-2xl font-rounded font-extrabold theme-text-primary group-hover:text-emerald-600 dark:group-hover:text-emerald-300 transition-colors">
              Study Materials
            </h2>
            <p className="text-xs sm:text-sm font-bangla theme-text-secondary leading-snug">
              সংবিধান শর্টকাট, সাহিত্য যুগবিভাগ ও দ্রুত রিভিশন হ্যান্ডনোটস
            </p>
            <div className="inline-flex items-center gap-1 text-xs font-rounded font-bold text-emerald-700 dark:text-emerald-300 pt-0.5">
              <span>Open Notes</span>
              <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>
          </div>

          <FloatingArt
            variant="gentle"
            className="relative z-10 shrink-0 group-hover:scale-105 transition-transform duration-500 order-1 sm:order-2"
          >
            <ConservatoryArt className="w-24 h-24 sm:w-28 sm:h-28 drop-shadow-[0_14px_24px_rgba(16,185,129,0.35)]" />
          </FloatingArt>
        </Pavilion3D>

        {/* SECTION 7: BCS UPDATES — 3D Imperial Signal Beacon (7 cols) */}
        <Pavilion3D
          onClick={() => onOpen('bcs-updates')}
          maxTilt={4.5}
          rimClass="from-amber-300/75 via-orange-400/70 to-rose-400/65"
          className="md:col-span-7 group rounded-[2rem] section-card-up p-5 sm:px-7 sm:py-6 overflow-hidden cursor-pointer select-none flex flex-col sm:flex-row items-center justify-between gap-4"
        >
          <div className="pointer-events-none absolute -right-10 -bottom-10 w-56 h-56 rounded-full glow-orb bg-gradient-to-tl from-orange-400/40 via-amber-300/30 to-transparent group-hover:scale-110 transition-transform duration-500" />

          <div className="relative z-10 space-y-2.5 text-center sm:text-left order-2 sm:order-1 flex-1">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5">
              <span className="px-2.5 py-0.5 rounded-full bg-orange-500/20 border border-orange-400/45 text-orange-800 dark:text-orange-200 font-rounded font-bold text-[10px] uppercase tracking-wider">
                BPSC Beacon
              </span>
              <span className="px-2 py-0.5 rounded-full bg-white/60 dark:bg-slate-950/60 font-rounded font-bold text-[10px] theme-text-muted">
                50th Viva · 51st Circular Watch
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-rounded font-extrabold theme-text-primary group-hover:text-orange-600 dark:group-hover:text-orange-300 transition-colors">
              BCS Updates
            </h2>
            <p className="text-xs sm:text-sm font-bangla theme-text-secondary max-w-md leading-relaxed">
              বাংলাদেশ সরকারি কর্ম কমিশনের সর্বশেষ বিজ্ঞপ্তি, পরীক্ষার তারিখ ও ফলাফল সংক্রান্ত আপডেট
            </p>
            <div className="inline-flex items-center gap-1 text-xs font-rounded font-bold text-orange-700 dark:text-amber-300 pt-0.5">
              <span>View Official Notices</span>
              <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>
          </div>

          <FloatingArt
            variant="reverse"
            className="relative z-10 shrink-0 group-hover:scale-105 transition-transform duration-500 order-1 sm:order-2"
          >
            <LighthouseArt className="w-24 h-24 sm:w-32 sm:h-32 drop-shadow-[0_14px_24px_rgba(249,115,22,0.35)]" />
          </FloatingArt>
        </Pavilion3D>
      </div>
    </div>
  );
});
HomeScreen.displayName = 'HomeScreen';
