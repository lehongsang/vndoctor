import { AppAccountJwtPayload, CurrentAccount } from '@/commons/decorators/current-account.decorator';
import { CurrentStaff, StaffJwtPayload } from '@/commons/decorators/current-staff.decorator';
import { AuthUserContext, CurrentAuthUser } from '@/commons/decorators/current-auth-user.decorator';
import { ApiFile } from '@/commons/decorators/file-upload.decorator';
import { Roles } from '@/commons/decorators/roles.decorator';
import { Doc } from '@/commons/docs/doc.decorator';
import { SenderType, StaffRole } from '@/commons/enums/vndoctor.enum';
import { AppAuthGuard } from '@/commons/guards/app-auth.guard';
import { CombinedAuthGuard } from '@/commons/guards/combined-auth.guard';
import { StaffAuthGuard } from '@/commons/guards/staff-auth.guard';
import { StaffRolesGuard } from '@/commons/guards/staff-roles.guard';
import { ErrorCode } from '@/commons/exceptions';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Conversation } from '../care-subscriptions/entities/conversation.entity';
import { Message } from '../care-subscriptions/entities/message.entity';
import { ConversationsService } from './conversations.service';
import {
  CreateDirectConversationDto,
  PinConversationDto,
  PinMessageDto,
  QueryConversationDto,
  QueryConversationResourceDto,
  QueryMessageDto,
  SendMessageDto,
} from './dtos';

