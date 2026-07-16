import { generateStorageKey } from "@/lib/storage/generate-key";

export function generateDocumentStorageKey(originalFilename: string): string {
  return generateStorageKey("documents", originalFilename);
}
