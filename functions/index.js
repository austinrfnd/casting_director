/**
 * Firebase Cloud Functions for Casting Director
 *
 * These functions act as a secure proxy between the frontend and the Gemini API.
 * The Gemini API key is stored securely in Firebase and never exposed to the client.
 *
 * This file serves as the main entry point and exports all Cloud Functions.
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin
admin.initializeApp();

// Import Cloud Functions from refactored modules
const { getBookInfo } = require('./src/functions/getBookInfo');
const { getActorFee } = require('./src/functions/getActorFee');
const { generateMovieResults } = require('./src/functions/generateMovieResults');

// Export Cloud Functions
exports.getBookInfo = getBookInfo;
exports.getActorFee = getActorFee;
exports.generateMovieResults = generateMovieResults;
