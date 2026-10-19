import { Suspense } from "react";
import "./staff.css";

/** Everything under /staff depends on the signed-in user, so it renders per request inside this boundary. */
export default function StaffRoot({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<p className="staff-loading">Loading…</p>}>{children}</Suspense>;
}
