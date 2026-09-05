/**
 * Server timestamps arrive as naive ISO strings with no timezone suffix
 * (e.g. "2026-09-05T05:22:45"), because the backend stores
 * `datetime.utcnow()` in a timezone-naive DateTime column. `new Date()` would
 * interpret that as *local* time, silently shifting every displayed time by the
 * viewer's UTC offset - +5:30 in IST. Appending the missing "Z" makes the
 * intended UTC explicit before parsing.
 *
 * The real fix is timezone-aware columns on the backend; that needs a schema
 * migration, so this keeps the display honest in the meantime.
 */
export function parseServerDate(value) {
  if (!value) return null;
  const hasTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/.test(value);
  const date = new Date(hasTimezone ? value : `${value}Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Short local clock time, e.g. "13:38". Returns null when unparseable. */
export function formatTime(value) {
  const date = parseServerDate(value);
  if (!date) return null;
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

/** Compact local date + time for detail views. */
export function formatDateTime(value) {
  const date = parseServerDate(value);
  if (!date) return null;
  return date.toLocaleString([], {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
  });
}
