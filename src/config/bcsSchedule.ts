/**
 * Centralized BPSC Examination Schedule Configuration
 * ----------------------------------------------------
 * Update the ISO 8601 date strings (Bangladesh Standard Time, UTC+06:00)
 * whenever the Bangladesh Public Service Commission (BPSC) publishes
 * new or revised examination schedules on www.bpsc.gov.bd.
 *
 * Set `scheduledDate: null` if BPSC has not officially announced a date yet.
 * Never invent fake dates—when `scheduledDate` is `null`, the UI automatically
 * displays "Date not announced yet".
 */

export interface ExamStageSchedule {
  stageKey: 'preliminary' | 'written' | 'viva';
  stageName: string;
  stageNameBn: string;
  /** ISO 8601 timestamp in +06:00 (BST), or null if not officially announced yet */
  scheduledDate: string | null;
  displayDateLabel: string;
  officialNote: string;
}

export interface BCSCycleConfig {
  bcsNumber: number;
  title: string;
  statusLabel: string;
  stages: ExamStageSchedule[];
}

export const BCS_SCHEDULE_CONFIG: {
  bcs50: BCSCycleConfig;
  bcs51: {
    bcsNumber: number;
    title: string;
    statusLabel: string;
    preliminary: ExamStageSchedule;
  };
} = {
  bcs50: {
    bcsNumber: 50,
    title: '50th BCS',
    statusLabel: 'Ongoing Cycle',
    stages: [
      {
        stageKey: 'written',
        stageName: 'Written Examination',
        stageNameBn: 'লিখিত পরীক্ষা',
        // Official 50th BCS Circular Roadmap date for Compulsory Written Exams: April 9, 2026
        scheduledDate: '2026-04-09T10:00:00+06:00',
        displayDateLabel: 'April 9, 2026',
        officialNote: 'As per BPSC 50th BCS Circular Schedule'
      },
      {
        stageKey: 'viva',
        stageName: 'Viva Examination',
        stageNameBn: 'মৌখিক পরীক্ষা (ভাইভা)',
        // Official 50th BCS Circular 1-Year Roadmap completion/final Viva stage: November 25, 2026
        scheduledDate: '2026-11-25T10:00:00+06:00',
        displayDateLabel: 'November 25, 2026',
        officialNote: 'BPSC 50th BCS Official Roadmap Schedule'
      }
    ]
  },
  bcs51: {
    bcsNumber: 51,
    title: '51st BCS',
    statusLabel: 'Awaits',
    preliminary: {
      stageKey: 'preliminary',
      stageName: 'Preliminary Examination',
      stageNameBn: 'প্রিলিমিনারি পরীক্ষা',
      // Official 51st BCS Preliminary date has not been formally announced by BPSC yet
      scheduledDate: null,
      displayDateLabel: 'Date not announced yet',
      officialNote: 'Official BPSC schedule notice pending publication'
    }
  }
};

/**
 * Automatically determines the next upcoming examination stage for the 50th BCS
 * based on the current time and the configured schedule:
 * - Returns Written Examination if it is still upcoming (or if its date is not announced yet).
 * - Automatically switches to Viva Examination once the Written Examination date has passed.
 */
export function getNext50thBCSStage(now: Date = new Date()): {
  stage: ExamStageSchedule;
  isCompleted: boolean;
} {
  const { stages } = BCS_SCHEDULE_CONFIG.bcs50;
  const writtenStage = stages.find((s) => s.stageKey === 'written')!;
  const vivaStage = stages.find((s) => s.stageKey === 'viva')!;

  // If written date is not announced yet, or is still in the future, Written is next
  if (!writtenStage.scheduledDate) {
    return { stage: writtenStage, isCompleted: false };
  }

  const writtenTime = new Date(writtenStage.scheduledDate).getTime();
  if (now.getTime() < writtenTime) {
    return { stage: writtenStage, isCompleted: false };
  }

  // Written examination has passed -> automatically show Viva examination next
  if (!vivaStage.scheduledDate) {
    return { stage: vivaStage, isCompleted: false };
  }

  const vivaTime = new Date(vivaStage.scheduledDate).getTime();
  const isCompleted = now.getTime() >= vivaTime;

  return { stage: vivaStage, isCompleted };
}

export interface CountdownTimeParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
  isCompleted: boolean;
  isAnnounced: boolean;
}

export function calculateCountdownParts(
  scheduledDate: string | null,
  now: Date = new Date()
): CountdownTimeParts {
  if (!scheduledDate) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      totalMs: 0,
      isCompleted: false,
      isAnnounced: false
    };
  }

  const targetMs = new Date(scheduledDate).getTime();
  const diffMs = targetMs - now.getTime();

  if (diffMs <= 0) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      totalMs: 0,
      isCompleted: true,
      isAnnounced: true
    };
  }

  const totalSeconds = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSeconds / (3600 * 24));
  const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return {
    days,
    hours,
    minutes,
    seconds,
    totalMs: diffMs,
    isCompleted: false,
    isAnnounced: true
  };
}

