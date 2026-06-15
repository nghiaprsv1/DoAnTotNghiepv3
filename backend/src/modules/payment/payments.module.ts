import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Wallet } from '@/modules/guide/entities/wallet.entity';
import { WalletTransaction } from '@/modules/guide/entities/wallet-transaction.entity';
import { User } from '@/modules/user/entities/user.entity';
import { NotificationsModule } from '@/modules/notification/notifications.module';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Wallet, WalletTransaction, User]),
    NotificationsModule,
  ],
  providers: [PaymentsService],
  controllers: [PaymentsController],
  exports: [PaymentsService],
})
export class PaymentsModule {}
