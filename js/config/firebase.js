/**
 * Firebase Configuration
 * Contains Firebase config, Cloud Functions URLs, and app identifiers
 */

/**
 * Firebase Configuration
 * IMPORTANT: When deploying to your own Firebase project, replace this with your config
 * Get this from: Firebase Console > Project Settings > General > Your apps > Web app
 */
export const firebaseConfig = {
    apiKey: "AIzaSyB2v8ieH-sQdcDrISnywTRZch1tGg83fxw",
    authDomain: "casting-director-1990.firebaseapp.com",
    projectId: "casting-director-1990",
    storageBucket: "casting-director-1990.firebasestorage.app",
    messagingSenderId: "302759264701",
    appId: "1:302759264701:web:50c2efdd2f84c7449f12d4",
    measurementId: "G-JZ6TNW3HX1"
};

/**
 * Cloud Functions Configuration
 * The Gemini API key is now stored securely in Firebase Cloud Functions
 * These URLs point to your deployed Cloud Functions (or local emulator for testing)
 *
 * For local development with emulator, use:
 * http://127.0.0.1:5001/casting-director-1990/us-central1/functionName
 *
 * For production, 2nd Gen Cloud Functions use Cloud Run URLs:
 * https://functionname-projecthash-uc.a.run.app
 */
export const CLOUD_FUNCTIONS =
    window.location.hostname === 'localhost'
        ? {
            getBookInfo: 'http://127.0.0.1:5001/casting-director-1990/us-central1/getBookInfo',
            getActorFee: 'http://127.0.0.1:5001/casting-director-1990/us-central1/getActorFee',
            generateMovieResults: 'http://127.0.0.1:5001/casting-director-1990/us-central1/generateMovieResults'
          }
        : {
            getBookInfo: 'https://getbookinfo-t3itujxa3a-uc.a.run.app',
            getActorFee: 'https://getactorfee-t3itujxa3a-uc.a.run.app',
            generateMovieResults: 'https://generatemovieresults-t3itujxa3a-uc.a.run.app'
          };

/**
 * App ID for Firebase artifacts path
 * Uses hard-coded value if not defined elsewhere
 */
export const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

/**
 * Initial auth token (if using custom authentication)
 * Falls back to anonymous sign-in if not defined
 */
export const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
