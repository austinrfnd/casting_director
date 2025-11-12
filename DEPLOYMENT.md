# Deployment Guide: Casting Director with Secure Cloud Functions

## Overview
Your Gemini API key is now secured using Firebase Cloud Functions! The key is stored on Google's servers and never exposed to clients.

## What Changed

### Before (Insecure ❌)
```
Browser → Gemini API (with exposed API key)
```

### After (Secure ✅)
```
Browser → Cloud Functions → Gemini API (key hidden on server)
```

## Prerequisites

1. **Firebase Blaze Plan** (pay-as-you-go)
   - Required for Cloud Functions
   - Free tier: 2M invocations/month
   - Check current plan: `firebase projects:list`
   - Upgrade if needed: Firebase Console → Upgrade Project

2. **Gemini API Key**
   - Get your key at: https://aistudio.google.com/app/apikey
   - Keep it handy for the next step

## Deployment Steps

### Step 1: Set Your Gemini API Key as a Secret

Run this command and paste your API key when prompted:

```bash
firebase functions:secrets:set GEMINI_API_KEY
```

This stores your key securely in Google Secret Manager. It will never appear in your code or logs.

### Step 2: Deploy Cloud Functions

Deploy your three secure backend functions:

```bash
firebase deploy --only functions
```

This deploys:
- `getBookInfo` - Book analysis
- `getActorFee` - Actor fee estimation
- `generateMovieResults` - Movie results generation

**Expected output:**
```
✔ functions[getBookInfo] Successful create operation.
✔ functions[getActorFee] Successful create operation.
✔ functions[generateMovieResults] Successful create operation.
```

Copy the function URLs from the output (you'll verify them in Step 4).

### Step 3: Deploy Hosting

Deploy your frontend files:

```bash
firebase deploy --only hosting
```

Your app will be live at: `https://casting-director-1990.web.app`

### Step 4: Verify Deployment

1. **Check Function URLs** match the pattern in [app.js](app.js:178-179):
   ```
   https://us-central1-casting-director-1990.cloudfunctions.net/getBookInfo
   https://us-central1-casting-director-1990.cloudfunctions.net/getActorFee
   https://us-central1-casting-director-1990.cloudfunctions.net/generateMovieResults
   ```

2. **Test Your App:**
   - Visit your live site
   - Try creating a movie
   - All API calls should work seamlessly

3. **Check Logs** (if issues occur):
   ```bash
   firebase functions:log
   ```

## Local Development & Testing

### Option 1: Test with Local Emulator (Recommended)

1. **Start the Firebase emulator:**
   ```bash
   firebase emulators:start
   ```

2. **Access your app at:** `http://localhost:5000`

3. The app automatically detects localhost and uses emulator URLs

**Note:** Emulator mode requires your Gemini API key to be set as an environment variable:
```bash
export GEMINI_API_KEY="your-key-here"
firebase emulators:start
```

### Option 2: Test with Deployed Functions

Just open [index.html](index.html) locally - it will call your deployed Cloud Functions.

## Cost Breakdown

### Firebase (Pay-as-you-go)
- **Cloud Functions:**
  - Free: 2M invocations/month
  - After: $0.40 per million invocations
  - Your app uses 3 functions max per movie creation

- **Hosting:**
  - Free: 10GB storage, 360MB/day transfer
  - More than enough for this app

### Gemini API (Separate)
- Check pricing: https://ai.google.dev/pricing
- gemini-2.5-flash-preview is typically free or very low cost

**Example cost for 1,000 movies created:**
- Cloud Functions: FREE (within 2M limit)
- Hosting: FREE
- Gemini API: ~$0-1 (varies by model)

## Troubleshooting

### "API key not found" Error
```bash
# Re-set your API key
firebase functions:secrets:set GEMINI_API_KEY

# Redeploy functions
firebase deploy --only functions
```

### "CORS Error" in Browser
- Ensure you're accessing the site via the hosting URL, not opening index.html directly
- Cloud Functions have CORS enabled for all origins

### "Function not found" Error
- Check that function names in [app.js](app.js:181-185) match deployed function names
- Verify region is correct (us-central1)

### Functions Taking Too Long
- First invocation (cold start) can take 5-10 seconds
- Subsequent calls are fast (~1-2 seconds)

## File Structure

```
casting_director/
├── index.html              # Frontend HTML
├── app.js                  # Frontend JS (calls Cloud Functions)
├── firebase.json           # Firebase configuration
├── .firebaserc             # Project settings
├── functions/
│   ├── index.js           # Cloud Functions code
│   ├── package.json       # Dependencies
│   └── .gitignore         # Ignore node_modules
└── DEPLOYMENT.md          # This file
```

## Security Benefits

✅ **API Key Hidden:** Never visible in browser source code
✅ **Rate Limiting:** Can add limits in Cloud Functions
✅ **Usage Monitoring:** Track API usage in Firebase Console
✅ **Authentication:** Can restrict to authenticated users only
✅ **Request Validation:** Functions validate inputs before calling API

## Next Steps After Deployment

1. **Monitor Usage:**
   - Firebase Console → Functions → Usage
   - Check for errors and invocation counts

2. **Set Up Budget Alerts:**
   - Google Cloud Console → Billing → Budgets
   - Get notified if costs exceed threshold

3. **Add Rate Limiting (Optional):**
   - Prevent abuse by limiting requests per user
   - Example: Max 10 movies per hour per user

4. **Custom Domain (Optional):**
   - Firebase Console → Hosting → Add Custom Domain
   - Point your domain to Firebase

## Need Help?

- Firebase Docs: https://firebase.google.com/docs/functions
- Gemini API Docs: https://ai.google.dev/docs
- Your Project: https://console.firebase.google.com/project/casting-director-1990

---

**Ready to deploy?** Run these three commands:

```bash
firebase functions:secrets:set GEMINI_API_KEY
firebase deploy --only functions
firebase deploy --only hosting
```

Your app will be live and secure! 🎬🔒
