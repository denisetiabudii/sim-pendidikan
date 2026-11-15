import type { AppData, Report, ReportStatus } from "./types";

export const STATUS_LABEL: Record<ReportStatus, string> = {
  draft: "Draft",
  submitted: "Diajukan",
  approved: "Disetujui",
  published: "Dipublikasikan",
};

export const getReport = (data: AppData, studentId: string): Report =>
  data.reports[studentId] ?? { status: "draft", version: 1 };