# Jobsy Feature Parity Matrix

Every feature must exist across all applicable layers before it is considered complete.
Check this file before closing any feature ticket.

## Legend
- ✅ Complete
- N/A — Not applicable to this layer

---

## Authentication & Accounts

| Feature | Backend API | Web | Mobile | Admin |
|---|---|---|---|---|
| Register (client) | ✅ | ✅ | ✅ | N/A |
| Register (provider) | ✅ | ✅ | ✅ | N/A |
| Login (email + password) | ✅ | ✅ | ✅ | ✅ |
| Login (Google OAuth) | ✅ | ✅ | ✅ | N/A |
| Forgot password / reset | ✅ | ✅ | ✅ | N/A |
| Email verification | ✅ | ✅ | ✅ | N/A |
| JWT refresh rotation | ✅ | ✅ | ✅ | ✅ |
| Logout (all devices) | ✅ | ✅ | ✅ | ✅ |
| Delete account | ✅ | ✅ | ✅ | N/A |

## User Profiles

| Feature | Backend API | Web | Mobile | Admin |
|---|---|---|---|---|
| View own profile | ✅ | ✅ | ✅ | ✅ |
| Edit profile (name, bio, photo) | ✅ | ✅ | ✅ | ✅ |
| Upload avatar (Cloudinary) | ✅ | ✅ | ✅ | ✅ |
| View public provider profile | ✅ | ✅ | ✅ | ✅ |
| Provider: add portfolio photos | ✅ | ✅ | ✅ | N/A |
| Provider: set service areas | ✅ | ✅ | ✅ | N/A |
| Provider: verification badge | ✅ | ✅ | ✅ | ✅ |
| Profile completion score | ✅ | ✅ | ✅ | N/A |

## Service Listings

| Feature | Backend API | Web | Mobile | Admin |
|---|---|---|---|---|
| Create service listing | ✅ | ✅ | ✅ | ✅ |
| Edit service listing | ✅ | ✅ | ✅ | ✅ |
| Delete service listing | ✅ | ✅ | ✅ | ✅ |
| Upload listing photos | ✅ | ✅ | ✅ | ✅ |
| Set pricing (fixed / hourly) | ✅ | ✅ | ✅ | N/A |
| Set availability / hours | ✅ | ✅ | ✅ | N/A |
| Pause listing | ✅ | ✅ | ✅ | ✅ |
| Listing approval flow | ✅ | N/A | N/A | ✅ |

## Search & Discovery

| Feature | Backend API | Web | Mobile | Admin |
|---|---|---|---|---|
| Full-text search | ✅ | ✅ | ✅ | N/A |
| Filter by category | ✅ | ✅ | ✅ | N/A |
| Filter by price range | ✅ | ✅ | ✅ | N/A |
| Filter by rating | ✅ | ✅ | ✅ | N/A |
| Filter by distance (Mapbox) | ✅ | ✅ | ✅ | N/A |
| Filter by availability | ✅ | ✅ | ✅ | N/A |
| Map view | ✅ | ✅ | ✅ | N/A |
| Sort results | ✅ | ✅ | ✅ | N/A |
| Search history (saved) | ✅ | ✅ | ✅ | N/A |

## Bookings

| Feature | Backend API | Web | Mobile | Admin |
|---|---|---|---|---|
| Create booking | ✅ | ✅ | ✅ | N/A |
| Provider: confirm booking | ✅ | ✅ | ✅ | N/A |
| Provider: reject booking | ✅ | ✅ | ✅ | N/A |
| Client: cancel booking | ✅ | ✅ | ✅ | N/A |
| Provider: cancel booking | ✅ | ✅ | ✅ | N/A |
| Mark as complete | ✅ | ✅ | ✅ | ✅ |
| Reschedule booking | ✅ | ✅ | ✅ | N/A |
| Booking history | ✅ | ✅ | ✅ | ✅ |
| Booking status timeline | ✅ | ✅ | ✅ | ✅ |
| Add to calendar (ICS) | ✅ | ✅ | ✅ | N/A |
| Booking reminders (push/email) | ✅ | N/A | ✅ | N/A |

