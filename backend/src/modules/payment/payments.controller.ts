import {
  Body,
  Controller,
  Headers,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Public } from '@/common/decorators/public.decorator';
import { PaymentsService, SepayWebhookPayload } from './payments.service';
import { JwtUserPayload } from '@/common/types/jwt-payload.type';

interface CreateIntentBody {
  amount: number
}

@ApiTags('Payments')
@Controller('payments/sepay')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  /**
   * Authenticated endpoint — the FE calls this when the user clicks
   * "Nạp qua SePay" so we can return a unique transfer code + QR.
   */
  @UseGuards(JwtAuthGuard)
  @Post('intent')
  createIntent(@CurrentUser() user: JwtUserPayload, @Body() body: CreateIntentBody) {
    return this.payments.createIntent(user.sub, Number(body.amount));
  }

  /**
   * Public webhook — SePay POSTs here when a real bank transfer arrives.
   * Auth via the SEPAY_WEBHOOK_TOKEN header (Authorization: Apikey ...).
   */
  @Public()
  @Post('webhook')
  webhook(
    @Headers('authorization') authHeader: string,
    @Body() payload: SepayWebhookPayload,
  ) {
    return this.payments.handleWebhook(authHeader, payload);
  }
}
