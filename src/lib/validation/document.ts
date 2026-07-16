import { z } from "zod";

// Validates the non-file fields of a document upload. The file itself
// arrives as a separate FormData entry and is validated directly in the
// route (type/size checks don't fit zod's usual JSON-body shape well).
export const documentMetadataSchema = z.object({
  title: z.string().trim().min(1, { error: "Title is required." }),
  category: z.string().trim().min(1, { error: "Category is required." }),
});

export type DocumentMetadataInput = z.infer<typeof documentMetadataSchema>;
