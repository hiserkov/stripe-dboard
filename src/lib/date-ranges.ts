export type DatePreset = "today" | "this_week" | "this_month" | "last_month" | "custom";

export function resolveDateRange(
  preset: DatePreset,
  from?: string,
  to?: string
): { start: Date; end: Date } {
  const now = new Date();

  switch (preset) {
    case "today": {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      const end = new Date(now);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }
    case "this_week": {
      const start = new Date(now);
      start.setDate(now.getDate() - now.getDay()); // Sunday
      start.setHours(0, 0, 0, 0);
      return { start, end: now };
    }
    case "this_month": {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start, end: now };
    }
    case "last_month": {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      return { start, end };
    }
    case "custom": {
      if (!from || !to) throw new Error("custom preset requires from and to");
      return { start: new Date(from), end: new Date(to) };
    }
  }
}
