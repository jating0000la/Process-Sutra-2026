import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Timezone-aware date formatting using Intl API
export function formatInTatTimezone(date: string | number | Date, tz: string | undefined) {
  try {
    const d = new Date(date);
    if (!tz) return d.toLocaleString();
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(d);
  } catch {
    return String(date);
  }
}
