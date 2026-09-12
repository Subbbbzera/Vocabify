import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { FriendService } from './friend.service';
import { SendMessageDto, EditMessageDto, ReactMessageDto } from './dto/friend.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('friends')
export class FriendController {
  constructor(private readonly friendService: FriendService) {}

  @Get()
  getFriends(@CurrentUser('id') userId: number) {
    return this.friendService.getFriends(userId);
  }

  @Get('requests')
  getRequests(@CurrentUser('id') userId: number) {
    return this.friendService.getRequests(userId);
  }

  @Get('alerts')
  getAlerts(@CurrentUser('id') userId: number) {
    return this.friendService.getIncomingAlerts(userId);
  }

  @Get('search')
  searchUsers(
    @CurrentUser('id') userId: number,
    @Query('q') query: string,
  ) {
    return this.friendService.searchUsers(userId, query);
  }

  @Get('user/:targetUserId/stats')
  getUserDetails(@Param('targetUserId', ParseIntPipe) targetUserId: number) {
    return this.friendService.getUserDetails(targetUserId);
  }

  @Post('request/:targetUserId')
  sendRequest(
    @CurrentUser('id') userId: number,
    @Param('targetUserId', ParseIntPipe) targetUserId: number,
  ) {
    return this.friendService.sendRequest(userId, targetUserId);
  }

  @Post('accept/:requestId')
  acceptRequest(
    @CurrentUser('id') userId: number,
    @Param('requestId', ParseIntPipe) requestId: number,
  ) {
    return this.friendService.acceptRequest(userId, requestId);
  }

  @Post('decline/:requestId')
  declineRequest(
    @CurrentUser('id') userId: number,
    @Param('requestId', ParseIntPipe) requestId: number,
  ) {
    return this.friendService.declineRequest(userId, requestId);
  }

  @Delete(':friendId')
  removeFriend(
    @CurrentUser('id') userId: number,
    @Param('friendId', ParseIntPipe) friendId: number,
  ) {
    return this.friendService.removeFriend(userId, friendId);
  }

  @Get('messages/:friendId')
  getMessages(
    @CurrentUser('id') userId: number,
    @Param('friendId', ParseIntPipe) friendId: number,
  ) {
    return this.friendService.getMessages(userId, friendId);
  }

  @Post('messages/:friendId')
  sendMessage(
    @CurrentUser('id') userId: number,
    @Param('friendId', ParseIntPipe) friendId: number,
    @Body() dto: SendMessageDto,
  ) {
    return this.friendService.sendMessage(userId, friendId, dto.text, dto.replyToId);
  }

  @Patch('messages/:messageId')
  editMessage(
    @CurrentUser('id') userId: number,
    @Param('messageId', ParseIntPipe) messageId: number,
    @Body() dto: EditMessageDto,
  ) {
    return this.friendService.editMessage(userId, messageId, dto.text);
  }

  @Delete('messages/:messageId')
  deleteMessage(
    @CurrentUser('id') userId: number,
    @Param('messageId', ParseIntPipe) messageId: number,
  ) {
    return this.friendService.deleteMessage(userId, messageId);
  }

  @Post('messages/:messageId/react')
  reactToMessage(
    @CurrentUser('id') userId: number,
    @Param('messageId', ParseIntPipe) messageId: number,
    @Body() dto: ReactMessageDto,
  ) {
    return this.friendService.reactToMessage(userId, messageId, dto.emoji);
  }
}
