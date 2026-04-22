import { SosReport } from "@/lib/staff/types";

export interface ReportCluster {
  clusterId: string;
  reports: SosReport[];
  representativeKeywords: string[];
}

export interface DedupedReportsResult {
  dedupedReports: SosReport[];
  duplicateMap: Record<string, string[]>;
}

const stopWords = new Set([
  "the",
  "a",
  "an",
  "is",
  "are",
  "to",
  "in",
  "on",
  "at",
  "near",
  "with",
  "and",
  "or",
  "for",
  "of",
  "from",
  "room",
  "floor",
]);

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2 && !stopWords.has(token));
}

function tokenSet(text: string): Set<string> {
  return new Set(tokenize(text));
}

function jaccardSimilarity(left: Set<string>, right: Set<string>): number {
  if (left.size === 0 || right.size === 0) return 0;

  let intersection = 0;
  left.forEach((token) => {
    if (right.has(token)) intersection += 1;
  });

  const union = left.size + right.size - intersection;
  if (union === 0) return 0;

  return intersection / union;
}

export function dedupeReports(
  reports: SosReport[],
  threshold = 0.82,
): DedupedReportsResult {
  const dedupedReports: SosReport[] = [];
  const duplicateMap: Record<string, string[]> = {};

  reports.forEach((report) => {
    const reportTokens = tokenSet(report.text);
    const existing = dedupedReports.find((candidate) => {
      if (candidate.roomId !== report.roomId || candidate.floor !== report.floor) {
        return false;
      }

      const candidateTokens = tokenSet(candidate.text);
      return jaccardSimilarity(reportTokens, candidateTokens) >= threshold;
    });

    if (!existing) {
      dedupedReports.push(report);
      duplicateMap[report.id] = [];
      return;
    }

    duplicateMap[existing.id] = [...(duplicateMap[existing.id] || []), report.id];
  });

  return {
    dedupedReports,
    duplicateMap,
  };
}

function hazardBucket(text: string): string {
  const normalized = text.toLowerCase();
  if (/(fire|smoke|burn|flame)/.test(normalized)) return "fire";
  if (/(flood|water|leak)/.test(normalized)) return "flood";
  if (/(collapse|structural|crack|debris)/.test(normalized)) return "structural";
  if (/(medical|injury|unconscious|bleeding)/.test(normalized)) return "medical";
  if (/(gas|chemical|toxic)/.test(normalized)) return "chemical";
  return "unknown";
}

export function clusterReports(reports: SosReport[]): ReportCluster[] {
  const buckets = new Map<string, SosReport[]>();

  reports.forEach((report) => {
    const hazard = hazardBucket(report.text);
    const key = `${hazard}-floor-${report.floor}`;
    const current = buckets.get(key) || [];
    current.push(report);
    buckets.set(key, current);
  });

  return Array.from(buckets.entries()).map(([key, grouped]) => {
    const keywords = grouped
      .flatMap((report) => tokenize(report.text))
      .reduce<Record<string, number>>((acc, token) => {
        acc[token] = (acc[token] || 0) + 1;
        return acc;
      }, {});

    const representativeKeywords = Object.entries(keywords)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([token]) => token);

    return {
      clusterId: key,
      reports: grouped,
      representativeKeywords,
    };
  });
}
