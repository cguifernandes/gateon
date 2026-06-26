export type PasswordResetEmailInput = {
  resetUrl: string;
  expiresAt: Date;
};

export type PasswordResetEmailContent = {
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

function formatExpiry(expiresAt: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(expiresAt);
}

function resolveSiteUrl(resetUrl: string): string {
  try {
    return new URL(resetUrl).origin;
  } catch {
    return 'https://gateon.app';
  }
}

function buildLogoHtml(): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="vertical-align:middle;padding-right:10px;">
          <div style="width:36px;height:36px;border-radius:12px;background:linear-gradient(135deg, ${BRAND.primary} 0%, ${BRAND.primaryDark} 100%);text-align:center;line-height:36px;box-shadow:0 4px 14px rgba(59,130,246,0.28);">
            <span style="color:#ffffff;font-size:18px;font-weight:700;font-family:Inter,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">G</span>
          </div>
        </td>
        <td style="vertical-align:middle;font-family:Inter,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:20px;font-weight:700;letter-spacing:-0.02em;color:${BRAND.foreground};">
          Gate<span style="color:${BRAND.primary};">on</span>
        </td>
      </tr>
    </table>
  `.trim();
}

function buildHtmlTemplate(
  input: PasswordResetEmailInput,
  expiryLabel: string,
): string {
  const resetUrl = escapeHtml(input.resetUrl);
  const siteUrl = escapeHtml(resolveSiteUrl(input.resetUrl));

  return `
<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="color-scheme" content="light" />
    <meta name="supported-color-schemes" content="light" />
    <title>Redefinição de senha — Gateon</title>
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
                  Redefinição de senha
                </h1>
                <p style="margin:12px 0 0 0;font-size:15px;text-align:center;line-height:1.6;color:${BRAND.muted};">
                  Recebemos uma solicitação para redefinir a senha da sua conta Gateon.
                  Clique no botão abaixo para criar uma nova senha.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 28px 8px 28px;" align="center">
                <a href="${resetUrl}" style="display:inline-block;background-color:${BRAND.primary};color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;line-height:1;padding:14px 28px;border-radius:10px;box-shadow:0 8px 20px rgba(59,130,246,0.28);">
                  Redefinir senha
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 28px 0 28px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${BRAND.notice};border:1px solid ${BRAND.border};border-radius:14px;">
                  <tr>
                    <td style="padding:14px 16px;font-size:13px;text-align:center;line-height:1.5;color:${BRAND.muted};">
                      <strong style="color:${BRAND.foreground};">Validade do link:</strong>
                      expira em ${escapeHtml(expiryLabel)}.
                      Por segurança, ele só pode ser usado uma vez.
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 28px 0 28px;">
                <p style="margin:0;font-size:13px;text-align:center;line-height:1.6;color:${BRAND.muted};">
                  Se você não solicitou esta alteração, ignore este e-mail. Sua senha atual continuará válida.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 28px 28px 28px;">
                <p style="margin:0;font-size:12px;text-align:center;line-height:1.6;color:${BRAND.muted};word-break:break-all;">
                  Se o botão não funcionar, copie e cole este link no navegador:<br />
                  <a href="${resetUrl}" style="color:${BRAND.primary};text-decoration:underline;">${resetUrl}</a>
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

function buildTextTemplate(
  input: PasswordResetEmailInput,
  expiryLabel: string,
): string {
  return [
    'Gateon — Redefinição de senha',
    '',
    'Recebemos uma solicitação para redefinir a senha da sua conta Gateon.',
    '',
    `Redefinir senha: ${input.resetUrl}`,
    '',
    `Este link expira em ${expiryLabel}.`,
    'Por segurança, o link só pode ser usado uma vez.',
    '',
    'Se você não solicitou esta alteração, ignore este e-mail.',
    'Sua senha atual continuará válida.',
  ].join('\n');
}

export function buildPasswordResetEmailContent(
  input: PasswordResetEmailInput,
): PasswordResetEmailContent {
  const expiryLabel = formatExpiry(input.expiresAt);

  return {
    subject: 'Redefinição de senha — Gateon',
    text: buildTextTemplate(input, expiryLabel),
    html: buildHtmlTemplate(input, expiryLabel),
  };
}
