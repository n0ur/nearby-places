import { EventEmitter } from "node:events";

class EventBus extends EventEmitter {
  constructor(eventEmitter) {
    super();
    this.eventEmitter = eventEmitter;
  }

  setLogger(logger) {
    this.logger = logger;
  }

  emit(event, data) {
    this.logger.info({ event, data }, "Event emitted");
    return this.eventEmitter.emit(event, data);
  }

  on(event, handler) {
    const wrapped = (data) => {
      this.logger.info({ event, data }, "Event received");
      return handler(data);
    };
    return this.eventEmitter.on(event, wrapped);
  }
}

export const eventBus = new EventBus(new EventEmitter());
