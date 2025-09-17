# SMTP Service Alternatives

## 1. SendGrid (Recommended for Production)
```env
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=apikey
EMAIL_PASS=your-sendgrid-api-key
```

## 2. Amazon SES
```env
EMAIL_HOST=email-smtp.us-east-1.amazonaws.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-ses-smtp-username
EMAIL_PASS=your-ses-smtp-password
```

## 3. Outlook/Hotmail
```env
EMAIL_HOST=smtp-mail.outlook.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-outlook-email@outlook.com
EMAIL_PASS=your-outlook-password
```

## 4. Mailtrap (For Testing)
```env
EMAIL_HOST=smtp.mailtrap.io
EMAIL_PORT=2525
EMAIL_SECURE=false
EMAIL_USER=your-mailtrap-username
EMAIL_PASS=your-mailtrap-password
```

## Quick Fix for Gmail
1. Go to https://myaccount.google.com/security
2. Enable 2-Step Verification
3. Go to App passwords
4. Generate password for "Mail"
5. Use the 16-digit code as EMAIL_PASS