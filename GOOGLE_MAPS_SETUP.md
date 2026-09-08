# Google Maps API Setup Guide

## 📍 Get Detailed Address with Building Names & Company Names

Follow these steps to enable detailed address information in your attendance app.

---

## Step 1: Get Google Maps API Key

### 1.1 Go to Google Cloud Console
- Visit: https://console.cloud.google.com/
- Sign in with your Google account

### 1.2 Create a New Project (if needed)
- Click "Select a project" → "New Project"
- Enter project name: "Attendance App"
- Click "Create"

### 1.3 Enable APIs
- Go to "APIs & Services" → "Library"
- Search and enable these APIs:
  - **Geocoding API** (Required)
  - **Maps SDK for Android** (Optional, for map display)
  - **Maps SDK for iOS** (Optional, for map display)

### 1.4 Create API Key
- Go to "APIs & Services" → "Credentials"
- Click "Create Credentials" → "API Key"
- Copy the API key (looks like: `AIzaSyD...`)

### 1.5 Restrict API Key (Important for Security)
- Click on your API key to edit
- Under "Application restrictions":
  - Select "Android apps" or "iOS apps"
  - Add your package name
- Under "API restrictions":
  - Select "Restrict key"
  - Check "Geocoding API"
- Click "Save"

---

## Step 2: Add API Key to Your App

### 2.1 Open the Service File
Open: `d:\React Native\myApp\services\googleMapsService.js`

### 2.2 Replace API Key
Find this line (at the top):
```javascript
const GOOGLE_MAPS_API_KEY = 'YOUR_API_KEY_HERE';
```

Replace with your actual API key:
```javascript
const GOOGLE_MAPS_API_KEY = 'AIzaSyD...your-actual-key...';
```

### 2.3 Save the File
Save and close the file.

---

## Step 3: Test the Feature

### 3.1 Restart the App
```bash
# Stop the current server (Ctrl+C)
# Restart
npx expo start
```

### 3.2 Test Punch In/Out
1. Open employee app
2. Punch in (allow location permission)
3. Check console logs for:
   ```
   ✅ Google Maps Address: Building Name, Street, City...
   ```

### 3.3 Verify in Admin Panel
1. Go to Admin → Daily Attendance
2. Select the new record
3. Check Location Information
4. You should see detailed address like:
   ```
   📍 Tech Park Building, MG Road, Shivaji Nagar, Pune, Maharashtra, 411001
   ```

---

## Step 4: Pricing & Limits

### Free Tier (Google Maps Platform)
- **$200 free credit** per month
- **40,000 free requests** per month for Geocoding API
- More than enough for small to medium businesses

### Cost After Free Tier
- $5 per 1,000 requests (after free tier)
- For 100 employees × 2 punches/day × 30 days = 6,000 requests/month
- **Still within free tier!**

### Monitor Usage
- Go to Google Cloud Console
- "APIs & Services" → "Dashboard"
- Check "Geocoding API" usage

---

## Troubleshooting

### Issue: "REQUEST_DENIED" Error
**Solution**: Enable Geocoding API in Google Cloud Console

### Issue: "OVER_QUERY_LIMIT" Error
**Solution**: You've exceeded free tier. Check billing or reduce requests.

### Issue: Address Still Shows Coordinates
**Solutions**:
1. Check if API key is correct
2. Check console logs for error messages
3. Verify Geocoding API is enabled
4. Check API key restrictions (not too strict)

### Issue: "Invalid API Key" Error
**Solutions**:
1. Verify API key is copied correctly (no extra spaces)
2. Check if API key restrictions allow your app
3. Wait 5 minutes after creating key (propagation time)

---

## Fallback Behavior

The app has **automatic fallback**:

1. **First**: Tries Google Maps API (detailed address)
2. **Second**: Falls back to Expo Location (basic address)
3. **Third**: Shows coordinates if both fail

This ensures the app **always works**, even if:
- API key is missing
- API quota exceeded
- Network issues

---

## Security Best Practices

### ✅ DO:
- Restrict API key to your app package name
- Restrict API key to only Geocoding API
- Monitor usage regularly
- Keep API key private (don't commit to public repos)

### ❌ DON'T:
- Share API key publicly
- Use unrestricted API keys
- Commit API key to GitHub
- Use same key for multiple apps

---

## Example Addresses You'll Get

### Before (Expo Location):
```
1st floor, Sangli - Miraj Road, Pune Division, Sangli
```

### After (Google Maps API):
```
Rajhans Apartment, 1st Floor, Sangli - Miraj Road, Vishrambag, Sangli, Maharashtra, 416415
```

### With Company:
```
Tech Solutions Pvt Ltd, 3rd Floor, Cerebrum IT Park, Kalyani Nagar, Pune, Maharashtra, 411014
```

---

## Need Help?

If you face any issues:
1. Check console logs in Expo
2. Verify API key is correct
3. Check Google Cloud Console for errors
4. Test with a simple location first

---

**That's it! Your app will now show detailed addresses with building names and company information!** 🎉
