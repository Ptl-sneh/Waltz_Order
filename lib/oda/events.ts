export class OdaEventBus<T> {
  private listeners = new Set<(value: T) => void>();

  emit(value: T) {
    this.listeners.forEach((listener) => listener(value));
  }

  subscribe(listener: (value: T) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
