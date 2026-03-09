import AsyncStorage from "@react-native-async-storage/async-storage";

const QUEUE_KEY = "jobsy_swipe_queue";

export interface QueuedSwipe {
  target_id: string;
  target_type: "listing" | "profile";
  direction: "left" | "right";
  queued_at: string;
}

/**
 * Adds a swipe action to the offline queue.
 * Persists the queue to AsyncStorage so it survives app restarts.
 */
export async function queueSwipe(
  swipe: Omit<QueuedSwipe, "queued_at">,
): Promise<void> {
  const queue = await getQueuedSwipes();
  const entry: QueuedSwipe = {
    ...swipe,
    queued_at: new Date().toISOString(),
  };
  queue.push(entry);
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

/**
 * Retrieves all currently queued swipe actions.
 */
export async function getQueuedSwipes(): Promise<QueuedSwipe[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Flushes the offline queue by sending each swipe to the server in order.
 * Returns the number of successfully sent swipes.
 *
 * Successfully sent swipes are removed from the queue even if later ones fail,
 * so the queue always contains only unsent items.
 */
export async function flushQueue(
  apiClient: { post: (url: string, data: unknown) => Promise<unknown> },
): Promise<number> {
  const queue = await getQueuedSwipes();
  if (queue.length === 0) return 0;

  let flushed = 0;

  for (const swipe of queue) {
    try {
      await apiClient.post("/api/swipes/", {
        target_id: swipe.target_id,
        target_type: swipe.target_type,
        direction: swipe.direction,
      });
      flushed++;
    } catch {
      // Stop on first failure to preserve ordering
      break;
    }
  }

  if (flushed > 0) {
    const remaining = queue.slice(flushed);
    if (remaining.length === 0) {
      await AsyncStorage.removeItem(QUEUE_KEY);
    } else {
      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
    }
  }

  return flushed;
}

/**
 * Removes all queued swipes.
 */
export async function clearQueue(): Promise<void> {
  await AsyncStorage.removeItem(QUEUE_KEY);
}
