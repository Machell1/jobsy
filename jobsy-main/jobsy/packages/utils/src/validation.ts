import { z } from "zod";

/**
 * Jamaican phone number: +1876 followed by 7 digits.
 */
export const phoneSchema = z
  .string()
  .regex(/^\+1876\d{7}$/, "Must be a valid Jamaican phone number (+1876XXXXXXX)");

/**
 * Email address validated by Zod's built-in email check.
 */
export const emailSchema = z
  .string()
  .email("Must be a valid email address")
  .min(1, "Email is required");

/**
 * Password: minimum 8 characters, at least one uppercase,
 * one lowercase, and one digit.
 */
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/\d/, "Password must contain at least one number");

/**
 * OTP code: exactly 6 digits.
 */
export const otpSchema = z
  .string()
  .length(6, "OTP must be exactly 6 digits")
  .regex(/^\d{6}$/, "OTP must contain only digits");

/**
 * Jamaican parish name.
 */
export const parishSchema = z.enum([
  "Kingston",
  "St. Andrew",
  "St. Thomas",
  "Portland",
  "St. Mary",
  "St. Ann",
  "Trelawny",
  "St. James",
  "Hanover",
  "Westmoreland",
  "St. Elizabeth",
  "Manchester",
  "Clarendon",
  "St. Catherine",
]);

/**
 * Login form schema.
 */
export const loginSchema = z.object({
  phone: phoneSchema,
  password: z.string().min(1, "Password is required"),
});

/**
 * Registration form schema.
 */
export const registerSchema = z.object({
  phone: phoneSchema,
  email: emailSchema.optional(),
  password: passwordSchema,
  role: z.enum(["user", "provider", "hirer", "advertiser"]).default("user"),
  display_name: z.string().min(1).max(100).optional(),
  parish: parishSchema.optional(),
  service_category: z.string().optional(),
  bio: z.string().max(500).optional(),
});

/**
 * Listing creation form schema.
 */
export const createListingSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().min(1, "Description is required"),
  category: z.string().min(1, "Category is required"),
  subcategory: z.string().optional(),
  budget_min: z.number().positive().optional(),
  budget_max: z.number().positive().optional(),
  parish: parishSchema.optional(),
  address_text: z.string().max(255).optional(),
});

/**
 * Review creation form schema.
 */
export const createReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  title: z.string().max(200).optional(),
  body: z.string().max(2000).optional(),
  quality_rating: z.number().int().min(1).max(5).optional(),
  punctuality_rating: z.number().int().min(1).max(5).optional(),
  communication_rating: z.number().int().min(1).max(5).optional(),
  value_rating: z.number().int().min(1).max(5).optional(),
});
