# Jobsy - App Store Submission Metadata

## App Information

### App Name
**Jobsy - Jamaica's Service Marketplace**

### Subtitle (iOS, 30 chars max)
Find & Book Local Services

### Category
- **Primary:** Lifestyle
- **Secondary:** Business

### App Description (both stores)

**Short Description (Google Play, 80 chars max):**
Find trusted service providers across Jamaica. Book, bid, and hire locally.

**Full Description:**

Jobsy connects you with trusted, verified service providers across all 14 parishes of Jamaica. Whether you need a plumber, electrician, hairstylist, caterer, photographer, or any other professional - Jobsy makes it easy to find, compare, and book the right person for the job.

**For Customers:**
• Browse verified service providers by category, location, and rating
• Post jobs and receive competitive bids from qualified professionals
• Book services with transparent pricing in JMD
• Chat directly with providers via secure in-app messaging
• Track bookings from inquiry to completion
• Leave reviews to help the community find quality service

**For Service Providers:**
• Create a professional profile to showcase your skills and portfolio
• Receive job notifications matched to your expertise and location
• Bid on posted jobs with custom proposals
• Manage bookings, contracts, and client communications in one place
• Build your reputation with verified reviews and ratings
• Grow your business with the Noticeboard - post updates, promotions, and portfolio pieces

**Key Features:**
• Digital contracts with built-in e-signatures
• Real-time messaging powered by Stream Chat
• Smart job matching based on category and parish
• Secure bidding system with auto-approval workflows
• Provider verification and trust badges
• Comprehensive notification system
• Role switching - be both a customer and a provider

**Built for Jamaica:**
Jobsy is designed specifically for the Jamaican market, with support for all 14 parishes, JMD currency, and local phone number formats. From Kingston to Montego Bay, Portland to Westmoreland - find services wherever you are on the island.

Download Jobsy today and experience a better way to find and hire local services in Jamaica.

### Keywords (iOS, 100 chars max)
services,jamaica,hire,plumber,electrician,handyman,booking,provider,contractor,freelance,local,jobs

### What's New (Version 1.0.0)
Welcome to Jobsy! This is the initial release of Jamaica's premier service marketplace:
• Find and book verified service providers
• Post jobs and receive competitive bids
• Secure in-app messaging
• Digital contracts and e-signatures
• Provider profiles with reviews and ratings

---

## Content Rating

### iOS (App Store)
- **Age Rating:** 4+
- **Contains:** No objectionable content
- **Unrestricted Web Access:** No
- **Gambling:** No

### Google Play
- **Content Rating:** Everyone
- **Interactive Elements:** Users interact, shares info, digital purchases
- **Contains Ads:** No

---

## Privacy & Compliance

### Privacy Policy URL
https://www.jobsyja.com/#/privacy-policy

### Terms of Service URL
https://www.jobsyja.com/#/terms-of-service

### App Privacy (iOS)
**Data Collected:**
- Contact Info (name, email, phone number) - used for account functionality
- Location - used for finding nearby services
- User Content (photos, reviews) - used for app functionality
- Identifiers (user ID) - used for app functionality
- Usage Data - used for analytics

**Data NOT Collected:**
- Financial info (handled by payment processor)
- Health & fitness data
- Browsing history
- Search history outside the app

### Data Safety (Google Play)
- **Data shared with third parties:** No personal data shared
- **Data collected:** Name, phone, email, location, photos, app interactions
- **Security practices:** Data encrypted in transit, data can be deleted by request
- **Data deletion:** Users can request account deletion via settings

---

## Developer Information

### Developer Name
Machell Williams

### Developer Email
williamsmachell@gmail.com

### Website
https://www.jobsyja.com

### Support URL
https://www.jobsyja.com/#/settings (in-app support)

---

## Required Assets Checklist

### App Icon
- [x] 1024x1024 PNG (no alpha/transparency) - required for both stores
- iOS: Automatically generated from app.json icon
- Android: Adaptive icon configured in app.json

### Screenshots Needed

**iPhone 6.7" Display (1290 x 2796):** - Required for iOS
1. Home/Landing screen - "Find Trusted Services Across Jamaica"
2. Search/Browse providers - "Browse by Category & Parish"
3. Provider profile - "View Ratings, Reviews & Portfolio"
4. Job Board - "Post Jobs & Receive Bids"
5. Messages - "Chat Directly with Providers"
6. Booking confirmation - "Book with Confidence"

**iPhone 6.5" Display (1242 x 2688):** - Required for iOS
Same 6 screenshots at this resolution

**Android Phone (1080 x 1920 minimum):** - Required for Google Play
Same 6 screenshots concept, minimum 2, maximum 8

### Feature Graphic (Google Play only)
- 1024 x 500 PNG/JPG
- Visual with Jobsy branding, tagline, Jamaican visual elements

---

## Pre-Submission Steps

### Apple App Store
1. ☐ Enroll in Apple Developer Program ($99/year) at developer.apple.com
2. ☐ Create App ID with bundle identifier: com.williamsmachell.jobsy
3. ☐ Generate provisioning profiles and certificates
4. ☐ Run `eas build --platform ios --profile production`
5. ☐ Upload IPA to App Store Connect via Transporter or EAS Submit
6. ☐ Fill in all metadata in App Store Connect
7. ☐ Upload screenshots for required device sizes
8. ☐ Complete App Privacy questionnaire
9. ☐ Submit for review

### Google Play Store
1. ☐ Create Google Play Console account ($25 one-time) at play.google.com/console
2. ☐ Create new app with package name: com.jobsy.app
3. ☐ Run `eas build --platform android --profile production`
4. ☐ Upload AAB to production track (or internal testing first)
5. ☐ Fill in all store listing metadata
6. ☐ Upload screenshots and feature graphic
7. ☐ Complete content rating questionnaire
8. ☐ Complete data safety form
9. ☐ Set up pricing (Free)
10. ☐ Submit for review

---

## EAS Build Commands

```bash
# Navigate to mobile directory
cd jobsy/mobile

# Build for iOS (requires Apple Developer account)
npx eas-cli build --platform ios --profile production

# Build for Android
npx eas-cli build --platform android --profile production

# Submit to stores (after builds complete)
npx eas-cli submit --platform ios --profile production
npx eas-cli submit --platform android --profile production
```

---

## Review Tips
- Ensure demo account works: phone +18761234501, password DemoPass123!
- Have API (api.jobsyja.com) healthy and responsive
- Test all major flows: registration, browsing, posting jobs, bidding, messaging
- Provide demo credentials in review notes if app requires login
- Apple typically reviews in 24-48 hours
- Google Play typically reviews in a few hours to 7 days
