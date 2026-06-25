import { Logger } from '@nestjs/common';
import { buildPasswordResetEmailContent } from './password-reset-email-template';

const logger = new Logger('PasswordResetMail');

type SendPasswordResetEmailInput = {
  to: string;
  resetUrl: string;
  expiresAt: Date;
};

function shouldLogResetLinkInDev(): boolean {
  if (process.env.NODE_ENV === 'production') {
    return false;
  }

  const raw = process.env.PASSWORD_RESET_LOG_LINK_IN_DEV?.trim().toLowerCase();
  if (raw === 'false' || raw === '0') {
    return false;
  }

  return true;
}

export async function sendPasswordResetEmail(
  input: SendPasswordResetEmailInput,
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from =
    process.env.PASSWORD_RESET_FROM_EMAIL?.trim() ??
    'Gateon <noreply@gateon.app>';
  const { subject, text, html } = buildPasswordResetEmailContent({
    resetUrl: input.resetUrl,
    expiresAt: input.expiresAt,
  });

  if (!apiKey) {
    if (shouldLogResetLinkInDev()) {
      logger.warn(
        `RESEND_API_KEY not set — password reset link for ${input.to}: ${input.resetUrl}`,
      );
      return;
    }

    throw new Error('Password reset email is not configured.');
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject,
      text,
      html,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    logger.error(
      `Failed to send password reset email (${response.status}): ${body}`,
    );
    throw new Error('Failed to send password reset email.');
  }
}
