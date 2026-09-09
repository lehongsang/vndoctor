import { ConfigService } from '@nestjs/config';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import * as jwt from 'jsonwebtoken';
import type { Server, Socket } from 'socket.io';
import { ConversationsService } from '../conversations.service';
import { ChatGateway } from './chat.gateway';

describe('ChatGateway', () => {
  let gateway: ChatGateway;
  let conversationsService: ConversationsService;

  const mockConversationsService = {
    sendMessage: jest.fn().mockResolvedValue({
      id: 'msg-1',
      conversationId: 'conv-1',
      content: 'Tin nhắn realtime',
    }),
  };

  const mockConfigService = {
    get: jest.fn().mockImplementation((key: string) => {
      if (key === 'JWT_SECRET' || key === 'JWT_APP_SECRET') {
        return 'test-secret-key';
      }
      return null;
    }),
  };

  const validToken = jwt.sign(
    { id: 'user-1', type: 'APP_ACCOUNT' },
    'test-secret-key',
  );

  const mockSocket = {
    id: 'socket-123',
    handshake: {
      auth: { token: validToken },
      headers: {},
    },
    data: {},
    disconnect: jest.fn(),
    join: jest.fn().mockResolvedValue(undefined),
    leave: jest.fn().mockResolvedValue(undefined),
    to: jest.fn().mockReturnValue({
      emit: jest.fn(),
    }),
  } as unknown as Socket;

  const mockServer = {
    to: jest.fn().mockReturnValue({
      emit: jest.fn(),
    }),
  } as unknown as Server;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatGateway,
        { provide: ConversationsService, useValue: mockConversationsService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    gateway = module.get<ChatGateway>(ChatGateway);
    conversationsService = module.get<ConversationsService>(ConversationsService);
    gateway.server = mockServer;
  });

  describe('afterInit', () => {
    it('should log initialization', () => {
      expect(() => gateway.afterInit()).not.toThrow();
    });
  });

  describe('handleConnection', () => {
    it('should authenticate client with valid token', () => {
      gateway.handleConnection(mockSocket);

      expect((mockSocket.data).user).toHaveProperty('id', 'user-1');
      expect((mockSocket.data).user).toHaveProperty('type', 'APP_ACCOUNT');
      expect(mockSocket.disconnect).not.toHaveBeenCalled();
    });

    it('should disconnect client if auth token is missing', () => {
      const socketWithoutToken = {
        id: 'sock-no-token',
        handshake: { auth: {}, headers: {} },
        disconnect: jest.fn(),
      } as unknown as Socket;

      gateway.handleConnection(socketWithoutToken);

      expect(socketWithoutToken.disconnect).toHaveBeenCalled();
    });

    it('should disconnect client if token verification fails', () => {
      const socketWithInvalidToken = {
        id: 'sock-invalid-token',
        handshake: { auth: { token: 'invalid.jwt.token' }, headers: {} },
        disconnect: jest.fn(),
      } as unknown as Socket;

      gateway.handleConnection(socketWithInvalidToken);

      expect(socketWithInvalidToken.disconnect).toHaveBeenCalled();
    });
  });

  describe('handleJoinRoom & handleLeaveRoom', () => {
    it('should join conversation room', async () => {
      const result = await gateway.handleJoinRoom(mockSocket, { conversationId: 'conv-1' });

      expect(mockSocket.join).toHaveBeenCalledWith('room_conv-1');
      expect(result).toEqual({ event: 'joined_room', conversationId: 'conv-1' });
    });

    it('should return error when joining without conversationId', async () => {
      const result = await gateway.handleJoinRoom(mockSocket, { conversationId: '' });
      expect(result).toEqual({ error: 'conversationId is required' });
    });

    it('should leave conversation room', async () => {
      const result = await gateway.handleLeaveRoom(mockSocket, { conversationId: 'conv-1' });

      expect(mockSocket.leave).toHaveBeenCalledWith('room_conv-1');
      expect(result).toEqual({ event: 'left_room', conversationId: 'conv-1' });
    });
  });

  describe('handleSendMessage', () => {
    it('should save message and broadcast to room', async () => {
      (mockSocket.data).user = { id: 'user-1', type: 'APP_ACCOUNT' };

      const result = await gateway.handleSendMessage(mockSocket, {
        conversationId: 'conv-1',
        content: 'Tin nhắn mới',
      });

      expect(conversationsService.sendMessage).toHaveBeenCalled();
      expect(mockServer.to).toHaveBeenCalledWith('room_conv-1');
      expect(result).toHaveProperty('event', 'message_sent');
    });

    it('should return error when socket is unauthorized', async () => {
      (mockSocket.data).user = undefined;

      const result = await gateway.handleSendMessage(mockSocket, {
        conversationId: 'conv-1',
        content: 'Tin nhắn',
      });

      expect(result).toEqual({ error: 'Unauthorized socket client' });
    });
  });

  describe('handleTyping', () => {
    it('should broadcast typing event to other room members', () => {
      (mockSocket.data).user = { id: 'user-1' };

      gateway.handleTyping(mockSocket, { conversationId: 'conv-1', isTyping: true });

      expect(mockSocket.to).toHaveBeenCalledWith('room_conv-1');
    });
  });

  describe('handleMessageRead', () => {
    it('should broadcast read receipt event to room', () => {
      (mockSocket.data).user = { id: 'user-1' };

      gateway.handleMessageRead(mockSocket, { conversationId: 'conv-1', messageId: 'msg-1' });

      expect(mockSocket.to).toHaveBeenCalledWith('room_conv-1');
    });
  });
});
