"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { ApiError, http } from "@/lib/http/client";
import { newsletterSchema, type NewsletterInput } from "@/lib/newsletter/schema";
import styles from "./Footer.module.css";

export function NewsletterForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<NewsletterInput>({ resolver: zodResolver(newsletterSchema), defaultValues: { email: "", website: "" } });
  const signup = useMutation({ mutationFn: (data: NewsletterInput) => http.post("/newsletter", data) });

  if (signup.isSuccess) {
    return (
      <p className={styles.formDone} role="status">
        Thank you! You&apos;re on the list.
      </p>
    );
  }

  const error = errors.email?.message ?? (signup.error instanceof ApiError ? signup.error.message : null);
  return (
    <form className={styles.form} onSubmit={handleSubmit((d) => signup.mutate(d))} noValidate>
      <div className={styles.formRow}>
        <label className="visually-hidden" htmlFor="newsletter-email">
          Email address
        </label>
        <input
          id="newsletter-email"
          type="email"
          autoComplete="email"
          placeholder="Enter your email"
          className={styles.input}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "newsletter-error" : undefined}
          {...register("email")}
        />
        <input
          type="text"
          tabIndex={-1}
          autoComplete="off"
          className={styles.hp}
          aria-hidden="true"
          {...register("website")}
        />
        <button type="submit" className={styles.submit} disabled={signup.isPending}>
          {signup.isPending ? "Sending…" : "Subscribe"}
        </button>
      </div>
      {error && (
        <p id="newsletter-error" className={styles.formError} role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
