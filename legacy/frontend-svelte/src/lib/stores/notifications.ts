import { writable } from 'svelte/store';

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

interface Notification {
  id: number;
  type: NotificationType;
  message: string;
}

let nextId = 0;

function createNotificationStore() {
  const { subscribe, update } = writable<Notification[]>([]);

  function add(type: NotificationType, message: string, duration = 5000) {
    const id = nextId++;
    update(n => [...n, { id, type, message }]);
    if (duration > 0) {
      setTimeout(() => remove(id), duration);
    }
  }

  function remove(id: number) {
    update(n => n.filter(item => item.id !== id));
  }

  return {
    subscribe,
    success: (msg: string) => add('success', msg),
    error: (msg: string) => add('error', msg, 8000),
    info: (msg: string) => add('info', msg),
    warning: (msg: string) => add('warning', msg, 6000),
    remove,
    clear: () => update(() => []),
  };
}

export const notifications = createNotificationStore();
