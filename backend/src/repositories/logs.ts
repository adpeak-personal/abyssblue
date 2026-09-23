// 다이브 로그 저장소 — 현재는 인메모리 mock 배열 사용. MySQL 전환 시 이 파일만 교체.
import { diveLogs } from "../data/mock.js";
import type { DiveLog } from "../types.js";

export interface DiveLogStats {
  totalDives: number;
  maxDepth: number;
  totalBottomTime: number; // 분
  avgWaterTemp: number;
  pointsVisited: number;
}

export function listLogs(userId?: number): DiveLog[] {
  return diveLogs
    .filter((l) => userId === undefined || l.userId === userId)
    .sort((a, b) => b.date.localeCompare(a.date) || b.diveNo - a.diveNo);
}

export function getLogStats(userId?: number): DiveLogStats {
  const logs = listLogs(userId);
  if (logs.length === 0) {
    return { totalDives: 0, maxDepth: 0, totalBottomTime: 0, avgWaterTemp: 0, pointsVisited: 0 };
  }
  const avgWaterTemp = logs.reduce((sum, l) => sum + l.waterTemp, 0) / logs.length;
  return {
    totalDives: logs.length,
    maxDepth: Math.max(...logs.map((l) => l.maxDepth)),
    totalBottomTime: logs.reduce((sum, l) => sum + l.bottomTime, 0),
    avgWaterTemp: Math.round(avgWaterTemp * 10) / 10,
    pointsVisited: new Set(logs.map((l) => l.pointId)).size,
  };
}

export function createLog(data: Omit<DiveLog, "id" | "diveNo">): DiveLog {
  const userLogs = diveLogs.filter((l) => l.userId === data.userId);
  const log: DiveLog = {
    ...data,
    id: diveLogs.reduce((max, l) => Math.max(max, l.id), 0) + 1,
    diveNo: userLogs.reduce((max, l) => Math.max(max, l.diveNo), 0) + 1,
  };
  diveLogs.push(log);
  return log;
}
