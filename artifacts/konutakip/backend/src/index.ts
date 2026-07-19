import express from "express";
import cors from "cors";
import helmet from "helmet";
import { env } from "./config/env.js";
import { aiRouter } from "./routes/ai.js";
import { errorHandler } from "./middleware/errorHandler.js";

const app = express();

app.disable("x-powered-by");

app.use(helmet());

app.use(
  cors({
    origin:
      env.ALLOWED_ORIGINS === "*"
        ? true
        : env.ALLOWED_ORIGINS.split(",").map((origin) => origin.trim())
  })
);

app.use(express.json({ limit: "100kb" }));

app.get("/health", (_request, response) => {
  response.json({
    status: "ok",
    service: "konutakip-backend"
  });
});

app.use("/api/v1/ai", aiRouter);

app.use((_request, response) => {
  response.status(404).json({
    error: "Endpoint bulunamadı."
  });
});

app.use(errorHandler);

app.listen(env.PORT, "0.0.0.0", () => {
  console.log(`KonuTakip backend çalışıyor: http://localhost:${env.PORT}`);
});
