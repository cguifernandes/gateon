import {
  isTelegramMemberGoneStatus,
  isTelegramMemberLookupGoneError,
} from './telegram-member-presence';

describe('telegram member presence', () => {
  describe('isTelegramMemberGoneStatus', () => {
    it('detects left and kicked statuses', () => {
      expect(isTelegramMemberGoneStatus('left')).toBe(true);
      expect(isTelegramMemberGoneStatus('kicked')).toBe(true);
    });

    it('keeps active membership statuses', () => {
      expect(isTelegramMemberGoneStatus('member')).toBe(false);
      expect(isTelegramMemberGoneStatus('administrator')).toBe(false);
      expect(isTelegramMemberGoneStatus('creator')).toBe(false);
    });
  });

  describe('isTelegramMemberLookupGoneError', () => {
    it('detects Telegram lookup errors for missing participants', () => {
      expect(
        isTelegramMemberLookupGoneError('Bad Request: user not found'),
      ).toBe(true);
      expect(
        isTelegramMemberLookupGoneError('Bad Request: USER_NOT_PARTICIPANT'),
      ).toBe(true);
    });
  });
});