## Payments (Stripe)

| Feature | Backend API | Web | Mobile | Admin |
|---|---|---|---|---|
| Pay for booking (card) | ✅ | ✅ | ✅ | N/A |
| Pay for booking (PayPal) | ✅ | ✅ | ✅ | N/A |
| Hold payment (authorize) | ✅ | ✅ | ✅ | N/A |
| Release payment on completion | ✅ | ✅ | ✅ | N/A |
| Refund (full / partial) | ✅ | ✅ | ✅ | ✅ |
| Provider: Stripe Connect payout | ✅ | ✅ | ✅ | ✅ |
| Payment receipt (email) | ✅ | N/A | N/A | ✅ |
| Earnings dashboard | ✅ | ✅ | ✅ | ✅ |
| Transaction history | ✅ | ✅ | ✅ | ✅ |
| Stripe webhook handling | ✅ | N/A | N/A | N/A |
| Platform fee calculation | ✅ | N/A | N/A | ✅ |

## Chat (Stream Chat)

| Feature | Backend API | Web | Mobile | Admin |
|---|---|---|---|---|
| Send/receive messages | ✅ | ✅ | ✅ | N/A |
| Read receipts | ✅ | ✅ | ✅ | N/A |
| Typing indicators | ✅ | ✅ | ✅ | N/A |
| Image sharing in chat | ✅ | ✅ | ✅ | N/A |
| Booking context in chat | ✅ | ✅ | ✅ | N/A |
| Unread message count badge | ✅ | ✅ | ✅ | N/A |
| Push notification for new msg | ✅ | N/A | ✅ | N/A |
| Block user | ✅ | ✅ | ✅ | ✅ |
| Admin: view chat logs | N/A | N/A | N/A | ✅ |

## Reviews

| Feature | Backend API | Web | Mobile | Admin |
|---|---|---|---|---|
| Leave review (client → provider) | ✅ | ✅ | ✅ | N/A |
| Leave review (provider → client) | ✅ | ✅ | ✅ | N/A |
| View reviews on profile | ✅ | ✅ | ✅ | N/A |
| Reply to review | ✅ | ✅ | ✅ | N/A |
| Flag/report review | ✅ | ✅ | ✅ | ✅ |
| Moderate reviews | N/A | N/A | N/A | ✅ |
| Review request (24h post-job) | ✅ | N/A | ✅ | N/A |

## Notifications

| Feature | Backend API | Web | Mobile | Admin |
|---|---|---|---|---|
| Email notifications (SendGrid) | ✅ | N/A | N/A | N/A |
| Push notifications (Expo) | ✅ | N/A | ✅ | N/A |
| In-app notification centre | ✅ | ✅ | ✅ | N/A |
| Notification preferences | ✅ | ✅ | ✅ | N/A |

## Admin Dashboard

| Feature | Backend API | Web | Mobile | Admin |
|---|---|---|---|---|
| User management (CRUD) | ✅ | N/A | N/A | ✅ |
| Provider verification | ✅ | N/A | N/A | ✅ |
| Listing moderation | ✅ | N/A | N/A | ✅ |
| Dispute management | ✅ | N/A | N/A | ✅ |
| Direct image upload (Cloudinary) | ✅ | N/A | N/A | ✅ |
| Revenue analytics | ✅ | N/A | N/A | ✅ |
| User analytics (PostHog) | N/A | N/A | N/A | ✅ |
| Platform settings | ✅ | N/A | N/A | ✅ |
| Bulk actions (users/listings) | ✅ | N/A | N/A | ✅ |

---

## How to Use This File

When completing any feature:
1. Find the feature row in the table above
2. Confirm all applicable layers are ✅
3. Update this table as part of your PR
4. If a layer shows 🔄 or ❌, either complete it or create a ticket for it — don't ship a partial feature silently

**A feature is not done until all applicable layers show ✅.**
