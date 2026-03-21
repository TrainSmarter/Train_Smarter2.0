/**
 * AI Usage & Rate Limiting Types — PROJ-19
 */

export type RateLimitPeriod = "day" | "week" | "month";

export interface AiUsageData {
  used: number;
  limit: number;
  period: RateLimitPeriod;
  periodStart: string; // ISO date string
  periodEnd: string; // ISO date string
  isUnlimited: boolean; // true for admins
}

export interface RateLimitConfig {
  period: RateLimitPeriod;
  maxCount: number;
}
