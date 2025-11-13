import { format, parseISO, isValid } from "date-fns";

/**
 * Safely format a timestamp from the backend
 * @param value - ISO timestamp string (or null/undefined)
 * @param formatStr - date-fns format string
 * @returns Formatted date string or fallback value
 */
export function formatTimestamp(
  value: string | null | undefined,
  formatStr: string = "MMM dd, yyyy HH:mm"
): string {
  if (!value) {
    return "—";
  }

  try {
    const date = parseISO(value);
    if (!isValid(date)) {
      return "—";
    }
    return format(date, formatStr);
  } catch {
    return "—";
  }
}

/**
 * Safely format a trade timestamp (convenience wrapper)
 */
export function formatTradeTimestamp(value?: string | null): string {
  return formatTimestamp(value, "MMM dd, yyyy HH:mm");
}
