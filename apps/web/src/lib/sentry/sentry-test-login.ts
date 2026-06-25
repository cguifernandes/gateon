export const SENTRY_TEST_LOGIN_EMAIL = "sentry-test@gateon.app";

export function isSentryTestLoginEmail(email: string): boolean {
  return email.trim().toLowerCase() === SENTRY_TEST_LOGIN_EMAIL;
}

export function createSentryTestLoginError(): Error {
  return new Error("Gateon intentional Sentry login test error");
}
