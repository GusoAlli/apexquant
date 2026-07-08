import { EventEmitter } from 'events';

// In-memory pub/sub for SSE. Works for single-process (SQLite) deployments.
export const eventBus = new EventEmitter();
eventBus.setMaxListeners(500);

export function emitToUser(userId: string, event: object) {
  eventBus.emit(`notif:${userId}`, event);
}

export function emitToAll(event: object) {
  eventBus.emit('notif:all', event);
}
