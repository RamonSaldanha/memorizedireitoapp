import { apiClient } from './client';

export type StreakWeekDay = {
  date: string;
  weekday: string;
  count: number;
  studied: boolean;
  is_today: boolean;
  is_future: boolean;
};

export type StreakMonthDay = {
  date: string;
  day: number;
  count: number;
  studied: boolean;
  is_today: boolean;
  is_future: boolean;
};

export type StreakMonth = {
  year: number;
  month: number;
  label: string;
  first_weekday: number; // 1=Seg .. 7=Dom
  prev: string;
  next: string | null;
  days: StreakMonthDay[];
};

export type StreakStats = {
  current_streak: number;
  longest_streak: number;
  played_today: boolean;
  today_count: number;
  week: StreakWeekDay[];
  month: StreakMonth;
};

export const streakApi = {
  getStats: (month?: string) =>
    apiClient.get<StreakStats>('/streak', { params: month ? { month } : undefined }),
};
