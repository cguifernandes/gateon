import { Test, type TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { deleteAccountSchema } from '../../lib/zod/auth-schemas';

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

describe('AuthService', () => {
  let service: AuthService;
  const usersDelete = jest.fn();
  const sessionsDeleteMany = jest.fn();

  beforeEach(async () => {
    usersDelete.mockReset();
    sessionsDeleteMany.mockReset();
    usersDelete.mockResolvedValue({ id: 'user-1' });
    sessionsDeleteMany.mockResolvedValue({ count: 1 });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: {
            users: { delete: usersDelete },
            sessions: { deleteMany: sessionsDeleteMany },
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
});
