import { generateStorageKey } from "@/lib/storage/generate-key";

export function generateProfilePictureStorageKey(originalFilename: string): string {
  return generateStorageKey("profile-pictures", originalFilename);
}
