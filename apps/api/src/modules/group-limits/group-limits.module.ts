import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { GroupLimitService } from './group-limits.service';

@Module({
  imports: [PrismaModule],
  providers: [GroupLimitService],
  exports: [GroupLimitService],
})
export class GroupLimitsModule {}
