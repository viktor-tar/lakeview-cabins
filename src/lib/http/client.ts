/** Browser HTTP client for this app's own API. Turns error responses into ApiError with a readable message. */
import axios, { AxiosError } from "axios";

export class ApiError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number,
  ) {
    super(message);
  }
}

export const http = axios.create({ baseURL: "/api", timeout: 20_000, headers: { "Content-Type": "application/json" } });

http.interceptors.response.use(
  (res) => res,
  (err: AxiosError<{ error?: { code?: string; message?: string } }>) => {
    const body = err.response?.data?.error;
    if (body?.message) throw new ApiError(body.message, body.code ?? "error", err.response?.status ?? 0);
    if (err.code === "ECONNABORTED") throw new ApiError("The request timed out. Please try again.", "timeout", 0);
    if (!err.response) throw new ApiError("Couldn't reach the server. Check your connection.", "network", 0);
    throw new ApiError("Something went wrong. Please try again.", "server_error", err.response.status);
  },
);
