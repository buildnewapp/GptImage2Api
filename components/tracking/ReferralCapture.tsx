"use client";

import { captureInviteCodeFromLocation } from "@/lib/referrals/cookie";
import { useEffect } from "react";

export default function ReferralCapture() {
  useEffect(() => {
    captureInviteCodeFromLocation();
  }, []);

  return null;
}
