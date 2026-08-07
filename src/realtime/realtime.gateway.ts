import { EventEmitter } from 'events';
import type { Server as HttpServer } from 'http';
import { logger } from '../config/logger';

export type RealtimeEvent = {
  room: string;
  event: string;
  payload: Record<string, unknown>;
};

class RealtimeGateway extends EventEmitter {
  private attached = false;

  attach(_server: HttpServer): void {
    this.attached = true;
    logger.info('Realtime gateway initialized in internal event-emitter mode');
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
    if (!this.attached) {
      logger.debug(message, 'Realtime event emitted before HTTP server attachment');
    }
  }
}

export const realtimeGateway = new RealtimeGateway();
