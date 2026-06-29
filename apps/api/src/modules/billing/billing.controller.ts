import { Controller } from '@nestjs/common';

@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @UseGuards(AuthGuard)
  @Post('checkout')
  createCheckout(@Req() req: Request, @Body() dto: CreateCheckoutDto) {
    return this.billingService.createCheckout(
      req.authSession!.userId,
      dto.plan,
    );
  }

  @UseGuards(AuthGuard)
  @Post('portal')
  createPortal(@Req() req: Request) {
    return this.billingService.createPortal(req.authSession!.userId);
  }

  @UseGuards(AuthGuard)
  @Get('subscription')
  getSubscription(@Req() req: Request) {
    return this.billingService.getSubscription(req.authSession!.userId);
  }
}
