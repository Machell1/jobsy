"""Resilience utilities: retry with backoff and circuit breaker pattern."""

import asyncio
import enum
import logging
import random
import time
from typing import Any, Callable, Coroutine

logger = logging.getLogger(__name__)


class CircuitOpenError(Exception):
    """Raised when a circuit breaker is open and rejecting calls."""

    def __init__(self, name: str, recovery_in: float):
        self.name = name
        self.recovery_in = recovery_in
        super().__init__(
            f"Circuit breaker '{name}' is OPEN. "
            f"Recovery in {recovery_in:.1f}s."
        )


# ---------------------------------------------------------------------------
# Retry with exponential backoff
# ---------------------------------------------------------------------------

async def retry_with_backoff(
    func: Callable[..., Coroutine],
    *args: Any,
    max_retries: int = 3,
    base_delay: float = 1.0,
    max_delay: float = 30.0,
    **kwargs: Any,
) -> Any:
    """Call an async function with exponential backoff and jitter.

    Args:
        func: Async callable to retry.
        *args: Positional arguments forwarded to *func*.
        max_retries: Maximum number of retry attempts (total calls = max_retries + 1).
        base_delay: Initial delay in seconds before the first retry.
        max_delay: Upper cap on the delay between retries.
        **kwargs: Keyword arguments forwarded to *func*.

    Returns:
        The return value of *func* on success.

    Raises:
        The last exception raised by *func* after all retries are exhausted.
    """
    last_exc: Exception | None = None
    for attempt in range(max_retries + 1):
        try:
            return await func(*args, **kwargs)
        except Exception as exc:
            last_exc = exc
            if attempt == max_retries:
                logger.error(
                    "retry_with_backoff: all %d retries exhausted for %s: %s",
                    max_retries,
                    func.__qualname__,
                    exc,
                )
                raise
            delay = min(base_delay * (2 ** attempt), max_delay) + random.uniform(0, 1)
            logger.warning(
                "retry_with_backoff: attempt %d/%d for %s failed (%s). "
                "Retrying in %.2fs ...",
                attempt + 1,
                max_retries + 1,
                func.__qualname__,
                exc,
                delay,
            )
            await asyncio.sleep(delay)

    # Should never reach here, but satisfy type checkers.
    raise last_exc  # type: ignore[misc]


# ---------------------------------------------------------------------------
# Circuit Breaker
# ---------------------------------------------------------------------------

class _State(enum.Enum):
    CLOSED = "closed"
    OPEN = "open"
    HALF_OPEN = "half_open"


class CircuitBreaker:
    """Lightweight async circuit breaker.

    States
    ------
    CLOSED   -- normal operation; failures are counted.
    OPEN     -- too many failures; all calls are rejected with *CircuitOpenError*.
    HALF_OPEN -- after *recovery_timeout* seconds the breaker allows a limited
                 number of trial calls.  If they succeed the breaker resets to
                 CLOSED; if any fail it moves back to OPEN.

    Parameters
    ----------
    name:
        Human-readable identifier used in log messages.
    failure_threshold:
        Number of failures within *window* seconds that triggers the OPEN state.
    recovery_timeout:
        Seconds to wait in OPEN before transitioning to HALF_OPEN.
    half_open_max_calls:
        Maximum concurrent trial calls allowed in HALF_OPEN.
    window:
        Rolling time window (seconds) for counting failures.
    """

    def __init__(
        self,
        name: str = "default",
        failure_threshold: int = 5,
        recovery_timeout: float = 30.0,
        half_open_max_calls: int = 3,
        window: float = 60.0,
    ) -> None:
        self.name = name
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.half_open_max_calls = half_open_max_calls
        self.window = window

        self._state = _State.CLOSED
        self._failure_timestamps: list[float] = []
        self._opened_at: float = 0.0
        self._half_open_calls: int = 0
        self._half_open_successes: int = 0

    # -- public properties ---------------------------------------------------

    @property
    def state(self) -> str:
        """Return the current state as a lowercase string."""
        self._maybe_transition()
        return self._state.value

    # -- public methods ------------------------------------------------------

    def reset(self) -> None:
        """Manually reset the breaker to CLOSED."""
        self._state = _State.CLOSED
        self._failure_timestamps.clear()
        self._opened_at = 0.0
        self._half_open_calls = 0
        self._half_open_successes = 0
        logger.info("CircuitBreaker[%s]: manually reset to CLOSED", self.name)

    async def call(self, func: Callable[..., Coroutine], *args: Any, **kwargs: Any) -> Any:
        """Execute *func* through the circuit breaker.

        Raises *CircuitOpenError* if the breaker is OPEN.
        """
        self._maybe_transition()

        if self._state == _State.OPEN:
            remaining = self.recovery_timeout - (time.monotonic() - self._opened_at)
            raise CircuitOpenError(self.name, max(remaining, 0))

        if self._state == _State.HALF_OPEN:
            if self._half_open_calls >= self.half_open_max_calls:
                raise CircuitOpenError(self.name, self.recovery_timeout)
            self._half_open_calls += 1

        try:
            result = await func(*args, **kwargs)
        except Exception as exc:
            self._record_failure()
            raise
        else:
            self._record_success()
            return result

    # -- internal helpers ----------------------------------------------------

    def _maybe_transition(self) -> None:
        """Check whether a state transition is due."""
        if self._state == _State.OPEN:
            elapsed = time.monotonic() - self._opened_at
            if elapsed >= self.recovery_timeout:
                logger.info(
                    "CircuitBreaker[%s]: OPEN -> HALF_OPEN after %.1fs",
                    self.name,
                    elapsed,
                )
                self._state = _State.HALF_OPEN
                self._half_open_calls = 0
                self._half_open_successes = 0

    def _record_failure(self) -> None:
        now = time.monotonic()
        if self._state == _State.HALF_OPEN:
            logger.warning(
                "CircuitBreaker[%s]: failure in HALF_OPEN -> OPEN",
                self.name,
            )
            self._trip(now)
            return

        self._failure_timestamps.append(now)
        # Prune timestamps outside the rolling window.
        cutoff = now - self.window
        self._failure_timestamps = [t for t in self._failure_timestamps if t > cutoff]

        if len(self._failure_timestamps) >= self.failure_threshold:
            logger.warning(
                "CircuitBreaker[%s]: %d failures in %.0fs window -> OPEN",
                self.name,
                len(self._failure_timestamps),
                self.window,
            )
            self._trip(now)

    def _record_success(self) -> None:
        if self._state == _State.HALF_OPEN:
            self._half_open_successes += 1
            if self._half_open_successes >= self.half_open_max_calls:
                logger.info(
                    "CircuitBreaker[%s]: %d successes in HALF_OPEN -> CLOSED",
                    self.name,
                    self._half_open_successes,
                )
                self.reset()

    def _trip(self, now: float) -> None:
        self._state = _State.OPEN
        self._opened_at = now
        self._failure_timestamps.clear()


# ---------------------------------------------------------------------------
# Pre-configured breakers for common external services
# ---------------------------------------------------------------------------

redis_breaker = CircuitBreaker(
    name="redis",
    failure_threshold=5,
    recovery_timeout=30.0,
    half_open_max_calls=3,
)

stripe_breaker = CircuitBreaker(
    name="stripe",
    failure_threshold=5,
    recovery_timeout=60.0,
    half_open_max_calls=2,
)

email_breaker = CircuitBreaker(
    name="email",
    failure_threshold=5,
    recovery_timeout=45.0,
    half_open_max_calls=3,
)
