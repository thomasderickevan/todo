import { useMemo, useCallback } from 'react';
import type { LifePulseData, HeatmapDay } from '../types/lifepulse';
import { getLocalDateString } from '../utils/dateUtils';

export const useLifePulseStats = (data: LifePulseData) => {
  const todayStr = getLocalDateString();

  const calculateStreak = useCallback((habitId: string) => {
    let currentStreak = 0;
    let maxStreak = 0;
    let tempStreak = 0;

    const d = new Date();
    // Start checking from yesterday, unless today is already checked
    const checkedToday = data.logs[todayStr]?.includes(habitId) || false;
    if (checkedToday) {
      tempStreak = 1;
    }

    // Check backwards up to 365 days
    for (let i = 1; i <= 365; i++) {
      const checkDate = new Date();
      checkDate.setDate(d.getDate() - i);
      const dateStr = getLocalDateString(checkDate);

      if (data.logs[dateStr]?.includes(habitId)) {
        tempStreak++;
      } else {
        // If we were checking current streak and missed a day, current streak stops
        if (currentStreak === 0 && (i > 1 || !checkedToday)) {
            currentStreak = tempStreak;
        }
        maxStreak = Math.max(maxStreak, tempStreak);
        tempStreak = 0;
      }
    }
    if (currentStreak === 0) currentStreak = tempStreak;
    maxStreak = Math.max(maxStreak, tempStreak, currentStreak);

    return { current: currentStreak, max: maxStreak };
  }, [data.logs, todayStr]);

  const globalStats = useMemo(() => {
    let totalCompletions = 0;
    let perfectDays = 0;
    const allDates = Object.keys(data.logs);

    for (const date of allDates) {
      totalCompletions += data.logs[date].length;
      if (data.habits.length > 0 && data.logs[date].length >= data.habits.length) {
        perfectDays++;
      }
    }
    return { totalCompletions, perfectDays };
  }, [data]);

  // Heatmap Data (Last 60 days)
  const heatmapData = useMemo(() => {
    const days: HeatmapDay[] = [];
    const today = new Date();
    today.setHours(0,0,0,0);

    const start = new Date(today);
    start.setDate(today.getDate() - 59);

    for (let i = 0; i < 60; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const dateStr = getLocalDateString(d);

      const count = data.logs[dateStr]?.length || 0;
      let level = 0;
      if (data.habits.length > 0) {
        const ratio = count / data.habits.length;
        if (ratio > 0) level = 1;
        if (ratio >= 0.33) level = 2;
        if (ratio >= 0.66) level = 3;
        if (ratio >= 1) level = 4;
      }

      days.push({
        date: dateStr,
        count,
        level,
        isToday: dateStr === todayStr
      });
    }
    return days;
  }, [data.logs, data.habits.length, todayStr]);

  // Split heatmap data into weeks (columns)
  const heatmapColumns = useMemo(() => {
    const cols: HeatmapDay[][] = [];
    let currentCol: HeatmapDay[] = [];

    for (let i = 0; i < heatmapData.length; i++) {
      currentCol.push(heatmapData[i]);
      if (currentCol.length === 7 || i === heatmapData.length - 1) {
        while (currentCol.length < 7) {
          currentCol.push({ date: '', count: 0, level: 0, isToday: false, future: true });
        }
        cols.push(currentCol);
        currentCol = [];
      }
    }
    return cols;
  }, [heatmapData]);

  return {
    calculateStreak,
    globalStats,
    heatmapColumns,
    todayStr
  };
};
