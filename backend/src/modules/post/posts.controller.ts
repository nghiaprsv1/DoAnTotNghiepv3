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
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '@/modules/auth/guards/optional-jwt-auth.guard';
import { JwtUserPayload } from '@/common/types/jwt-payload.type';
import { PostsService } from './posts.service';
import {
  CreateCommentDto,
  CreatePostDto,
  QueryPostsDto,
  UpdatePostDto,
} from './dto/post.dto';

@ApiTags('Posts')
@Controller('posts')
export class PostsController {
  constructor(private readonly posts: PostsService) {}

  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Get()
  list(@Query() q: QueryPostsDto, @CurrentUser() viewer?: JwtUserPayload) {
    return this.posts.list(q, viewer?.sub);
  }

  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Get(':id')
  detail(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() viewer?: JwtUserPayload,
  ) {
    return this.posts.detail(id, viewer?.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(
    @CurrentUser() user: JwtUserPayload,
    @Body() dto: CreatePostDto,
  ) {
    return this.posts.create(user.sub, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  update(
    @CurrentUser() user: JwtUserPayload,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdatePostDto,
  ) {
    return this.posts.update(id, user.sub, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async remove(
    @CurrentUser() user: JwtUserPayload,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    await this.posts.remove(id, user.sub);
    return null;
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/like')
  toggleLike(
    @CurrentUser() user: JwtUserPayload,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.posts.toggleLike(id, user.sub);
  }

  /** Public — anyone who can see the post can see who liked it. */
  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Get(':id/likes')
  listLikes(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @CurrentUser() viewer?: JwtUserPayload,
  ) {
    return this.posts.listLikers(
      id,
      viewer?.sub,
      Number(page) || 1,
      Math.min(Number(pageSize) || 30, 100),
    );
  }

  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Get(':id/comments')
  comments(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() viewer?: JwtUserPayload,
  ) {
    return this.posts.listComments(id, viewer?.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/comments')
  addComment(
    @CurrentUser() user: JwtUserPayload,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: CreateCommentDto,
  ) {
    return this.posts.addComment(id, user.sub, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('comments/:cid/like')
  toggleCommentLike(
    @CurrentUser() user: JwtUserPayload,
    @Param('cid', new ParseUUIDPipe()) cid: string,
  ) {
    return this.posts.toggleCommentLike(cid, user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('comments/:cid')
  async removeComment(
    @CurrentUser() user: JwtUserPayload,
    @Param('cid', new ParseUUIDPipe()) cid: string,
  ) {
    await this.posts.removeComment(cid, user.sub);
    return null;
  }
}
