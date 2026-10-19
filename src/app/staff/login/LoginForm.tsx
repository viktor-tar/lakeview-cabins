"use client";
import { useActionState, useState } from "react";
import { login, type ActionState } from "../actions";
import { cx } from "@/app/staff/cx";

export function LoginForm({ next, demo }: { next: string; demo?: { email: string; password: string } }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(login, undefined);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  return (
    <form action={action} className={cx("stack")}>
      <input type="hidden" name="next" value={next} />
      <label className={cx("field")}>
        Email
        <input
          name="email"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      <label className={cx("field")}>
        Password
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      {state?.error && (
        <p className={cx("alert alert-error")} role="alert">
          {state.error}
        </p>
      )}
      <button className={cx("btn btn-primary")} disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
      {demo && (
        <div className={cx("demo-box")}>
          <p>
            <strong>Demo account</strong>
            <br />
            {demo.email} · {demo.password}
          </p>
          <button
            type="button"
            className={cx("btn btn-ghost")}
            onClick={() => {
              setEmail(demo.email);
              setPassword(demo.password);
            }}
          >
            Fill in demo login
          </button>
        </div>
      )}
    </form>
  );
}
