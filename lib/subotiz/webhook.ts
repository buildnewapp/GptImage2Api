import { createHmac, timingSafeEqual } from "node:crypto";

function signaturesEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left.toLowerCase());
  const rightBuffer = Buffer.from(right.toLowerCase());

  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

export function verifySubotizSignature({
  body,
  secret,
  signature,
  timestamp,
}: {
  body: string;
  secret: string;
  signature: string;
  timestamp: string;
}): boolean {
  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${body}`)
    .digest("hex");

  return signaturesEqual(expected, signature);
}
