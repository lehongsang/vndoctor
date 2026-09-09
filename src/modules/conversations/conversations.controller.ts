import { AppAccountJwtPayload, CurrentAccount } from '@/commons/decorators/current-account.decorator';
import { CurrentStaff, StaffJwtPayload } from '@/commons/decorators/current-staff.decorator';
import { Roles } from '@/commons/decorators/roles.decorator';
import { Doc } from '@/commons/docs/doc.decorator';
import { SenderType, StaffRole } from '@/commons/enums/vndoctor.enum';
import { AppAuthGuard } from '@/commons/guards/app-auth.guard';
import { StaffAuthGuard } from '@/commons/guards/staff-auth.guard';
import { StaffRolesGuard } from '@/commons/guards/staff-roles.guard';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Conversation } from '../care-subscriptions/entities/conversation.entity';
import { Message } from '../care-subscriptions/entities/message.entity';
import { ConversationsService } from './conversations.service';
import {
  CreateDirectConversationDto,
  PinMessageDto,
  QueryConversationDto,
  QueryMessageDto,
  SendMessageDto,
} from './dtos';

/**
 * REST API Controller for Medical Conversations and Messages.
 */
@ApiTags('Conversations & Chat (Hội Thoại & Nhắn Tin Y Tế)')
@Controller('conversations')
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Get('me')
  @UseGuards(AppAuthGuard)
  @ApiBearerAuth('access-token')
  @Doc({
    summary: 'App Auth - Lấy danh sách phòng chat của Bệnh nhân',
    description: 'Trả về các nhóm chat Care Team và chat 1-1 với Bác sĩ của tài khoản App đang đăng nhập.',
    response: { serialization: Conversation, isArray: true },
  })
  async getMyConversations(
    @Query() query: QueryConversationDto,
    @CurrentAccount() account: AppAccountJwtPayload,
  ) {
    return this.conversationsService.findAll(query, undefined, undefined, account.id);
  }

  @Get()
  @UseGuards(StaffAuthGuard, StaffRolesGuard)
  @Roles(StaffRole.ADMIN, StaffRole.DOCTOR, StaffRole.NURSE, StaffRole.STAFF)
  @ApiBearerAuth('access-token')
  @Doc({
    summary: 'CMS Staff Auth - Danh sách phòng chat theo cơ sở y tế',
    description: 'Nhân viên y tế xem danh sách các cuộc hội thoại trong cơ sở y tế kèm tin nhắn mới nhất.',
    response: { serialization: Conversation, isArray: true },
  })
  async findAll(
    @Query() query: QueryConversationDto,
    @CurrentStaff() staff: StaffJwtPayload,
  ) {
    return this.conversationsService.findAll(query, staff.facilityId, staff.id);
  }

  @Post('direct')
  @UseGuards(AppAuthGuard)
  @ApiBearerAuth('access-token')
  @Doc({
    summary: 'App Auth - Mở phòng chat trực tiếp 1-1 với Bác sĩ',
    description: 'Khởi tạo hoặc lấy lại phòng chat 1-1 giữa hồ sơ bệnh nhân và Bác sĩ chỉ định.',
    response: { serialization: Conversation },
  })
  async createDirect(
    @Body() dto: CreateDirectConversationDto,
    @CurrentAccount() account: AppAccountJwtPayload,
  ): Promise<Conversation> {
    return this.conversationsService.createDirectConversation(
      dto,
      undefined,
      account.id,
    );
  }

  @Get(':id')
  @UseGuards(StaffAuthGuard)
  @ApiBearerAuth('access-token')
  @Doc({
    summary: 'Staff Auth - Xem chi tiết thông tin phòng chat',
    description: 'Lấy chi tiết phòng chat, thành viên Care Team và hồ sơ bệnh nhân.',
    response: { serialization: Conversation },
  })
  async findById(
    @Param('id') id: string,
    @CurrentStaff() staff: StaffJwtPayload,
  ): Promise<Conversation> {
    return this.conversationsService.findById(id, staff.facilityId);
  }

  @Get(':id/messages')
  @UseGuards(StaffAuthGuard)
  @ApiBearerAuth('access-token')
  @Doc({
    summary: 'Staff Auth - Lấy lịch sử tin nhắn trong phòng chat',
    description: 'Lấy danh sách tin nhắn theo thứ tự thời gian phân trang (Cursor pagination với tham số before).',
    response: { serialization: Message, isArray: true },
  })
  async getMessages(
    @Param('id') id: string,
    @Query() query: QueryMessageDto,
    @CurrentStaff() staff: StaffJwtPayload,
  ) {
    return this.conversationsService.getMessages(id, query, staff.facilityId);
  }

  @Post(':id/messages')
  @UseGuards(StaffAuthGuard)
  @ApiBearerAuth('access-token')
  @Doc({
    summary: 'Staff Auth - Gửi tin nhắn qua REST API (Bác sĩ/Điều dưỡng)',
    description: 'Nhân viên y tế gửi tin nhắn văn bản, hình ảnh hoặc đính kèm thực thể y tế (resourceId) vào phòng chat.',
    response: { serialization: Message },
  })
  async sendMessageByStaff(
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
    @CurrentStaff() staff: StaffJwtPayload,
  ): Promise<Message> {
    return this.conversationsService.sendMessage(id, dto, {
      senderType: SenderType.STAFF,
      staffUserId: staff.id,
      staffFacilityId: staff.facilityId,
    });
  }

  @Patch('messages/:id/pin')
  @UseGuards(StaffAuthGuard, StaffRolesGuard)
  @Roles(StaffRole.ADMIN, StaffRole.DOCTOR, StaffRole.NURSE)
  @ApiBearerAuth('access-token')
  @Doc({
    summary: 'Staff Auth - Ghim / Bỏ ghim tin nhắn quan trọng',
    description: 'Ghim hoặc bỏ ghim tin nhắn trong phòng chat (lời dặn của bác sĩ, đơn thuốc, cảnh báo...).',
    response: { serialization: Message },
  })
  async pinMessage(
    @Param('id') id: string,
    @Body() dto: PinMessageDto,
    @CurrentStaff() staff: StaffJwtPayload,
  ): Promise<Message> {
    return this.conversationsService.pinMessage(id, dto.isPinned, staff.facilityId);
  }

  @Delete('messages/:id')
  @UseGuards(StaffAuthGuard)
  @ApiBearerAuth('access-token')
  @Doc({
    summary: 'Staff Auth - Thu hồi tin nhắn đã gửi',
    description: 'Đánh dấu tin nhắn đã thu hồi (isDeleted = true).',
    response: { serialization: Message },
  })
  async deleteMessage(
    @Param('id') id: string,
    @CurrentStaff() staff: StaffJwtPayload,
  ): Promise<Message> {
    return this.conversationsService.deleteMessage(
      id,
      staff.facilityId,
      staff.id,
    );
  }
}
