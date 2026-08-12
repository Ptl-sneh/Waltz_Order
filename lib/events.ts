import { EventEmitter } from "events";

class SyncEventEmitter extends EventEmitter {}

// Use a global variable to preserve the event emitter across HMR in development
const globalForEvents = global as unknown as { syncEvents: SyncEventEmitter };

export const syncEvents = globalForEvents.syncEvents || new SyncEventEmitter();

if (process.env.NODE_ENV !== "production") {
  globalForEvents.syncEvents = syncEvents;
}

// Initialize the renewal job background task
import "./renewal-job";
