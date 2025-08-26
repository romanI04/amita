# Supabase Email Configuration Fix

## Quick Fix (Development Only)
1. Go to: https://supabase.com/dashboard/project/zvaiwwlvwglbqjwwjwyc/auth/providers
2. Click on "Email" provider
3. Turn OFF "Confirm email" toggle
4. Save changes

## Production Setup with Resend (Free)

### Step 1: Create Resend Account
1. Go to https://resend.com/signup
2. Create free account (10,000 emails/month free)
3. Verify your domain or use their test domain

### Step 2: Get Resend API Key
1. Go to https://resend.com/api-keys
2. Create new API key
3. Copy the key

### Step 3: Configure in Supabase
1. Go to: https://supabase.com/dashboard/project/zvaiwwlvwglbqjwwjwyc/settings/auth
2. Scroll to "SMTP Settings"
3. Enable "Custom SMTP"
4. Enter these settings:

```
Host: smtp.resend.com
Port: 465
Username: resend
Password: [Your Resend API Key]
Sender email: noreply@yourdomain.com (or onboarding@resend.dev for testing)
Sender name: Amita AI
```

5. Click "Save"

### Step 4: Test
Try signing up with a new email address.

## Alternative: Use Supabase Defaults
If you just want basic email for testing:
1. Go to Authentication → Email Templates
2. Make sure "Enable Custom SMTP" is OFF
3. Note: Limited to 3 emails/hour on free plan

## Troubleshooting
- If emails aren't sending, check Supabase logs: Project Settings → Logs → Auth Logs
- Make sure your Supabase project isn't paused (happens after 1 week of inactivity on free tier)