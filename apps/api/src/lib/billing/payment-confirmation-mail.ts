import { Logger } from '@nestjs/common';
import { buildPaymentConfirmationEmailContent } from './payment-confirmation-email-template';

const logger = new Logger('PaymentConfirmationMail');

type SendPaymentConfirmationEmailInput = {
  to: string;
  userName: string | null;
  planName: string;
};

export async function sendPaymentConfirmationEmail(
  input: SendPaymentConfirmationEmailInput,
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from =
    process.env.PASSWORD_RESET_FROM_EMAIL?.trim() ??
    'Gateon <noreply@gateon.app>';
  const supportEmail =
    process.env.GATEON_SUPPORT_EMAIL?.trim() ?? 'suporte@gateon.app';

  const { subject, text, html } = buildPaymentConfirmationEmailContent({
    userName: input.userName,
    planName: input.planName,
    supportEmail,
  });

  if (!apiKey) {
    logger.warn(
      `RESEND_API_KEY not set — payment confirmation email not sent to ${input.to}`,
    );
    return;
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
      `Failed to send payment confirmation email (${response.status}): ${body}`,
    );
    throw new Error('Failed to send payment confirmation email.');
  }

  logger.log(`Payment confirmation email sent to ${input.to}`);
}

