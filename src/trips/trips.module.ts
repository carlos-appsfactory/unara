import { Module } from '@nestjs/common';
import { TripsService } from './trips.service';
import { TripsController } from './trips.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Trip } from './entities/trip.entity';

@Module({
  controllers: [TripsController],
  providers: [TripsService],
  imports: [
    TypeOrmModule.forFeature([ Trip ])
  ]
})
export class TripsModule {}
