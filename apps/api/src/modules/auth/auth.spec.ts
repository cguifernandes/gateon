import { Test, type TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { deleteAccountSchema, updateProfileSchema, passwordResetRequestSchema, passwordResetConfirmSchema } from '../../lib/zod/auth-schemas';

describe('deleteAccountSchema', () => {
  it('accepts explicit confirmation', () => {
    const result = deleteAccountSchema.safeParse({ confirm: true });
    expect(result.success).toBe(true);
  });

  it('rejects missing confirmation', () => {
    const result = deleteAccountSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects false confirmation', () => {
    const result = deleteAccountSchema.safeParse({ confirm: false });
    expect(result.success).toBe(false);
  });
});

describe('updateProfileSchema', () => {
  it('accepts name update', () => {
    const result = updateProfileSchema.safeParse({ name: 'Maria Silva' });
    expect(result.success).toBe(true);
  });

  it('rejects short name', () => {
    const result = updateProfileSchema.safeParse({ name: 'A' });
    expect(result.success).toBe(false);
  });

  it('accepts clearing image', () => {
    const result = updateProfileSchema.safeParse({ image: '' });
    expect(result.success).toBe(true);
  });
});

describe('passwordResetRequestSchema', () => {
  it('accepts valid email', () => {
    const result = passwordResetRequestSchema.safeParse({
      email: 'user@example.com',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid email', () => {
    const result = passwordResetRequestSchema.safeParse({ email: 'invalid' });
    expect(result.success).toBe(false);
  });
});

describe('passwordResetConfirmSchema', () => {
  it('accepts matching passwords', () => {
    const result = passwordResetConfirmSchema.safeParse({
      token: 'reset-token',
      password: 'new-password',
      confirmPassword: 'new-password',
    });
    expect(result.success).toBe(true);
  });

  it('rejects mismatched passwords', () => {
    const result = passwordResetConfirmSchema.safeParse({
      token: 'reset-token',
      password: 'new-password',
      confirmPassword: 'other-password',
    });
    expect(result.success).toBe(false);
  });
});

describe('AuthService', () => {
  let service: AuthService;
  const usersDelete = jest.fn();
  const usersUpdate = jest.fn();
  const usersFindUniqueOrThrow = jest.fn();
  const accountsFindMany = jest.fn();
  const sessionsDeleteMany = jest.fn();
  const sessionsFindMany = jest.fn();
  const telegramGroupsCount = jest.fn();
  const telegramGroupMembersCount = jest.fn();
  const telegramAlertsCount = jest.fn();
  const stripeBillingConnectionsCount = jest.fn();

  beforeEach(async () => {
    usersDelete.mockReset();
    usersUpdate.mockReset();
    usersFindUniqueOrThrow.mockReset();
    accountsFindMany.mockReset();
    sessionsDeleteMany.mockReset();
    sessionsFindMany.mockReset();
    telegramGroupsCount.mockReset();
    telegramGroupMembersCount.mockReset();
    telegramAlertsCount.mockReset();
    stripeBillingConnectionsCount.mockReset();

    usersDelete.mockResolvedValue({ id: 'user-1' });
    usersUpdate.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      name: 'Updated',
      image: null,
      emailVerified: true,
      planId: 'free',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-06-01T00:00:00.000Z'),
    });
    usersFindUniqueOrThrow.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      name: 'User',
      image: null,
      emailVerified: true,
      planId: 'free',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-06-01T00:00:00.000Z'),
    });
    accountsFindMany.mockResolvedValue([
      {
        id: 'acc-1',
        providerId: 'credentials',
        password: 'hash',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      },
    ]);
    sessionsDeleteMany.mockResolvedValue({ count: 1 });
    sessionsFindMany.mockResolvedValue([
      {
        id: 'session-current',
        createdAt: new Date('2026-06-01T00:00:00.000Z'),
        updatedAt: new Date('2026-06-01T00:00:00.000Z'),
        expiresAt: new Date('2026-06-08T00:00:00.000Z'),
        ipHash: 'ip-hash',
        userAgentHash: null,
      },
    ]);
    telegramGroupsCount.mockResolvedValue(2);
    telegramGroupMembersCount.mockResolvedValue(48);
    telegramAlertsCount.mockResolvedValue(3);
    stripeBillingConnectionsCount.mockResolvedValue(1);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: {
            users: {
              delete: usersDelete,
              update: usersUpdate,
              findUniqueOrThrow: usersFindUniqueOrThrow,
            },
            accounts: { findMany: accountsFindMany },
            sessions: {
              deleteMany: sessionsDeleteMany,
              findMany: sessionsFindMany,
            },
            telegramGroups: { count: telegramGroupsCount },
            telegramGroupMembers: { count: telegramGroupMembersCount },
            telegramAlerts: { count: telegramAlertsCount },
            stripeBillingConnections: {
              count: stripeBillingConnectionsCount,
            },
          },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  describe('deleteAccount', () => {
    it('deletes the user and clears the session cookie', async () => {
      const clearCookie = jest.fn();
      const req = {
        cookies: { 'gateon.session': 'session-token' },
      } as never;
      const res = { clearCookie } as never;

      const result = await service.deleteAccount('user-1', req, res);

      expect(usersDelete).toHaveBeenCalledWith({ where: { id: 'user-1' } });
      expect(sessionsDeleteMany).toHaveBeenCalled();
      expect(clearCookie).toHaveBeenCalled();
      expect(result).toEqual({ ok: true });
    });
  });

  describe('getProfile', () => {
    it('returns profile payload with sessions and stats', async () => {
      const result = await service.getProfile('user-1', 'session-current');

      expect(result.user.email).toBe('user@example.com');
      expect(result.accounts).toHaveLength(1);
      expect(result.sessions[0]?.isCurrent).toBe(true);
      expect(result.stats).toEqual({
        telegramGroups: 2,
        members: 48,
        alerts: 3,
        stripeConnections: 1,
      });
    });
  });

  describe('updateProfile', () => {
    it('updates user fields', async () => {
      const result = await service.updateProfile('user-1', { name: 'Updated' });

      expect(usersUpdate).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { name: 'Updated' },
        select: expect.any(Object),
      });
      expect(result.user.name).toBe('Updated');
    });
  });

  describe('revokeSession', () => {
    it('rejects revoking current session', async () => {
      await expect(
        service.revokeSession('user-1', 'session-current', 'session-current'),
      ).rejects.toThrow('Não é possível encerrar a sessão atual');
    });
  });
});
