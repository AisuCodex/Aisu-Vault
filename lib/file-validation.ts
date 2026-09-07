export const MAX_FILE_SIZE = 25 * 1024 * 1024;
export const ACCEPTED_FILE_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/png",
  "image/jpeg",
] as const;

export function validateFile(file: Pick<File, "size" | "type">) {
  if (file.size > MAX_FILE_SIZE) return "Files must be 25 MB or smaller.";
  if (!ACCEPTED_FILE_TYPES.includes(file.type as (typeof ACCEPTED_FILE_TYPES)[number])) return "This file type is not supported.";
  return null;
}
