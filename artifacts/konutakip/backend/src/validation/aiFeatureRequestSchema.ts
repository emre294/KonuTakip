import { z } from "zod";

export const aiFeatureRequestSchema = z.record(
  z.string(),
  z.unknown()
);

export type AIFeatureRequest = z.infer<typeof aiFeatureRequestSchema>;
