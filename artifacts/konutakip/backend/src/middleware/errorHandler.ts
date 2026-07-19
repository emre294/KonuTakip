import type { ErrorRequestHandler } from "express";

export const errorHandler: ErrorRequestHandler = (
  error,
  _request,
  response,
  _next
) => {
  console.error("Sunucu hatası:", error);

  if (response.headersSent) {
    return;
  }

  const message =
    error instanceof Error
      ? error.message
      : "Beklenmeyen bir sunucu hatası oluştu.";

  response.status(500).json({
    error: message
  });
};