/**
 * REST API Controller for Medical Conversations and Messages (v2 & Legacy Complete).
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
    description: 'Trả về các nhóm chat Care Team và chat 1-1 với Bác sĩ của tài khoản App đang đăng nhập (đã sắp xếp ghim lên đầu).',
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
  @UseGuards(CombinedAuthGuard)
  @ApiBearerAuth('access-token')
  @Doc({
    summary: 'Dual Auth - Mở phòng chat trực tiếp 1-1 với Bác sĩ',
    description: 'Khởi tạo hoặc lấy lại phòng chat 1-1 giữa hồ sơ bệnh nhân và Bác sĩ chỉ định.',
    response: { serialization: Conversation },
    errors: [
      {
        status: HttpStatus.NOT_FOUND,
        errorCode: ErrorCode.HEALTH_PROFILE_NOT_FOUND,
        message: 'Hồ sơ sức khỏe không tồn tại',
      },
      {
        status: HttpStatus.NOT_FOUND,
        errorCode: ErrorCode.STAFF_NOT_FOUND,
        message: 'Bác sĩ không tồn tại',
      },
    ],
  })
  async createDirect(
    @Body() dto: CreateDirectConversationDto,
    @CurrentAuthUser() user: AuthUserContext,
  ): Promise<Conversation> {
    return this.conversationsService.createDirectConversation(
      dto,
      user.type === 'STAFF' ? user.userId : undefined,
      user.type === 'APP_ACCOUNT' ? user.userId : undefined,
    );
  }

  @Get(':id/messages/search')
  @UseGuards(CombinedAuthGuard)
  @ApiBearerAuth('access-token')
  @Doc({
    summary: 'Dual Auth - Tìm kiếm tin nhắn trong phòng chat theo từ khóa',
    description: 'Tìm kiếm tin nhắn văn bản khớp với từ khóa trong cuộc hội thoại.',
    response: { serialization: Message, isArray: true },
  })
  async searchMessages(
    @Param('id') id: string,
    @Query('keyword') keyword: string,
    @CurrentAuthUser() user: AuthUserContext,
  ) {
    return this.conversationsService.searchMessages(
      id,
      keyword,
      user.facilityId,
      user.type === 'APP_ACCOUNT' ? user.userId : undefined,
    );
  }

  @Get(':id/pinned-messages')
  @UseGuards(CombinedAuthGuard)
  @ApiBearerAuth('access-token')
  @Doc({
    summary: 'Dual Auth - Lấy danh sách tin nhắn đã ghim trong phòng chat',
    description: 'Lấy toàn bộ tin nhắn được ghim (lời dặn, đơn thuốc, cảnh báo...) trong cuộc hội thoại.',
    response: { serialization: Message, isArray: true },
  })
  async getPinnedMessages(
    @Param('id') id: string,
    @CurrentAuthUser() user: AuthUserContext,
  ) {
    return this.conversationsService.getPinnedMessages(
      id,
      user.facilityId,
      user.type === 'APP_ACCOUNT' ? user.userId : undefined,
    );
  }

  @Get(':id/resources')
  @UseGuards(CombinedAuthGuard)
  @ApiBearerAuth('access-token')
  @Doc({
    summary: 'Dual Auth - Resource Hub (Kho tài nguyên hội thoại)',
    description: 'Tổng hợp danh sách các ảnh, tệp tin, phiếu khám bệnh, PTYTNC, chỉ số đo đã chia sẻ trong phòng chat.',
    response: { serialization: Message, isArray: true },
  })
  async getResources(
    @Param('id') id: string,
    @Query() query: QueryConversationResourceDto,
    @CurrentAuthUser() user: AuthUserContext,
  ) {
    return this.conversationsService.getConversationResources(
      id,
      query,
      user.facilityId,
      user.type === 'APP_ACCOUNT' ? user.userId : undefined,
    );
  }

  @Post(':id/media')
  @UseGuards(CombinedAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiFile('file')
  @Doc({
    summary: 'Dual Auth - Upload hình ảnh hoặc tài liệu cho tin nhắn chat',
    description: 'Tải lên hình ảnh / file đính kèm phục vụ trao đổi trong phòng chat y tế.',
  })
  async uploadMedia(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentAuthUser() user: AuthUserContext,
  ) {
    return this.conversationsService.uploadChatMedia(id, file, {
      staffUserId: user.type === 'STAFF' ? user.userId : undefined,
      accountId: user.type === 'APP_ACCOUNT' ? user.userId : undefined,
      staffFacilityId: user.facilityId,
    });
  }

  @Patch(':id/pin')
  @UseGuards(CombinedAuthGuard)
  @ApiBearerAuth('access-token')
  @Doc({
    summary: 'Dual Auth - Ghim / Bỏ ghim cuộc hội thoại',
    description: 'Ghim hoặc bỏ ghim phòng chat lên đầu danh sách hội thoại.',
    response: { serialization: Conversation },
  })
  async pinConversation(
    @Param('id') id: string,
    @Body() dto: PinConversationDto,
    @CurrentAuthUser() user: AuthUserContext,
  ): Promise<Conversation> {
    return this.conversationsService.pinConversation(
      id,
      dto,
      user.facilityId,
      user.type === 'APP_ACCOUNT' ? user.userId : undefined,
    );
  }

  @Patch(':id/read')
  @UseGuards(CombinedAuthGuard)
  @ApiBearerAuth('access-token')
  @Doc({
    summary: 'Dual Auth - Đánh dấu đã đọc phòng chat qua REST API',
    description: 'Cập nhật trạng thái đã đọc toàn bộ tin nhắn trong phòng chat.',
  })
  async markAsRead(
    @Param('id') id: string,
    @CurrentAuthUser() user: AuthUserContext,
  ) {
    return this.conversationsService.markAsRead(id, {
      staffUserId: user.type === 'STAFF' ? user.userId : undefined,
      accountId: user.type === 'APP_ACCOUNT' ? user.userId : undefined,
      staffFacilityId: user.facilityId,
    });
  }

  @Get(':id/messages')
  @UseGuards(CombinedAuthGuard)
  @ApiBearerAuth('access-token')
  @Doc({
    summary: 'Dual Auth - Lấy lịch sử tin nhắn trong phòng chat',
    description: 'Lấy danh sách tin nhắn theo thứ tự thời gian phân trang (hỗ trợ cursor before/after dạng ISO Date hoặc Message UUID).',
    response: { serialization: Message, isArray: true },
  })
  async getMessages(
    @Param('id') id: string,
    @Query() query: QueryMessageDto,
    @CurrentAuthUser() user: AuthUserContext,
  ) {
    return this.conversationsService.getMessages(
      id,
      query,
      user.facilityId,
      user.type === 'APP_ACCOUNT' ? user.userId : undefined,
    );
  }

  @Post(':id/messages')
  @UseGuards(CombinedAuthGuard)
  @ApiBearerAuth('access-token')
  @Doc({
    summary: 'Dual Auth - Gửi tin nhắn qua REST API (Bác sĩ / Bệnh nhân)',
    description: 'Gửi tin nhắn văn bản, hình ảnh hoặc đính kèm thực thể y tế (resourceId) vào phòng chat.',
    response: { serialization: Message },
  })
  async sendMessage(
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
    @CurrentAuthUser() user: AuthUserContext,
  ): Promise<Message> {
    return this.conversationsService.sendMessage(id, dto, {
      senderType: user.type === 'STAFF' ? SenderType.STAFF : SenderType.PATIENT,
      staffUserId: user.type === 'STAFF' ? user.userId : undefined,
      accountId: user.type === 'APP_ACCOUNT' ? user.userId : undefined,
      staffFacilityId: user.facilityId,
    });
  }

  @Get(':id')
  @UseGuards(CombinedAuthGuard)
  @ApiBearerAuth('access-token')
  @Doc({
    summary: 'Dual Auth - Xem chi tiết thông tin phòng chat',
    description: 'Lấy chi tiết phòng chat, thành viên Care Team và hồ sơ bệnh nhân.',
    response: { serialization: Conversation },
  })
  async findById(
    @Param('id') id: string,
    @CurrentAuthUser() user: AuthUserContext,
  ): Promise<Conversation> {
    return this.conversationsService.findById(
      id,
      user.facilityId,
      user.type === 'APP_ACCOUNT' ? user.userId : undefined,
    );
  }

  @Delete(':id')
  @UseGuards(CombinedAuthGuard)
  @ApiBearerAuth('access-token')
  @Doc({
    summary: 'Dual Auth - Xóa / Đóng cuộc hội thoại',
    description: 'Đóng cuộc hội thoại (chuyển trạng thái sang CLOSED).',
  })
  async deleteConversation(
    @Param('id') id: string,
    @CurrentAuthUser() user: AuthUserContext,
  ) {
    return this.conversationsService.deleteConversation(
      id,
      user.facilityId,
      user.type === 'APP_ACCOUNT' ? user.userId : undefined,
    );
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
  @UseGuards(CombinedAuthGuard)
  @ApiBearerAuth('access-token')
  @Doc({
    summary: 'Dual Auth - Thu hồi tin nhắn đã gửi',
    description: 'Đánh dấu tin nhắn đã thu hồi (isDeleted = true). Chỉ người gửi mới được thu hồi.',
    response: { serialization: Message },
  })
  async deleteMessage(
    @Param('id') id: string,
    @CurrentAuthUser() user: AuthUserContext,
  ): Promise<Message> {
    return this.conversationsService.deleteMessage(
      id,
      user.facilityId,
      user.type === 'STAFF' ? user.userId : undefined,
      user.type === 'APP_ACCOUNT' ? user.userId : undefined,
    );
  }
}
