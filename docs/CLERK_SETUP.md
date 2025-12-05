# Clerk Authentication Setup Guide

This document explains how to set up Clerk passwordless authentication for both the Medical Clinic and Veterinary Clinic applications.

## Overview

Both apps use [Clerk](https://clerk.com) for patient/pet owner authentication:
- **Medical Clinic**: Patients sign in to manage their appointments
- **Vet Clinic**: Pet owners sign in to manage appointments for their pets

## Current Implementation Status

### What's Already Built
- `ClerkContext.tsx` - Safe wrapper that gracefully handles missing Clerk configuration
- `clerkAuth.ts` middleware - Skips auth when Clerk keys aren't configured
- Sign-in UI components in booking flows
- Backend routes protected by Clerk middleware

### What's Missing
- Actual Clerk application keys
- Production Clerk configuration

## Setup Steps

### Step 1: Create Clerk Applications

You have two options:

#### Option A: Separate Applications (Recommended for production)
Create two separate Clerk applications:
1. **Medical Clinic App** - for patient authentication
2. **Vet Clinic App** - for pet owner authentication

This provides:
- Separate user bases
- Independent branding/customization
- Isolated user data

#### Option B: Single Application with Organizations
Use one Clerk application with organizations/multi-tenancy:
- Single user pool
- Users can be members of both clinics
- Shared authentication experience

### Step 2: Configure Clerk Dashboard

For each application:

1. **Sign up at [clerk.com](https://clerk.com)** and create a new application

2. **Configure Authentication Methods:**
   - Enable **Email** authentication
   - Enable **Phone (SMS)** authentication for passwordless
   - Optionally enable **Social providers** (Google, etc.)

3. **Configure Session Settings:**
   - Set session lifetime (recommended: 7 days for healthcare)
   - Enable multi-factor authentication (recommended for PHIPA compliance)

4. **Get API Keys:**
   - Copy the **Publishable Key** (starts with `pk_`)
   - Copy the **Secret Key** (starts with `sk_`)

### Step 3: Set Environment Variables

#### Medical Clinic Backend (`apps/medical-clinic/backend/.env`)
```bash
CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
CLERK_SECRET_KEY=sk_test_xxxxx
```

#### Medical Clinic Frontend (`apps/medical-clinic/frontend/.env`)
```bash
VITE_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
```

#### Vet Clinic Backend (`apps/vet-clinic/backend/.env`)
```bash
CLERK_PUBLISHABLE_KEY=pk_test_xxxxx  # Can be same or different from medical
CLERK_SECRET_KEY=sk_test_xxxxx
```

#### Vet Clinic Frontend (`apps/vet-clinic/frontend/.env`)
```bash
VITE_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
```

### Step 4: Update Frontend ClerkProvider

The frontend apps need to wrap the app with ClerkProvider. This is already set up in `ClerkContext.tsx` but needs the key:

```tsx
// src/main.tsx
import { ClerkProvider } from '@clerk/clerk-react';

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

function App() {
  if (!clerkPubKey) {
    // Clerk not configured - app runs without auth
    return <RouterProvider router={router} />;
  }

  return (
    <ClerkProvider publishableKey={clerkPubKey}>
      <RouterProvider router={router} />
    </ClerkProvider>
  );
}
```

### Step 5: Link Users to Patients/Owners

When a user signs in via Clerk, you need to link them to the patient/owner record:

#### Medical Clinic Flow:
1. User signs in via Clerk
2. Backend looks up patient by `clerkUserId`
3. If not found, create patient record linked to Clerk user
4. Patient can now book/manage appointments

#### Vet Clinic Flow:
1. User signs in via Clerk
2. Backend looks up pet owner by `clerkUserId`
3. If not found, create owner record linked to Clerk user
4. Owner can now add pets and book appointments

## Webhook Configuration (Optional)

For real-time user sync, configure Clerk webhooks:

1. In Clerk Dashboard, go to **Webhooks**
2. Add endpoint URL: `https://your-api.com/webhooks/clerk`
3. Select events:
   - `user.created`
   - `user.updated`
   - `user.deleted`

4. Implement webhook handler:
```typescript
app.post('/webhooks/clerk', async (req, res) => {
  const { type, data } = req.body;

  switch (type) {
    case 'user.created':
      // Auto-create patient/owner record
      break;
    case 'user.deleted':
      // Handle user deletion (PHIPA compliance)
      break;
  }

  res.json({ received: true });
});
```

## Testing Locally

### Without Clerk (Current State)
Apps work without Clerk configuration:
- Sign-in UI shows "Continue as a guest"
- Backend skips Clerk auth middleware
- All routes accessible

### With Clerk Test Keys
1. Create a Clerk development application
2. Add test keys to `.env` files
3. Restart backend and frontend
4. Test sign-in flow:
   - Email magic link
   - Phone OTP
   - Social providers

## Security Considerations

### PHIPA Compliance
- Enable MFA for healthcare applications
- Configure appropriate session timeouts
- Implement audit logging for auth events
- Review Clerk's SOC 2 Type 2 compliance

### Data Residency
- Clerk stores data in the US by default
- For Canadian data residency requirements, contact Clerk support
- Consider proxying auth requests through Canadian infrastructure

### Consent Management
- Capture explicit consent during sign-up
- Store consent records in your database
- Link consent to Clerk user ID

## Environment-Specific Configuration

### Development
```bash
CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
CLERK_SECRET_KEY=sk_test_xxxxx
```

### Staging
```bash
CLERK_PUBLISHABLE_KEY=pk_test_xxxxx  # Still test keys
CLERK_SECRET_KEY=sk_test_xxxxx
```

### Production
```bash
CLERK_PUBLISHABLE_KEY=pk_live_xxxxx  # Live keys
CLERK_SECRET_KEY=sk_live_xxxxx
# Additional production settings:
CLERK_ALLOWED_ORIGINS=https://medical.yoursite.com,https://vet.yoursite.com
```

## Troubleshooting

### "Publishable key is missing"
- Check environment variables are set correctly
- Ensure `.env` file is in the correct location
- Restart the server after adding keys

### "Invalid signature"
- Verify the secret key matches your Clerk application
- Check for typos in the key

### User not linking to patient/owner
- Verify the Clerk user ID is being passed correctly
- Check the database for existing records with that `clerkUserId`
- Review backend logs for errors

## Next Steps

1. Create Clerk application at [clerk.com](https://clerk.com)
2. Copy keys to environment files
3. Test sign-in flow locally
4. Configure webhooks for production
5. Review security settings for PHIPA compliance
