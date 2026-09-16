import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { EmailPayload } from "@/lib/email/providers";

export async function readRecallAttachment(
  projectDir = process.cwd(),
): Promise<EmailPayload["attachments"]> {
  try {
    const content = await readFile(
      resolve(projectDir, "public/emails/product-guide.pdf"),
    );
    // Leave room for base64 and message content within the smallest provider limit.
    if (
      content.length > 3 * 1024 * 1024 ||
      content.subarray(0, 5).toString() !== "%PDF-"
    ) {
      console.warn(
        "Recall PDF is invalid or exceeds 3 MiB; sending without attachment.",
      );
      return undefined;
    }
    return [
      {
        filename: "product-guide.pdf",
        content: content.toString("base64"),
        contentType: "application/pdf",
      },
    ];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      console.warn("Unable to read recall PDF; sending without attachment.");
    }
    return undefined;
  }
}
