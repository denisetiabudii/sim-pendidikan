import { CircleCheck, CircleX, Info, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";

const S = {
  success: { cls: "border-emerald-300 bg-emerald-50 text-emerald-900", Icon: CircleCheck },
  error: { cls: "border-red-300 bg-red-50 text-red-900", Icon: CircleX },
  warning: { cls: "border-amber-300 bg-amber-50 text-amber-900", Icon: TriangleAlert },
  info: { cls: "border-blue-300 bg-blue-50 text-blue-900", Icon: Info },
} as const;

export default function Alert({ type = "info", children }: { type?: keyof typeof S; children: ReactNode }) {
  const { cls, Icon } = S[type];
  return (
    <div role={type === "error" ? "alert" : "status"} className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${cls}`}>
      <Icon size={18} className="mt-0.5 shrink-0" aria-hidden />
      <div>{children}</div>
    </div>
  );
}