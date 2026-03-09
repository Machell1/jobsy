"""Simple circuit breaker for inter-service HTTP calls.

Prevents cascade failures when downstream services are unavailable.
States:
  - CLOSED: Normal operation, requests pass through
  - OPEN: Service is down, fail fast without making requests
  - HALF_OPEN: Test with a single request to see if service recovered
"""

import logging
import time
from collections import defaultdict

logger = logging.getLogger(__name__)

# Circuit breaker state per service
_circuits: dict[str, dict] = defaultdict(lambda: {
    "state": "closed",
    "failure_count": 0,
    "last_failure_time": 0.0,
    "success_count": 0,
})

# Configuration
FAILURE_THRESHOLD = 5  # failures before opening circuit
RESET_TIMEOUT_SECONDS = 30  # time before trying half-open
HALF_OPEN_SUCCESS_THRESHOLD = 2  # successes needed to close again


def get_circuit_state(service_name: str) -> str:
    """Get the current circuit state for a service."""
    circuit = _circuits[service_name]

    if circuit["state"] == "open" and time.time() - circuit["last_failure_time"] >= RESET_TIMEOUT_SECONDS:
            circuit["state"] = "half_open"
            circuit["success_count"] = 0
            logger.info("Circuit for %s moved to HALF_OPEN", service_name)

    return circuit["state"]


def is_circuit_open(service_name: str) -> bool:
    """Check if the circuit is open (should fail fast)."""
    return get_circuit_state(service_name) == "open"


def record_success(service_name: str) -> None:
    """Record a successful request to a service."""
    circuit = _circuits[service_name]

    if circuit["state"] == "half_open":
        circuit["success_count"] += 1
        if circuit["success_count"] >= HALF_OPEN_SUCCESS_THRESHOLD:
            circuit["state"] = "closed"
            circuit["failure_count"] = 0
            logger.info("Circuit for %s CLOSED (service recovered)", service_name)
    elif circuit["state"] == "closed":
        circuit["failure_count"] = 0


def record_failure(service_name: str) -> None:
    """Record a failed request to a service."""
    circuit = _circuits[service_name]
    circuit["failure_count"] += 1
    circuit["last_failure_time"] = time.time()

    if circuit["state"] == "half_open":
        # Failed during test -- reopen
        circuit["state"] = "open"
        logger.warning("Circuit for %s re-OPENED (half-open test failed)", service_name)
    elif circuit["failure_count"] >= FAILURE_THRESHOLD:
        circuit["state"] = "open"
        logger.warning(
            "Circuit for %s OPENED after %d failures",
            service_name, circuit["failure_count"],
        )


def reset_circuit(service_name: str) -> None:
    """Manually reset a circuit to closed state."""
    _circuits[service_name] = {
        "state": "closed",
        "failure_count": 0,
        "last_failure_time": 0.0,
        "success_count": 0,
    }
