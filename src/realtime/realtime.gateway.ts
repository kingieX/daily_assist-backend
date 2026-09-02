import { EventEmitter } from 'events';
import type { Server as HttpServer } from 'http';
import { Server as SocketServer, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import IORedis from 'ioredis';
import { Role, UserStatus } from '@prisma/client';
import { logger } from '../config/logger';
import { env } from '../config/env';
import { prisma } from '../config/prisma';
import { verifyAccessToken } from '../utils/jwt';
import { normalizeRole } from '../utils/roles';

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
  private redisPubClient: IORedis | null = null;
  private redisSubClient: IORedis | null = null;

  attach(server: HttpServer): void {
    if (this.io) return;
    this.io = new SocketServer(server, { cors: { origin: getCorsOrigin(), credentials: true } });
    this.configureRedisAdapter();
    this.io.use(async (socket, next) => {
      try {
        const token = tokenFromSocket(socket);
        if (!token) return next(new Error('Authentication required'));
        const payload = verifyAccessToken(token);
        const tokenRole = normalizeRole(payload.role);
        const user = await prisma.user.findUnique({ where: { id: payload.sub }, select: { id: true, role: true, status: true } });
        if (!user || user.status !== UserStatus.ACTIVE) return next(new Error('User account is not active'));
        const role = normalizeRole(user.role) ?? tokenRole;
        if (!role) return next(new Error('Invalid user role'));
        (socket as AuthenticatedSocket).data.user = { userId: user.id, role };
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

      socket.on('conversation:join', async (conversationId: string) => {
        if (await this.canAccessConversation(conversationId, user.userId, user.role)) socket.join(`conversation:${conversationId}`);
      });
      socket.on('conversation:leave', (conversationId: string) => {
        if (typeof conversationId === 'string' && conversationId) socket.leave(`conversation:${conversationId}`);
      });
      socket.on('message:typing:start', async (conversationId: string) => {
        if (await this.canAccessConversation(conversationId, user.userId, user.role)) this.emitToConversation(conversationId, 'message:typing', { conversationId, userId: user.userId, typing: true });
      });
      socket.on('message:typing:stop', async (conversationId: string) => {
        if (await this.canAccessConversation(conversationId, user.userId, user.role)) this.emitToConversation(conversationId, 'message:typing', { conversationId, userId: user.userId, typing: false });
      });
      socket.on('notification:read', async (notificationId: string) => {
        if (typeof notificationId !== 'string' || !notificationId) return;
        const updated = await prisma.notification.updateMany({ where: { id: notificationId, userId: user.userId, readAt: null }, data: { readAt: new Date() } });
        if (updated.count) this.emitToUser(user.userId, 'notification:read', { id: notificationId });
      });
    });

    logger.info('Socket.IO realtime gateway initialized');
  }


  private configureRedisAdapter(): void {
    if (!this.io || !env.REDIS_URL) return;
    this.redisPubClient = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null });
    this.redisSubClient = this.redisPubClient.duplicate();
    this.redisPubClient.on('error', (error) => logger.error({ error }, 'Socket.IO Redis pub connection error'));
    this.redisSubClient.on('error', (error) => logger.error({ error }, 'Socket.IO Redis sub connection error'));
    this.io.adapter(createAdapter(this.redisPubClient, this.redisSubClient));
    logger.info('Socket.IO Redis adapter initialized for cross-process realtime events');
  }

  private async canAccessConversation(conversationId: string, userId: string, role: string): Promise<boolean> {
    if (typeof conversationId !== 'string' || !conversationId) return false;
    if (role === Role.ADMIN || role === Role.SUPER_ADMIN) {
      return Boolean(await prisma.conversation.findUnique({ where: { id: conversationId }, select: { id: true } }));
    }
    return Boolean(await prisma.conversation.findFirst({ where: { id: conversationId, staffId: userId }, select: { id: true } }));
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
