/**
 * Maps the dashboard's plain class names ("btn btn-primary") to their scoped CSS Module names,
 * so markup stays readable while styles stay local to the staff area.
 */
import styles from "./staff.module.css";

export function cx(...names: (string | false | null | undefined)[]): string {
  return names
    .filter(Boolean)
    .join(" ")
    .split(/\s+/)
    .filter(Boolean)
    .map((n) => styles[n] ?? n)
    .join(" ");
}
