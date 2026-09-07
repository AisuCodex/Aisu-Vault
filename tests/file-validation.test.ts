import { describe, expect, it } from "vitest";
import { MAX_FILE_SIZE, validateFile } from "../lib/file-validation";

describe("validateFile", () => {
  it("accepts supported files within the size limit", () => {
    expect(validateFile({ size: 1024, type: "application/pdf" } as File)).toBeNull();
  });
  it("rejects files above 25 MB", () => {
    expect(validateFile({ size: MAX_FILE_SIZE + 1, type: "application/pdf" } as File)).toMatch(/25 MB/);
  });
  it("rejects unsupported MIME types", () => {
    expect(validateFile({ size: 1024, type: "application/zip" } as File)).toMatch(/not supported/);
  });
});
