import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StaffUser } from './entities/staff-user.entity';
import { StaffService } from './staff.service';
import { StaffController } from './staff.controller';
import { FacilitiesModule } from '@/modules/facilities/facilities.module';

@Module({
  imports: [TypeOrmModule.forFeature([StaffUser]), FacilitiesModule],
  controllers: [StaffController],
  providers: [StaffService],
  exports: [StaffService],
})
export class StaffModule {}
