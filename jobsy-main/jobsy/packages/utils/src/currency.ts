/**
 * Format a number as Jamaican Dollars (JMD).
 *
 * @example formatJMD(1500)   // "J$1,500.00"
 * @example formatJMD(1500, { decimals: 0 }) // "J$1,500"
 */
export function formatJMD(
  amount: number,
  options?: { decimals?: number },
): string {
  const decimals = options?.decimals ?? 2;

  const formatted = new Intl.NumberFormat("en-JM", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);

  return `J$${formatted}`;
}

/**
 * Parse a JMD-formatted string back to a number.
 * Strips "J$", commas, and whitespace.
 *
 * @example parseAmount("J$1,500.00") // 1500
 * @example parseAmount("1500")       // 1500
 */
export function parseAmount(value: string): number {
  const cleaned = value.replace(/[J$,\s]/g, "");
  const num = Number(cleaned);
  if (Number.isNaN(num)) {
    throw new Error(`Cannot parse "${value}" as a currency amount`);
  }
  return num;
}

/**
 * Format a generic currency amount using the appropriate locale.
 */
export function formatCurrency(
  amount: number,
  currency: string = "JMD",
): string {
  if (currency === "JMD") return formatJMD(amount);

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount);
}
