declare module '@socket.io/redis-adapter' {
  import type { Adapter } from 'socket.io-adapter';

  export function createAdapter(pubClient: unknown, subClient: unknown, opts?: Record<string, unknown>): (nsp: unknown) => Adapter;
}

declare module '@socket.io/redis-emitter' {
  export class Emitter {
    constructor(redisClient: unknown, opts?: Record<string, unknown>);
    to(room: string): Emitter;
    emit(event: string, ...args: unknown[]): void;
  }
}
