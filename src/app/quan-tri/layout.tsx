import type { ReactNode } from "react";
import "@/features/admin-typography/admin-typography.css";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <div className="mm-admin-typography">{children}</div>;
}
