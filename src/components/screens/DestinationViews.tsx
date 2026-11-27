import React from 'react';
import { ArrowLeft, ArrowRight, Crown } from 'lucide-react';
import { LeaderboardView, ProfileView, ProgressView, SettingsView } from './AccountViews';
import {
  ConservatoryTome3DEmblem,
  LighthouseBeacon3DEmblem
} from '../illustrations/Royal3DEmblems';
import { MockTestArena } from './MockTestArena';
import { QuestionBankView } from './QuestionBankView';
import { TopicMasterView } from './TopicMasterView';
import { navigate } from '../../router';
import { setTopicMasterIntent, TopicMasterIntent } from '../../data/syllabus';

export type ActiveView =
  | 'home'
  | 'topic-master'
  | 'mock-test'
  | 'question-bank'
  | 'study-materials'
  | 'bcs-updates'
  | 'progress'
  | 'profile'
  | 'settings'
  | 'leaderboard';

interface DestinationViewProps {
  view: Exclude<ActiveView, 'home'>;
  onBackHome: () => void;
}

export const DestinationView: React.FC<DestinationViewProps> = ({ view, onBackHome }) => {
  // Dedicated 3D Crystal Mock Test Arena
  if (view === 'mock-test') {
    return <MockTestArena onBackHome={onBackHome} />;
  }

  const handleJumpToTopicMaster = (intent?: TopicMasterIntent) => {
    setTopicMasterIntent(intent ?? null);
    navigate('topic-master');
  };

  return (
    <div
      className={`w-full ${
        view === 'question-bank' || view === 'topic-master' ? 'max-w-6xl' : 'max-w-4xl'
      } mx-auto px-3.5 sm:px-6 pt-5 sm:pt-7 pb-10 sm:pb-14`}
    >
      {/* Top Floating Navigation Bar */}
      <div className="mb-5 flex items-center justify-between gap-3">
        <button
          onClick={onBackHome}
          className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full section-card-branding theme-text-primary font-rounded font-bold text-sm hover:scale-105 active:scale-95 transition-transform cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-amber-500" />
          <span>Back to Arena</span>
        </button>

        {view === 'question-bank' && (
          <button
            type="button"
            onClick={() => handleJumpToTopicMaster({ tab: 'priority' })}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full section-card-royal-hero theme-text-primary font-rounded font-bold text-xs sm:text-sm hover:scale-105 active:scale-95 transition-transform cursor-pointer"
          >
            <Crown className="w-3.5 h-3.5 text-amber-500" />
            <span>Royal Topic Master</span>
            <span aria-hidden="true">→</span>
          </button>
        )}

        {view === 'topic-master' && (
          <button
            type="button"
            onClick={() => navigate('question-bank')}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full section-card-qb theme-text-primary font-rounded font-bold text-xs sm:text-sm hover:scale-105 active:scale-95 transition-transform cursor-pointer"
          >
            <span>Question Bank</span>
            <span aria-hidden="true">→</span>
          </button>
        )}
      </div>

      {/* ROYAL TOPIC MASTER */}
      {view === 'topic-master' && <TopicMasterView />}

      {/* QUESTION BANK */}
      {view === 'question-bank' && (
        <QuestionBankView onOpenTopicMaster={handleJumpToTopicMaster} />
      )}

      {/* STUDY MATERIALS */}
      {view === 'study-materials' && (
        <div className="section-card-sm rounded-[2.5rem] p-6 sm:p-10 space-y-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <ConservatoryTome3DEmblem className="w-28 h-28 sm:w-32 sm:h-32 shrink-0 animate-float-gentle drop-shadow-[0_14px_24px_rgba(16,185,129,0.32)]" />
            <div className="text-center sm:text-left space-y-2">
              <span className="inline-block px-3 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-400/40 text-emerald-800 dark:text-emerald-200 font-rounded font-bold text-xs">
                BBBOKZ Revision Vault
              </span>
              <h1 className="text-2xl sm:text-3xl font-rounded font-bold theme-text-primary">
                Study Materials
              </h1>
              <p className="theme-text-secondary font-bangla text-sm sm:text-base">
                উচ্চ-গুরুত্বপূর্ণ অধ্যায়ভিত্তিক নোটস ও রিভিশন গাইড — সরাসরি টপিক মাস্টারে অনুশীলনের লিংকসহ
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              {
                title: 'বাংলাদেশের সংবিধান সহজ পাঠ',
                desc: 'গুরুত্বপূর্ণ অনুচ্ছেদ, মৌলিক অধিকার ও সংশোধনীসমূহ',
                subject: 'Bangladesh Affairs',
                tag: 'S-Tier High Yield'
              },
              {
                title: 'বাংলা সাহিত্যের যুগবিভাগ ও রচনা',
                desc: 'চর্যাপদ থেকে আধুনিক যুগের সর্বোচ্চ পুনরাবৃত্তি তালিকা',
                subject: 'Bangla Language & Literature',
                tag: '30 Marks Core'
              },
              {
                title: 'English Grammar & Literature Vault',
                desc: 'Parts of Speech, Idioms, Shakespeare to Modern Era',
                subject: 'English Language & Literature',
                tag: '30 Marks Core'
              },
              {
                title: 'গাণিতিক যুক্তি ও মানসিক দক্ষতা শর্টকাট',
                desc: 'দ্রুত সমাধানের সূত্রাবলি ও বিগত ৪০ বিসিএস প্যাটার্ন',
                subject: 'Mathematical Reasoning',
                tag: '35 Marks Combo'
              }
            ].map((book) => (
              <button
                key={book.title}
                type="button"
                onClick={() => handleJumpToTopicMaster({ tab: 'syllabus', subject: book.subject })}
                className="group text-left p-5 rounded-3xl theme-subcard hover:border-emerald-400/60 transition-all hover:scale-[1.01] shadow-sm space-y-2 cursor-pointer"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-rounded font-bold text-[10px]">
                    {book.tag}
                  </span>
                  <ArrowRight className="w-4 h-4 text-emerald-500 group-hover:translate-x-0.5 transition-transform" />
                </div>
                <h3 className="font-bangla font-bold text-lg theme-text-primary">{book.title}</h3>
                <p className="font-bangla text-sm theme-text-secondary">{book.desc}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* BCS UPDATES */}
      {view === 'bcs-updates' && (
        <div className="section-card-up rounded-[2.5rem] p-6 sm:p-10 space-y-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <LighthouseBeacon3DEmblem className="w-28 h-28 sm:w-32 sm:h-32 shrink-0 animate-float-gentle drop-shadow-[0_14px_24px_rgba(249,115,22,0.32)]" />
            <div className="text-center sm:text-left space-y-2">
              <span className="inline-block px-3 py-0.5 rounded-full bg-orange-500/15 border border-orange-400/40 text-orange-800 dark:text-orange-200 font-rounded font-bold text-xs">
                Official BPSC Radar
              </span>
              <h1 className="text-2xl sm:text-3xl font-rounded font-bold theme-text-primary">
                BCS Updates
              </h1>
              <p className="theme-text-secondary font-bangla text-sm sm:text-base">
                পিএসসি-এর সর্বশেষ বিজ্ঞপ্তি, পরীক্ষার তারিখ এবং ফলাফল সংক্রান্ত আপডেট
              </p>
            </div>
          </div>

          <div className="space-y-3.5">
            {[
              {
                badge: '50th BCS',
                title: '৫০তম বিসিএস মৌখিক পরীক্ষা (ভাইভা) ও পরবর্তী সময়সূচি নির্দেশনা',
                date: '২০২৬'
              },
              {
                badge: '51st BCS',
                title: '৫১তম বিসিএস পরীক্ষার বিজ্ঞপ্তি ও ২০০ নম্বরের প্রিলিমিনারি প্রস্তুতি রোডম্যাপ',
                date: '২০২৬'
              },
              {
                badge: 'OKZ Analytics',
                title: '১০ম–৫০তম বিসিএস (৫,৬৫৫ প্রশ্ন) সম্পূর্ণ ডেটাসেট ও ৮৯টি অফিশিয়াল সিলেবাস ইউনিট যুক্ত হয়েছে',
                date: 'Live Now'
              }
            ].map((item) => (
              <div
                key={item.title}
                className="p-5 rounded-3xl theme-subcard flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div className="space-y-1">
                  <span className="inline-block px-3 py-0.5 rounded-full bg-orange-500/20 text-orange-700 dark:text-orange-300 font-rounded font-bold text-xs">
                    {item.badge}
                  </span>
                  <h3 className="font-bangla font-bold text-base sm:text-lg theme-text-primary">
                    {item.title}
                  </h3>
                </div>
                <span className="font-rounded font-bold text-xs theme-text-muted shrink-0">
                  {item.date}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {view === 'progress' && <ProgressView />}
      {view === 'profile' && <ProfileView />}
      {view === 'settings' && <SettingsView />}
      {view === 'leaderboard' && <LeaderboardView />}
    </div>
  );
};
