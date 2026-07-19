import rateLimit from "express-rate-limit";

export const aiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Çok fazla istek gönderildi. Lütfen kısa süre sonra tekrar dene."
  }
});
