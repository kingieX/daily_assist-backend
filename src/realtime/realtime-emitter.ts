import IORedis from 'ioredis';
import { Emitter } from '@socket.io/redis-emitter';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { realtimeGateway } from './realtime.gateway';

let redisClient: IORedis | null = null;
let redisEmitter: Emitter | null = null;

function getRedisEmitter(): Emitter | null {
  if (!env.REDIS_URL) return null;
  if (!redisEmitter) {
    redisClient = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null });
    redisEmitter = new Emitter(redisClient);
    redisClient.on('error', (error) => logger.error({ error }, 'Socket.IO Redis emitter connection error'));
    logger.info('Socket.IO Redis emitter initialized for cross-process realtime events');
  }
  return redisEmitter;
}

export function emitRealtimeToRoom(room: string, event: string, payload: Record<string, unknown>): void {
  const emitter = getRedisEmitter();
  if (emitter) {
    emitter.to(room).emit(event, payload);
    return;
  }
  realtimeGateway.emitToRoom(room, event, payload);
}

export function emitRealtimeToUser(userId: string, event: string, payload: Record<string, unknown>): void {
  emitRealtimeToRoom(`user:${userId}`, event, payload);
}

export async function closeRealtimeEmitter(): Promise<void> {
  if (redisClient) await redisClient.quit();
  redisClient = null;
  redisEmitter = null;
}
