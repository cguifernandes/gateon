export type PaymentConfirmationEmailInput = {
  userName: string | null;
  planName: string;
  supportEmail: string;
};

export type PaymentConfirmationEmailContent = {
  subject: string;
  text: string;
  html: string;
};

const BRAND = {
  primary: '#3b82f6',
  primaryDark: '#2563eb',
  primarySoft: '#eff6ff',
  foreground: '#0f172a',
  muted: '#64748b',
  border: '#e2e8f0',
  surface: '#eff4ff',
  card: '#ffffff',
  notice: '#f0f4f8',
} as const;

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function resolveSiteUrl(): string {
  try {
    const url = process.env.WEB_BASE_URL ?? 'https://gateon.app';
    return new URL(url).origin;
  } catch {
    return 'https://gateon.app';
  }
}

const APP_URL =
  process.env.NODE_ENV === 'production'
    ? 'https://gateon.app'
    : 'http://localhost:3000';

function buildLogoHtml(): string {
  const logoUrl = `${APP_URL}/logo.svg`;

  return `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td align="center" style="text-align:center;">
              <img
                src="${logoUrl}"
                alt="Gateon"
                width="180"
                style="
                  display:block;
                  margin:0 auto;
                  width:180px;
                  max-width:100%;
                  height:auto;
                  border:0;
                  outline:none;
                  text-decoration:none;
                "
              />
            </td>
          </tr>
        </table>
      `.trim();
}

function buildHtmlTemplate(input: PaymentConfirmationEmailInput): string {
  const userName = input.userName?.trim() || 'usuário';
  const displayName = escapeHtml(userName);
  const planName = escapeHtml(input.planName);
  const supportEmail = escapeHtml(input.supportEmail);
  const siteUrl = escapeHtml(resolveSiteUrl());

  return `
<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="color-scheme" content="light" />
    <meta name="supported-color-schemes" content="light" />
    <title>Pagamento confirmado — Gateon</title>
  </head>
  <body style="margin:0;padding:0;background-color:${BRAND.surface};font-family:Inter,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:${BRAND.foreground};-webkit-font-smoothing:antialiased;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${BRAND.surface};padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background-color:${BRAND.card};border:1px solid ${BRAND.border};border-radius:24px;overflow:hidden;box-shadow:0 20px 45px rgba(59,130,246,0.12);">
            <tr>
              <td style="padding:28px 28px 0 28px;">
                ${buildLogoHtml()}
              </td>
            </tr>
            <tr>
              <td style="padding:24px 28px 0 28px;">
                <h1 style="margin:0;font-size:24px;text-align:center;line-height:1.25;font-weight:700;letter-spacing:-0.02em;color:${BRAND.foreground};">
                  Pagamento confirmado!
                </h1>
                <p style="margin:16px 0 0 0;font-size:15px;text-align:center;line-height:1.6;color:${BRAND.muted};">
                  Olá, <strong style="color:${BRAND.foreground};">${displayName}</strong>!
                  Seu pagamento do plano <strong style="color:${BRAND.foreground};">${planName}</strong> foi confirmado com sucesso.
                </p>
                <p style="margin:12px 0 0 0;font-size:15px;text-align:center;line-height:1.6;color:${BRAND.muted};">
                  Agradecemos pela confiança! Sua conta já está com acesso liberado.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 28px 0 28px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${BRAND.notice};border:1px solid ${BRAND.border};border-radius:14px;">
                  <tr>
                    <td style="padding:14px 16px;font-size:13px;text-align:center;line-height:1.5;color:${BRAND.muted};">
                      Precisa de ajuda? Fale com a gente pelo email:<br />
                      <a href="mailto:${supportEmail}" style="color:${BRAND.primary};font-weight:600;text-decoration:underline;font-size:15px;">${supportEmail}</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 28px 28px 28px;">
                <p style="margin:0;font-size:13px;text-align:center;line-height:1.6;color:${BRAND.muted};">
                  Se você não realizou este pagamento, entre em contato conosco imediatamente pelo email <a href="mailto:${supportEmail}" style="color:${BRAND.primary};text-decoration:underline;">${supportEmail}</a>.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 28px;background-color:${BRAND.primarySoft};border-top:1px solid ${BRAND.border};">
                <p style="margin:0;font-size:12px;line-height:1.5;color:${BRAND.muted};text-align:center;">
                  © Gateon · Automação de acesso para grupos Telegram<br />
                  <a href="${siteUrl}" style="color:${BRAND.primary};text-decoration:none;">${siteUrl}</a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
  `.trim();
}

function buildTextTemplate(input: PaymentConfirmationEmailInput): string {
  const userName = input.userName?.trim() || 'usuário';
  const planName = input.planName;
  const supportEmail = input.supportEmail;

  return [
    `Gateon — Pagamento confirmado`,
    '',
    `Olá, ${userName}!`,
    '',
    `Seu pagamento do plano ${planName} foi confirmado com sucesso.`,
    '',
    'Agradecemos pela confiança! Sua conta já está com acesso liberado.',
    '',
    `Precisa de ajuda? Fale com a gente: ${supportEmail}`,
    '',
    `Se você não realizou este pagamento, entre em contato: ${supportEmail}`,
  ].join('\n');
}

export function buildPaymentConfirmationEmailContent(
  input: PaymentConfirmationEmailInput,
): PaymentConfirmationEmailContent {
  return {
    subject: 'Pagamento confirmado — Gateon',
    text: buildTextTemplate(input),
    html: buildHtmlTemplate(input),
  };
}
