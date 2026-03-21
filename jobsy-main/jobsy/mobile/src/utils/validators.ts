export function isValidJamaicanPhone(phone: string): boolean {
  // Accept both Jamaica area codes (+1876 and +1658)
  return /^\+1(876|658)\d{7}$/.test(phone);
}

export function isValidInternationalPhone(phone: string): boolean {
  // Accept any international phone number: + followed by 7-15 digits
  return /^\+\d{7,15}$/.test(phone);
}

export function isValidPhone(phone: string): boolean {
  return isValidJamaicanPhone(phone) || isValidInternationalPhone(phone);
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
