import { Test, type TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GroupLimitService } from './group-limits.service';

describe('GroupLimitService', () => {
  let service: GroupLimitService;
  const usersFindUnique = jest.fn();
  const telegramGroupsCount = jest.fn();
  const telegramGroupsFindUnique = jest.fn();

  beforeEach(async () => {
    usersFindUnique.mockReset();
    telegramGroupsCount.mockReset();
    telegramGroupsFindUnique.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GroupLimitService,
        {
          provide: PrismaService,
          useValue: {
            users: { findUnique: usersFindUnique },
            telegramGroups: {
              count: telegramGroupsCount,
              findUnique: telegramGroupsFindUnique,
            },
          },
        },
      ],
    }).compile();

    service = module.get(GroupLimitService);
  });

  it('resolvePlanId returns user plan or free default', async () => {
    usersFindUnique.mockResolvedValue({ planId: 'starter' });
    await expect(service.resolvePlanId('user-1')).resolves.toBe('starter');

    usersFindUnique.mockResolvedValue(null);
    await expect(service.resolvePlanId('missing')).resolves.toBe('free');
  });

  it('assertCanConnectNewGroup allows reconnecting owned chat', async () => {
    telegramGroupsFindUnique.mockResolvedValue({ userId: 'user-1' });

    await expect(
      service.assertCanConnectNewGroup('user-1', '-1001'),
    ).resolves.toBeUndefined();

    expect(telegramGroupsCount).not.toHaveBeenCalled();
  });

  it('assertCanConnectNewGroup throws when group limit is reached', async () => {
    usersFindUnique.mockResolvedValue({ planId: 'free' });
    telegramGroupsCount.mockResolvedValue(1);

    await expect(
      service.assertCanConnectNewGroup('user-1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('assertFeature throws when plan does not include feature', async () => {
    usersFindUnique.mockResolvedValue({ planId: 'free' });

    await expect(
      service.assertFeature('user-1', 'stripeWebhook'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('assertFeature passes for included feature', async () => {
    usersFindUnique.mockResolvedValue({ planId: 'starter' });

    await expect(
      service.assertFeature('user-1', 'stripeWebhook'),
    ).resolves.toBeUndefined();
  });
});
