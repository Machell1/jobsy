/**
 * Push-notification helpers.
 *
 * The core registration and listener logic already lives in
 * `@/hooks/usePushNotifications`.  This module re-exports the hook
 * and adds small standalone utilities that can be used outside of
 * React component trees.
 */

export { usePushNotifications } from "@/hooks/usePushNotifications";

export {
  registerDevice,
  getNotifications,
  markNotificationRead,
} from "@/api/notifications";
