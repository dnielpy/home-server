import { describe, expect, it } from "vitest";
import { getDownloadLibraryStatus } from "./utils/formats";
import { initialDownloadFileName, validateDownloadUrl } from "./utils/validation";

describe("downloads utilities", () => {
  it("accepts only direct HTTP(S) links without credentials", () => {
    expect(validateDownloadUrl(" https://example.test/video.mp4 ")).toBe("https://example.test/video.mp4");
    expect(() => validateDownloadUrl("ftp://example.test/video.mp4")).toThrow();
    expect(() => validateDownloadUrl("https://user:secret@example.test/video.mp4")).toThrow();
  });

  it("derives a safe initial filename and destination compatibility", () => {
    expect(initialDownloadFileName("https://example.test/path/video%20one.mp4")).toBe("video one.mp4");
    expect(getDownloadLibraryStatus("localtube", "video.mp4")).toBe("available");
    expect(getDownloadLibraryStatus("localtube", "archive.zip")).toBe("unsupported");
    expect(getDownloadLibraryStatus("gallery", "photo.webp")).toBe("available");
  });
});
