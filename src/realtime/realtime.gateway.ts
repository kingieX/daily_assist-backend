import { EventEmitter } from 'events';
import type { Server as HttpServer } from 'http';
import { Server as SocketServer, Socket } from 'socket.io';
import { UserStatus } from '@prisma/client';
import { logger } from '../config/logger';
import { env } from '../config/env';
import { prisma } from '../config/prisma';
import { verifyAccessToken } from '../utils/jwt';

export type RealtimeEvent = {
  room: string;
  event: string;
  payload: Record<string, unknown>;
};

type AuthenticatedSocket = Socket & { data: { user?: { userId: string; role: string } } };

function getCorsOrigin(): boolean | string[] {
  if (env.CORS_ORIGIN === '*') return true;
  return env.CORS_ORIGIN.split(',').map((origin) => origin.trim());
}

function tokenFromSocket(socket: Socket): string | null {
  const authToken = socket.handshake.auth?.token;
  if (typeof authToken === 'string' && authToken) return authToken;
  const header = socket.handshake.headers.authorization;
  if (typeof header === 'string' && header.startsWith('Bearer ')) return header.slice(7);
  return null;
}

class RealtimeGateway extends EventEmitter {
  private io: SocketServer | null = null;

  attach(server: HttpServer): void {
    if (this.io) return;
    this.io = new SocketServer(server, { cors: { origin: getCorsOrigin(), credentials: true } });
    this.io.use(async (socket, next) => {
      try {
        const token = tokenFromSocket(socket);
        if (!token) return next(new Error('Authentication required'));
        const payload = verifyAccessToken(token);
        const user = await prisma.user.findUnique({ where: { id: payload.sub }, select: { id: true, role: true, status: true } });
        if (!user || user.status !== UserStatus.ACTIVE) return next(new Error('User account is not active'));
        (socket as AuthenticatedSocket).data.user = { userId: user.id, role: user.role };
        return next();
      } catch {
        return next(new Error('Invalid access token'));
      }
    });

    this.io.on('connection', (socket: AuthenticatedSocket) => {
      const user = socket.data.user;
      if (!user) return socket.disconnect(true);
      socket.join(`user:${user.userId}`);
      socket.join(`role:${user.role.toLowerCase().replace('_', '-')}`);

      socket.on('conversation:join', (conversationId: string) => {
        if (typeof conversationId === 'string' && conversationId) socket.join(`conversation:${conversationId}`);
      });
      socket.on('conversation:leave', (conversationId: string) => {
        if (typeof conversationId === 'string' && conversationId) socket.leave(`conversation:${conversationId}`);
      });
      socket.on('message:typing:start', (conversationId: string) => this.emitToConversation(conversationId, 'message:typing', { conversationId, userId: user.userId, typing: true }));
      socket.on('message:typing:stop', (conversationId: string) => this.emitToConversation(conversationId, 'message:typing', { conversationId, userId: user.userId, typing: false }));
    });

    logger.info('Socket.IO realtime gateway initialized');
  }

  emitToUser(userId: string, event: string, payload: Record<string, unknown>): void {
    this.emitToRoom(`user:${userId}`, event, payload);
  }

  emitToConversation(conversationId: string, event: string, payload: Record<string, unknown>): void {
    this.emitToRoom(`conversation:${conversationId}`, event, payload);
  }

  emitToRoom(room: string, event: string, payload: Record<string, unknown>): void {
    const message: RealtimeEvent = { room, event, payload };
    this.emit('realtime:event', message);
    this.io?.to(room).emit(event, payload);
    if (!this.io) logger.debug(message, 'Realtime event emitted before HTTP server attachment');
  }
}

export const realtimeGateway = new RealtimeGateway();
