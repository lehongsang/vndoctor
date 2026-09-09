import { SenderType } from '@/commons/enums/vndoctor.enum';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import * as jwt from 'jsonwebtoken';
import { Server, Socket } from 'socket.io';
import { ConversationsService } from '../conversations.service';
import { SendMessageDto } from '../dtos';

export interface AuthenticatedUserPayload {
  id: string;
  type?: 'APP_ACCOUNT' | 'STAFF';
  role?: string;
  facilityId?: string;
  username?: string;
  phoneNumber?: string;
}

export interface CustomSocket extends Socket {
  data: {
    user?: AuthenticatedUserPayload;
    [key: string]: unknown;
  };
}

/**
 * Realtime WebSocket Gateway for Chat & Medical Consultation.
 */
@Injectable()
@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/chat',
})
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(ChatGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly conversationsService: ConversationsService,
    private readonly configService: ConfigService,
  ) {}

  afterInit() {
    this.logger.log('WebSocket ChatGateway initialized on namespace /chat');
  }

  /**
   * Handle incoming socket connection with JWT verification.
   */
  handleConnection(client: CustomSocket) {
    try {
      const authPayload = client.handshake.auth as Record<string, unknown> | undefined;
      const headersPayload = client.handshake.headers as Record<string, unknown> | undefined;

      const rawAuth =
        (typeof authPayload?.token === 'string' ? authPayload.token : undefined) ||
        (typeof headersPayload?.authorization === 'string'
          ? headersPayload.authorization
          : undefined);

      if (!rawAuth) {
        this.logger.warn(`Client ${client.id} disconnected: Missing authorization token`);
        client.disconnect();
        return;
      }

      const token = rawAuth.startsWith('Bearer ')
        ? rawAuth.slice(7)
        : rawAuth;

      const secret =
        this.configService.get<string>('JWT_APP_SECRET') ||
        this.configService.get<string>('JWT_SECRET') ||
        'vndoctor-secret-key-2026';

      const decoded = jwt.verify(token, secret) as AuthenticatedUserPayload;
      client.data.user = decoded;

      this.logger.log(
        `Client connected: ${client.id} (User: ${decoded.id}, Type: ${decoded.type ?? 'STAFF'})`,
      );
    } catch (err) {
      this.logger.warn(`Client ${client.id} unauthorized: ${String(err)}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: CustomSocket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  /**
   * Client joins a conversation chat room.
   */
  @SubscribeMessage('join_room')
  async handleJoinRoom(
    @ConnectedSocket() client: CustomSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    if (!data?.conversationId) {
      return { error: 'conversationId is required' };
    }

    const roomName = `room_${data.conversationId}`;
    await client.join(roomName);
    this.logger.log(`Client ${client.id} joined ${roomName}`);

    return { event: 'joined_room', conversationId: data.conversationId };
  }

  /**
   * Client leaves a conversation chat room.
   */
  @SubscribeMessage('leave_room')
  async handleLeaveRoom(
    @ConnectedSocket() client: CustomSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    if (!data?.conversationId) {
      return { error: 'conversationId is required' };
    }

    const roomName = `room_${data.conversationId}`;
    await client.leave(roomName);
    this.logger.log(`Client ${client.id} left ${roomName}`);

    return { event: 'left_room', conversationId: data.conversationId };
  }

  /**
   * Send a realtime chat message and broadcast to room participants.
   */
  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() client: CustomSocket,
    @MessageBody() data: SendMessageDto & { conversationId: string },
  ) {
    const user = client.data.user;
    if (!user) {
      return { error: 'Unauthorized socket client' };
    }

    if (!data.conversationId || !data.content) {
      return { error: 'conversationId and content are required' };
    }

    const isPatient = user.type === 'APP_ACCOUNT';
    const sender = {
      senderType: isPatient ? SenderType.PATIENT : SenderType.STAFF,
      staffUserId: isPatient ? undefined : user.id,
      accountId: isPatient ? user.id : undefined,
      staffFacilityId: user.facilityId,
    };

    try {
      const message = await this.conversationsService.sendMessage(
        data.conversationId,
        data,
        sender,
      );

      const roomName = `room_${data.conversationId}`;
      this.server.to(roomName).emit('new_message', message);

      return { event: 'message_sent', message };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to send message';
      return { error: errorMsg };
    }
  }

  /**
   * User typing status indicator.
   */
  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: CustomSocket,
    @MessageBody() data: { conversationId: string; isTyping: boolean },
  ) {
    const user = client.data.user;
    if (!user || !data?.conversationId) {
      return;
    }

    const roomName = `room_${data.conversationId}`;
    client.to(roomName).emit('user_typing', {
      conversationId: data.conversationId,
      userId: user.id,
      isTyping: !!data.isTyping,
    });
  }

  /**
   * Message read receipt event.
   */
  @SubscribeMessage('message_read')
  handleMessageRead(
    @ConnectedSocket() client: CustomSocket,
    @MessageBody() data: { conversationId: string; messageId: string },
  ) {
    const user = client.data.user;
    if (!user || !data?.conversationId) {
      return;
    }

    const roomName = `room_${data.conversationId}`;
    client.to(roomName).emit('message_read_receipt', {
      conversationId: data.conversationId,
      messageId: data.messageId,
      userId: user.id,
      readAt: new Date(),
    });
  }
}
