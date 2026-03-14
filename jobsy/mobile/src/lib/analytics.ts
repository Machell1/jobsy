/**
 * Firebase Analytics stub.
 *
 * In an Expo managed workflow the native Firebase SDK is not available.
 * This module exposes the same public API so call-sites can import it now.
 * When a bare/native build is set up, replace the body with the real
 * `@react-native-firebase/analytics` calls.
 */

export function logEvent(
  name: string,
  params?: Record<string, string | number | boolean>,
): void {
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log("[analytics stub]", name, params);
  }
}

export function setUserId(userId: string | null): void {
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log("[analytics stub] setUserId", userId);
  }
}

export function setUserProperties(
  properties: Record<string, string | null>,
): void {
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log("[analytics stub] setUserProperties", properties);
  }
}
