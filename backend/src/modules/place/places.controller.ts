import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '@/common/decorators/public.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { UserRole } from '@/common/enums/user-role.enum';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { PlacesService } from './places.service';
import {
  CreatePlaceDto,
  QueryPlacesDto,
  UpdatePlaceDto,
} from './dto/place.dto';

@ApiTags('Places')
@Controller('places')
export class PlacesController {
  constructor(private readonly places: PlacesService) {}

  @Public()
  @Get()
  list(@Query() q: QueryPlacesDto) {
    return this.places.list(q);
  }

  @Public()
  @Get('categories')
  categories() {
    return this.places.listCategories();
  }

  @Public()
  @Get('provinces')
  provinces() {
    return this.places.listProvinces();
  }

  @Public()
  @Get(':id')
  detail(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.places.findById(id);
  }

  @Public()
  @Get('slug/:slug')
  bySlug(@Param('slug') slug: string) {
    return this.places.findBySlug(slug);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post()
  create(@Body() dto: CreatePlaceDto) {
    return this.places.create(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Put(':id')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdatePlaceDto,
  ) {
    return this.places.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Delete(':id')
  async remove(@Param('id', new ParseUUIDPipe()) id: string) {
    await this.places.remove(id);
    return null;
  }
}
