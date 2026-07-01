import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthGuard } from '../../lib/guards/auth.guard';
import { TelegramService } from '../telegram/telegram.service';
import { AlertsService } from './alerts.service';
import {
  alertListQuerySchema,
  alertQuickDispatchSchema,
  alertTemplateCreateSchema,
  alertUpsertSchema,
} from '../../lib/zod/alert-schemas';

@Controller('alerts')
export class AlertsController {
  constructor(
    private readonly alerts: AlertsService,
    private readonly telegram: TelegramService,
  ) {}

  @Get()
  @UseGuards(AuthGuard)
  listAlerts(@Req() req: Request, @Query() query: unknown) {
    const userId = this.getUserId(req);
    return this.alerts.listAlerts(userId, alertListQuerySchema.parse(query));
  }

  @Post()
  @UseGuards(AuthGuard)
  createAlert(@Req() req: Request, @Body() body: unknown) {
    return this.alerts.createAlert(
      this.getUserId(req),
      alertUpsertSchema.parse(body),
    );
  }

  @Get('templates')
  @UseGuards(AuthGuard)
  listTemplates(@Req() req: Request) {
    return this.alerts.listTemplates(this.getUserId(req));
  }

  @Post('templates')
  @UseGuards(AuthGuard)
  createTemplate(@Req() req: Request, @Body() body: unknown) {
    return this.alerts.createTemplate(
      this.getUserId(req),
      alertTemplateCreateSchema.parse(body),
    );
  }

  @Post('internal/trigger')
  triggerInternalAlert(
    @Headers('x-gateon-bot-secret') secret: string | undefined,
    @Body() body: unknown,
  ) {
    if (!this.telegram.isInternalSecretValid(secret)) {
      throw new UnauthorizedException();
    }

    return this.alerts.handleInternalTrigger(body);
  }

  @Get('groups/:groupId/forum-topics')
  @UseGuards(AuthGuard)
  listForumTopics(@Req() req: Request, @Param('groupId') groupId: string) {
    return this.telegram.listForumTopics(this.getUserId(req), groupId);
  }

  @Get(':alertId')
  @UseGuards(AuthGuard)
  getAlert(@Req() req: Request, @Param('alertId') alertId: string) {
    return this.alerts.getAlert(this.getUserId(req), alertId);
  }

  @Patch(':alertId')
  @UseGuards(AuthGuard)
  updateAlert(
    @Req() req: Request,
    @Param('alertId') alertId: string,
    @Body() body: unknown,
  ) {
    return this.alerts.updateAlert(
      this.getUserId(req),
      alertId,
      alertUpsertSchema.parse(body),
    );
  }

  @Post(':alertId/duplicate')
  @UseGuards(AuthGuard)
  duplicateAlert(@Req() req: Request, @Param('alertId') alertId: string) {
    return this.alerts.duplicateAlert(this.getUserId(req), alertId);
  }

  @Post(':alertId/pause')
  @UseGuards(AuthGuard)
  pauseAlert(@Req() req: Request, @Param('alertId') alertId: string) {
    return this.alerts.pauseAlert(this.getUserId(req), alertId);
  }

  @Post(':alertId/activate')
  @UseGuards(AuthGuard)
  activateAlert(@Req() req: Request, @Param('alertId') alertId: string) {
    return this.alerts.activateAlert(this.getUserId(req), alertId);
  }

  @Post(':alertId/run')
  @UseGuards(AuthGuard)
  async runAlert(@Req() req: Request, @Param('alertId') alertId: string) {
    await this.alerts.getAlert(this.getUserId(req), alertId);
    return this.alerts.runAlert(alertId);
  }

  @Post(':alertId/dispatch')
  @UseGuards(AuthGuard)
  dispatchQuickAlert(
    @Req() req: Request,
    @Param('alertId') alertId: string,
    @Body() body: unknown,
  ) {
    return this.alerts.dispatchQuickAlert(
      this.getUserId(req),
      alertId,
      alertQuickDispatchSchema.parse(body),
    );
  }

  @Post(':alertId/test')
  @UseGuards(AuthGuard)
  async testAlert(@Req() req: Request, @Param('alertId') alertId: string) {
    await this.alerts.getAlert(this.getUserId(req), alertId);
    return this.alerts.runAlert(alertId);
  }

  @Get(':alertId/runs')
  @UseGuards(AuthGuard)
  listRuns(@Req() req: Request, @Param('alertId') alertId: string) {
    return this.alerts.listRuns(this.getUserId(req), alertId);
  }

  @Get(':alertId/runs/:runId/deliveries')
  @UseGuards(AuthGuard)
  listDeliveries(
    @Req() req: Request,
    @Param('alertId') alertId: string,
    @Param('runId') runId: string,
  ) {
    return this.alerts.listDeliveries(this.getUserId(req), alertId, runId);
  }

  @Delete(':alertId')
  @UseGuards(AuthGuard)
  deleteAlert(@Req() req: Request, @Param('alertId') alertId: string) {
    return this.alerts.deleteAlert(this.getUserId(req), alertId);
  }

  private getUserId(req: Request) {
    const userId = req.authSession?.userId;
    if (!userId) {
      throw new UnauthorizedException();
    }
    return userId;
  }
}
