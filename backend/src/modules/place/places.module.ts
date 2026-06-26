import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Place } from './entities/place.entity';
import { PlaceImage } from './entities/place-image.entity';
import { Category } from './entities/category.entity';
import { Province } from './entities/province.entity';
import { PlacesService } from './places.service';
import { PlacesController } from './places.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Place,
      PlaceImage,
      Category,
      Province,
    ]),
  ],
  providers: [PlacesService],
  controllers: [PlacesController],
  exports: [PlacesService],
})
export class PlacesModule {}
