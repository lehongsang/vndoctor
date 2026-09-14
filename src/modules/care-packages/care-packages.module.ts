import { Facility } from '@/modules/facilities/entities/facility.entity';
import { StaffUser } from '@/modules/staff/entities/staff-user.entity';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CarePackagesController } from './care-packages.controller';
import { CarePackagesService } from './care-packages.service';
import { CarePackage } from './entities/care-package.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CarePackage, Facility, StaffUser])],
  controllers: [CarePackagesController],
  providers: [CarePackagesService],
  exports: [CarePackagesService],
})
export class CarePackagesModule {}
