import type { OpenAPIV3 } from 'openapi-types';

const secured: OpenAPIV3.SecurityRequirementObject[] = [{ BearerAuth: [] }];

export const realtimePaths: OpenAPIV3.PathsObject = {
  '/realtime/socket.io': {
    get: {
      tags: ['Realtime'],
      summary: 'Socket.IO realtime connection contract',
      description: [
        'Connect to the Socket.IO endpoint mounted on the API server at `/socket.io` (outside the `/api/v1` REST prefix).',
        'Authenticate with the same JWT access token used for REST, either as `auth.token` in the Socket.IO client handshake or `Authorization: Bearer <token>` in headers.',
        'On connection the server verifies the token, rejects inactive users, joins `user:{userId}` and `role:{role}` rooms, and allows authorized `conversation:{conversationId}` joins.',
        'The API process uses the Socket.IO Redis adapter when `REDIS_URL` is configured, and the notification worker publishes notification events with the Socket.IO Redis emitter over that same Redis instance.',
        'For production PM2 deployments, set the same `REDIS_URL` in both the API and notification worker processes so BullMQ jobs and cross-process realtime notifications share Redis.',
        '',
        '**Client events:** `conversation:join`, `conversation:leave`, `message:typing:start`, `message:typing:stop`, `notification:read`.',
        '**Server events:** `message:created`, `message:typing`, `notification:created`, `notification:read`, `notification:deleted`, `notification:unread_count`, `alert:created`, `alert:read`, `alert:unread_count`.'
      ].join('\n'),
      security: secured,
      responses: {
        '101': { description: 'Socket.IO transport upgraded after successful JWT authentication.' },
        '401': { description: 'Missing or invalid access token, or inactive user.' }
      }
    }
  }
};
