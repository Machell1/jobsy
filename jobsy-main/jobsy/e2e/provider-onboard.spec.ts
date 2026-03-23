import { test, expect } from '@playwright/test';

test.describe('Provider Onboarding — Critical Journey', () => {
  // Step 1: Provider signs up with email or social login
  // test('provider can create an account', async ({ page }) => {
  //   await page.goto('/signup');
  //   // Select "I'm a service provider" option
  //   // Fill in email, password, name
  //   // Submit registration form
  //   // Verify email verification prompt is shown
  // });

  // Step 2: Provider completes profile setup
  // test('provider can fill in profile details', async ({ page }) => {
  //   await page.goto('/onboarding/profile');
  //   // Upload profile photo
  //   // Enter business name and description
  //   // Select service categories
  //   // Set service area / location
  //   // Verify profile preview shows correct info
  // });

  // Step 3: Provider adds services and pricing
  // test('provider can add services with pricing', async ({ page }) => {
  //   await page.goto('/onboarding/services');
  //   // Click "Add Service"
  //   // Enter service name, description, duration, price
  //   // Save service
  //   // Verify service appears in the list
  //   // Add at least one more service
  // });

  // Step 4: Provider sets availability schedule
  // test('provider can set weekly availability', async ({ page }) => {
  //   await page.goto('/onboarding/availability');
  //   // Set available hours for each day of the week
  //   // Mark days off
  //   // Save availability
  //   // Verify schedule summary is correct
  // });

  // Step 5: Provider connects payment account
  // test('provider can connect payment method for receiving payments', async ({ page }) => {
  //   await page.goto('/onboarding/payments');
  //   // Enter bank account or payment processor details
  //   // Verify connection status
  //   // Complete onboarding
  // });

  // Step 6: Provider profile is visible in search
  // test('newly onboarded provider appears in search results', async ({ page }) => {
  //   await page.goto('/');
  //   // Search for the provider's service category
  //   // Verify provider appears in results
  //   // Verify profile shows correct services and pricing
  // });
});
