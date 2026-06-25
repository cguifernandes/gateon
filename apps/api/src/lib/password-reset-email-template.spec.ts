import { buildPasswordResetEmailContent } from './password-reset-email-template';

describe('buildPasswordResetEmailContent', () => {
  const expiresAt = new Date('2026-06-23T18:30:00.000Z');

  it('builds subject and plain text with reset URL', () => {
    const content = buildPasswordResetEmailContent({
      resetUrl: 'http://localhost:3000/reset-password?token=abc',
      expiresAt,
    });

    expect(content.subject).toBe('Redefinição de senha — Gateon');
    expect(content.text).toContain(
      'http://localhost:3000/reset-password?token=abc',
    );
    expect(content.text).toContain(
      'Por segurança, o link só pode ser usado uma vez.',
    );
  });

  it('builds branded HTML with CTA and escaped content', () => {
    const content = buildPasswordResetEmailContent({
      resetUrl:
        'http://localhost:3000/reset-password?token=abc&x=<script>alert(1)</script>',
      expiresAt,
    });

    expect(content.html).toContain(
      'Gate<span style="color:#3b82f6;">on</span>',
    );
    expect(content.html).toContain('Redefinir senha');
    expect(content.html).toContain('background-color:#3b82f6');
    expect(content.html).not.toContain('<script>');
    expect(content.html).toContain('&lt;script&gt;');
  });
});
