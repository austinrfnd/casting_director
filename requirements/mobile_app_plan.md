# iOS App Conversion Plan: Casting Director

## Recommended Approach: Capacitor Hybrid App

### Why Capacitor?
After analyzing the app, Capacitor is the clear winner because:
- **95% code reuse** - your existing web app works as-is
- **1-2 weeks to App Store** vs 4-8 weeks for native rewrite
- **Perfect fit** - your app is content/form-based with no heavy native needs
- **Firebase/Gemini compatible** - zero API changes required
- **Bonus**: Same approach works for Android later

---

## Implementation Plan (10 days)

### Phase 1: Setup (Days 1-2)
- [ ] Install Capacitor CLI and dependencies
- [ ] Initialize Capacitor project in your existing repo
- [ ] Add iOS platform with `npx cap add ios`
- [ ] Configure app metadata (bundle ID, name, version)
- [ ] Generate app icons and splash screens

**Commands:**
```bash
npm install @capacitor/core @capacitor/cli
npx cap init
npx cap add ios
```

---

### Phase 2: Integration (Days 3-5)
- [ ] Open iOS project in Xcode and test in simulator
- [ ] Install Capacitor plugins as needed (`@capacitor/preferences`, etc.)
- [ ] Handle iOS-specific behaviors (status bar, safe areas, notches)
- [ ] Test Firebase Authentication and Firestore
- [ ] Verify Cloud Functions calls work properly
- [ ] Fix any iOS Safari/WebView compatibility issues

**Key Plugins to Consider:**
```bash
npm install @capacitor/preferences
npm install @capacitor/splash-screen
npm install @capacitor/status-bar
npm install @capacitor/keyboard
```

**Testing:**
```bash
npx cap open ios
```

---

### Phase 3: Polish (Days 6-8)
- [ ] Adjust CSS for iOS-specific styling (safe areas, keyboard behavior)
- [ ] Improve loading states and error handling
- [ ] Test on physical iOS devices (multiple screen sizes)
- [ ] Performance optimization
- [ ] Accessibility review

**iOS Safe Area CSS Example:**
```css
.app-container {
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
}
```

---

### Phase 4: App Store Deployment (Days 9-10)
- [ ] Create Apple Developer account ($99/year if not already enrolled)
- [ ] Create App Store listing with description, screenshots, keywords
- [ ] Record preview videos showcasing gameplay
- [ ] Submit for App Store review
- [ ] Address any feedback from Apple review team

**Requirements:**
- Apple Developer Program membership ($99/year)
- App Store Connect account
- High-quality app icon (1024x1024)
- Screenshots for all required device sizes
- Privacy policy URL
- App description and keywords

---

## Cost Estimate

| Item | Cost | Notes |
|------|------|-------|
| Development Time | 1-2 weeks | Internal development effort |
| Apple Developer Program | $99/year | Required for App Store |
| Maintenance | Minimal | Test iOS updates, update Capacitor annually |

---

## Alternative: Quick Test (3 days)

If you want to test iOS market interest first:

1. **Convert to PWA (Progressive Web App)**
   - Add `manifest.json` and service worker
   - Users can "Add to Home Screen" from Safari
   - Zero App Store submission needed
   - Can upgrade to Capacitor later if successful

**PWA Checklist:**
- [ ] Create `manifest.json` with app metadata
- [ ] Add service worker for offline support
- [ ] Add "Add to Home Screen" prompt
- [ ] Test installation flow on iOS Safari

---

## Why NOT Native Swift or React Native?

### Native Swift
- ❌ Complete rewrite (4-8 weeks)
- ❌ No code reuse from web app
- ❌ iOS-only (need separate Android app)
- ❌ Different Firebase SDK setup
- ✅ Best performance (though not needed for this app)

### React Native
- ❌ Significant refactoring (3-6 weeks)
- ❌ Different component library
- ❌ Firebase integration changes
- ❌ Additional learning curve
- ✅ Good for apps with complex native interactions

### Capacitor (Chosen)
- ✅ Minimal changes to existing code
- ✅ Works with current Firebase setup
- ✅ Quick time to market
- ✅ Easy to add Android later
- ✅ Leverages existing web development skills

---

## Technical Architecture

```
┌─────────────────────────────────────┐
│        iOS Native Shell             │
│  (Xcode Project + Capacitor Core)   │
├─────────────────────────────────────┤
│         WKWebView Container         │
│  ┌───────────────────────────────┐  │
│  │    Your Web App               │  │
│  │  (HTML/CSS/JavaScript)        │  │
│  │                               │  │
│  │  - Firebase Auth & Firestore  │  │
│  │  - Cloud Functions calls      │  │
│  │  - Gemini AI integration      │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

---

## Prerequisites

Before starting Phase 1, ensure:
- [ ] Web app is fully functional and tested
- [ ] All Firebase services working correctly
- [ ] Responsive design works on mobile viewports
- [ ] Git repository is clean and backed up
- [ ] Node.js and npm are installed
- [ ] Xcode is installed (macOS required)

---

## Resources

- [Capacitor Documentation](https://capacitorjs.com/docs)
- [iOS Safe Area Guide](https://capacitorjs.com/docs/ios/troubleshooting#safe-areas)
- [App Store Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Firebase + Capacitor Integration](https://capacitorjs.com/docs/guides/firebase)

---

## Next Steps

**Ready to start?** Begin with Phase 1:
```bash
cd /Users/austin.fonacier/Projects/casting_director
npm install @capacitor/core @capacitor/cli
npx cap init "Casting Director" com.castingdirector.app
npx cap add ios
```

---

*Last Updated: 2025-11-12*
