// Period backfill utility.
// n8n's current aggregation drops periods where no deals closed, which leaves
// gaps in weekly/monthly charts (e.g. Feb shows only Week 9, jumps from Week 13
// to Week 15). We backfill those empty periods with zero-valued entries so the
// trend line is continuous and honest.
//
// Handles two period formats:
//   - Weekly:  "YYYY-WNN" or "YYYY-Www"  (e.g. "2026-W09")
//   - Monthly: "YYYY-MM"                  (e.g. "2026-02")
//
// If the period format doesn't match either, the input is returned unchanged.

type AnyEntry = { period: string };

/** Parse a period string into year + unit number + format detected. */
function parsePeriod(period: string): { year: number; num: number; format: "week" | "month" } | null {
  const weekMatch = period.match(/^(\d{4})-W(\d{1,2})$/i);
  if (weekMatch) {
    return { year: parseInt(weekMatch[1], 10), num: parseInt(weekMatch[2], 10), format: "week" };
  }
  const monthMatch = period.match(/^(\d{4})-(\d{1,2})$/);
  if (monthMatch) {
    return { year: parseInt(monthMatch[1], 10), num: parseInt(monthMatch[2], 10), format: "month" };
  }
  return null;
}

/** Format a period back into its string form (with zero-padding). */
function formatPeriod(year: number, num: number, format: "week" | "month"): string {
  const padded = num.toString().padStart(2, "0");
  return format === "week" ? `${year}-W${padded}` : `${year}-${padded}`;
}

/** Generate a continuous sequence of periods from start to end (inclusive). */
function generateSequence(
  start: { year: number; num: number; format: "week" | "month" },
  end: { year: number; num: number; format: "week" | "month" }
): string[] {
  const out: string[] = [];
  const maxPerYear = start.format === "week" ? 52 : 12;
  // Weeks can technically be 53 in some years — handle that lazily by checking both ends

  let y = start.year;
  let n = start.num;
  // Safety guard: max 500 iterations (~10 years of weeks or 40+ years of months)
  for (let i = 0; i < 500; i++) {
    out.push(formatPeriod(y, n, start.format));
    if (y === end.year && n === end.num) break;
    n += 1;
    if (n > maxPerYear) {
      // For weekly, some years have 53 weeks. Check if we'd skip too early.
      if (start.format === "week" && n === 53) {
        // Keep Week 53 for years that actually have it. Roll over at 54.
        continue;
      }
      y += 1;
      n = 1;
    }
  }
  return out;
}

/**
 * Backfill missing periods in a breakdown array with a zero-valued template.
 *
 * @param entries        Existing entries (may be out of order, may have gaps)
 * @param zeroTemplate   Function that returns a zero-valued entry for a given period
 * @returns              New array sorted ascending with gaps filled in
 *
 * If the period format isn't recognized (not YYYY-WNN or YYYY-MM), returns a
 * sorted copy of the input unchanged.
 */
export function backfillPeriods<T extends AnyEntry>(
  entries: T[],
  zeroTemplate: (period: string) => T
): T[] {
  if (entries.length === 0) return entries;

  // Sort ascending by period
  const sorted = [...entries].sort((a, b) => a.period.localeCompare(b.period));

  // Detect format from first entry
  const first = parsePeriod(sorted[0].period);
  const last = parsePeriod(sorted[sorted.length - 1].period);
  if (!first || !last || first.format !== last.format) return sorted;

  // Generate full sequence between first and last
  const fullSequence = generateSequence(first, last);

  // Index existing entries by period
  const byPeriod = new Map<string, T>();
  for (const e of sorted) byPeriod.set(e.period, e);

  // Build result: existing entries where we have them, zero entries where we don't
  return fullSequence.map((p) => byPeriod.get(p) ?? zeroTemplate(p));
}
