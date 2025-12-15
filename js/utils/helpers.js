/**
 * Helper Utilities
 * General-purpose helper functions
 */

import { getFullVersionInfo } from '../../version.js';

/**
 * Display app version in bottom right corner
 */
export function displayVersion() {
    const versionElement = document.getElementById('app-version');
    if (versionElement) {
        try {
            const versionInfo = getFullVersionInfo();
            versionElement.textContent = versionInfo;
        } catch (error) {
            versionElement.textContent = 'v1.0.0';
            console.warn('Version file not found. Run "npm run version" to generate it.');
        }
    }
}
