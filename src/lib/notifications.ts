/** Hour (0-23) in `timezone` for the instant `now`. */
export function localHour(timezone: string, now: Date): number {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "numeric",
    hourCycle: "h23",
  });
  return Number(formatter.format(now));
}

/** Calendar date (YYYY-MM-DD) in `timezone` for the instant `now`. Used as
 * the notifications_log dedupe key so a user gets at most one alert per
 * local day, enforced by a unique index — not just application logic. */
export function localDateKey(timezone: string, now: Date): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(now);
}

const ALERT_HOUR = 17;

/** True once per day, at the moment 17:00 local time is reached for this
 * timezone — the cron polls hourly and this decides which users are due. */
export function isAlertHour(timezone: string, now: Date): boolean {
  return localHour(timezone, now) === ALERT_HOUR;
}
