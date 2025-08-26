# Custom SMTP Setup for Amita.ai

## Option 1: Resend (Recommended - 5 min setup)
**Free: 3,000 emails/month | No credit card required**

### Step 1: Create Resend Account
1. Go to https://resend.com/signup
2. Sign up with your email
3. Verify your email address

### Step 2: Get API Key
1. Go to https://resend.com/api-keys
2. Click "Create API Key"
3. Name it "Supabase SMTP"
4. Copy the API key (starts with `re_`)

### Step 3: Configure in Supabase
1. Go to: https://supabase.com/dashboard/project/zvaiwwlvwglbqjwwjwyc/settings/auth
2. Scroll down to "SMTP Settings"
3. Toggle ON "Enable Custom SMTP"
4. Enter these settings:

```
Sender email: onboarding@resend.dev (for testing)
Sender name: Amita AI
Host: smtp.resend.com
Port: 465
Username: resend
Password: [Your API key from Step 2]
```

5. Click "Save"

### Step 4: Update Email Templates (Optional)
1. Go to Authentication → Email Templates
2. Customize your confirmation email template
3. Use your brand colors and logo

---

## Option 2: Brevo (SendinBlue) - 300 emails/day free
**Free: 300 emails/day | No credit card required**

### Step 1: Create Brevo Account
1. Go to https://www.brevo.com/sign-up/
2. Complete signup process
3. Verify your email

### Step 2: Get SMTP Credentials
1. Go to https://app.brevo.com/settings/keys/smtp
2. Click "Generate a new SMTP key"
3. Copy the key

### Step 3: Configure in Supabase
```
Sender email: [your-verified-email]
Sender name: Amita AI
Host: smtp-relay.brevo.com
Port: 587
Username: [Your Brevo login email]
Password: [Your SMTP key from Step 2]
```

---

## Option 3: Gmail SMTP (Personal Use Only)
**Free: 500 emails/day | Requires 2FA**

### Step 1: Enable 2FA on Gmail
1. Go to https://myaccount.google.com/security
2. Enable 2-Step Verification

### Step 2: Create App Password
1. Go to https://myaccount.google.com/apppasswords
2. Select "Mail" and "Other (Custom)"
3. Name it "Supabase"
4. Copy the 16-character password

### Step 3: Configure in Supabase
```
Sender email: your.email@gmail.com
Sender name: Amita AI
Host: smtp.gmail.com
Port: 587
Username: your.email@gmail.com
Password: [16-character app password]
```

---

## Option 4: Mailgun (100 emails/day free for 3 months)
**Free trial: 100 emails/day | Credit card required**

### Step 1: Create Mailgun Account
1. Go to https://signup.mailgun.com/new/signup
2. Complete signup (credit card required but won't be charged)
3. Verify your email

### Step 2: Add Domain or Use Sandbox
1. Go to Sending → Domains
2. Either add your domain OR
3. Use the sandbox domain for testing

### Step 3: Get SMTP Credentials
1. Go to Sending → Domain settings → SMTP credentials
2. Copy the credentials

### Step 4: Configure in Supabase
```
Sender email: postmaster@[your-domain]
Sender name: Amita AI
Host: smtp.mailgun.org
Port: 587
Username: postmaster@[your-domain]
Password: [Your SMTP password]
```

---

## Testing Your SMTP Setup

### 1. Test in Supabase Dashboard
1. After saving SMTP settings
2. Go to Authentication → Email Templates
3. Click "Send test email"
4. Check your inbox

### 2. Test with Real Signup
1. Try signing up with a new email
2. Check for confirmation email
3. Click the confirmation link

### 3. Check Logs if Issues
1. Go to Project Settings → Logs → Auth Logs
2. Look for email sending errors
3. Common issues:
   - Wrong port (use 465 for SSL, 587 for TLS)
   - Sender email not verified
   - API key/password incorrect

---

## Environment Variables (Optional)
Add to `.env.local` for documentation:

```env
# SMTP Configuration (configured in Supabase Dashboard)
SMTP_HOST=smtp.resend.com
SMTP_PORT=465
SMTP_USER=resend
SMTP_FROM=onboarding@resend.dev
# SMTP_PASS is configured in Supabase Dashboard only (not stored in code)
```

---

## Troubleshooting

### Emails not sending?
1. Check Supabase Auth Logs for errors
2. Verify sender email is allowed by provider
3. Check spam folder
4. Make sure SMTP credentials are correct

### Rate limited?
- Resend: 3,000/month (about 100/day)
- Brevo: 300/day
- Gmail: 500/day
- Consider upgrading if you need more

### Want custom domain?
1. Verify your domain with the SMTP provider
2. Add SPF, DKIM records to your DNS
3. Use your domain email as sender

---

## Production Recommendations

For production, I recommend:
1. **Resend** for simplicity and reliability
2. **Custom domain** for professional emails
3. **Monitor usage** to stay within limits
4. **Upgrade** when you exceed free tier

Need help? The Resend setup (Option 1) is the fastest and most reliable for getting started!