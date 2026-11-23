export interface DomainEvent<T = any> {
  id: string;
  name: string;
  timestamp: Date;
  payload: T;
  actorId?: string;
  correlationId?: string;
}

export interface EventBus {
  publish(event: DomainEvent): Promise<void>;
  publishAll(events: DomainEvent[]): Promise<void>;
  subscribe(eventName: string, handler: (event: DomainEvent) => Promise<void>): void;
}

export class InMemoryEventBus implements EventBus {
  private handlers: Map<string, Array<(event: DomainEvent) => Promise<void>>> = new Map();

  async publish(event: DomainEvent): Promise<void> {
    const eventHandlers = this.handlers.get(event.name) || [];
    // Run handlers asynchronously without blocking
    Promise.all(eventHandlers.map(handler => handler(event))).catch(err => {
      console.error(`Error in event handler for ${event.name}`, err);
    });
  }

  async publishAll(events: DomainEvent[]): Promise<void> {
    await Promise.all(events.map(e => this.publish(e)));
  }

  subscribe(eventName: string, handler: (event: DomainEvent) => Promise<void>): void {
    const current = this.handlers.get(eventName) || [];
    current.push(handler);
    this.handlers.set(eventName, current);
  }
}
