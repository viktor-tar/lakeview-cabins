import { Suspense } from "react";
import { cx } from "./cx";

/** Everything under /staff depends on the signed-in user, so it renders per request inside this boundary. */
export default function StaffRoot({ children }: { children: React.ReactNode }) {
  return (
    <div className={cx("root")}>
      <Suspense fallback={<p className={cx("staff-loading")}>Loading…</p>}>{children}</Suspense>
    </div>
  );
}
