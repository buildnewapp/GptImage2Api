'use server';

import resend from '@/lib/resend';

export async function removeUserFromContacts(email: string) {
  try {
    if ((process.env.EMAIL_PROVIDER?.trim() || "resend") !== "resend" || !email || !resend) {
      return;
    }

    await resend.contacts.remove({
      email,
    });

  } catch (error) {
    console.error('Failed to remove user from Resend contacts:', error);
    // Silently fail - we don't care about the result
  }
}