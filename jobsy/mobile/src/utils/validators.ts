export function isValidJamaicanPhone(phone: string): boolean {
  return /^\+1876\d{7}$/.test(phone);
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidPassword(password: string): string | null {
  if (password.length < 8) return "Password must be at least 8 characters";
  return null;
}

export function formatPhoneInput(text: string): string {
  // Auto-prefix with +1876 if user types digits
  const digits = text.replace(/\D/g, "");
  if (digits.length <= 7) {
    return `+1876${digits}`;
  }
  if (digits.startsWith("1876")) {
    return `+${digits.slice(0, 11)}`;
  }
  return text;
}
