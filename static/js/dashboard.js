// ============================================
// DASHBOARD.JS - Space Information Widgets
// ============================================
// Manages right panel widgets:
// - Real-time clock display
// - ISS position tracker
// - Future: Planet info, orbit visualization
// ============================================

/* ============================================
   TABLE OF CONTENTS
   ============================================
   1. Configuration Constants
   2. Global State
   3. Initialization
   4. Time Widget Functions
   5. ISS Tracker Functions
   6. Cleanup Functions
   7. Event Listeners
   ============================================ */


// ============================================
// 1. CONFIGURATION CONSTANTS
// Widget settings and API endpoints
// ============================================

const DASHBOARD_CONFIG = {
    // Time widget update frequency
    timeUpdateInterval: 1000,  // 1 second (in milliseconds)

    // Time display formats
    timeFormat: {
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    },

    dateFormat: {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    },

    // API endpoints
    api: {
        issPosition: '/api/iss-position'
    },

    // ISS position display settings
    iss: {
        coordinatePrecision: 4,    // Decimal places for lat/lon
        altitudePrecision: 2       // Decimal places for altitude
    }
};


// ============================================
// 2. GLOBAL STATE
// Dashboard-wide state variables
// ============================================

// Interval ID for time updates (used for cleanup)
let dashboardInterval = null;


// ============================================
// 3. INITIALIZATION
// Setup dashboard when page loads
// ============================================

/**
 * Initializes all dashboard widgets
 * Called automatically when page loads
 */
function initializeDashboard() {
    console.log('Initializing Space Explorer Dashboard...');

    // Start the real-time clock
    startTimeDisplay();

    console.log('Dashboard initialization complete!');
}


// ============================================
// 4. TIME WIDGET FUNCTIONS
// Real-time clock display in top widget
// ============================================

/**
 * Starts the real-time clock display
 * Updates every second to show current time and date
 */
function startTimeDisplay() {
    // Update immediately on page load
    updateTimeDisplay();

    // Then update every second
    dashboardInterval = setInterval(
        updateTimeDisplay,
        DASHBOARD_CONFIG.timeUpdateInterval
    );
}

/**
 * Updates time and date display elements
 * Formats time in 12-hour format with AM/PM
 * Formats date in readable long format
 */
function updateTimeDisplay() {
    const currentDateTime = new Date();

    // Format time (e.g., "10:30:45 PM")
    const formattedTime = currentDateTime.toLocaleTimeString(
        'en-US',
        DASHBOARD_CONFIG.timeFormat
    );

    // Format date (e.g., "Monday, September 29, 2025")
    const formattedDate = currentDateTime.toLocaleDateString(
        'en-US',
        DASHBOARD_CONFIG.dateFormat
    );

    // Update DOM elements
    const timeElement = document.getElementById('current-time');
    const dateElement = document.getElementById('current-date');

    if (timeElement) {
        timeElement.textContent = formattedTime;
    }

    if (dateElement) {
        dateElement.textContent = formattedDate;
    }
}


// ============================================
// 5. ISS TRACKER FUNCTIONS
// Fetch and display ISS position data
// ============================================

/**
 * Fetches current ISS position from backend API
 * Triggered by "Track ISS" button click
 */
function trackISS() {
    console.log('Tracking ISS position...');

    // Get DOM elements
    const loadingElement = document.getElementById('iss-loading');
    const infoElement = document.getElementById('iss-info');
    const buttonElement = document.getElementById('track-iss-button');

    // Show loading state
    if (loadingElement) {
        loadingElement.style.display = 'block';
    }
    if (infoElement) {
        infoElement.innerHTML = '<p>Fetching ISS data...</p>';
    }
    if (buttonElement) {
        buttonElement.disabled = true;
        const loadingText = buttonElement.dataset.loadingText || 'Tracking...';
        buttonElement.textContent = loadingText;
    }

    // Make API request to Flask backend
    fetch(DASHBOARD_CONFIG.api.issPosition)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('ISS data received:', data);
            displayEnhancedISSData(data);
        })
        .catch(error => {
            console.error('ISS tracking error:', error);
            displayISSError(error.message);
        })
        .finally(() => {
            // Reset UI elements (runs whether success or error)
            if (loadingElement) {
                loadingElement.style.display = 'none';
            }
            if (buttonElement) {
                buttonElement.disabled = false;
                const defaultText = buttonElement.dataset.defaultText || 'Track ISS';
                buttonElement.textContent = defaultText;
            }
        });
}

/**
 * Displays ISS position information in the widget
 * Shows coordinates, altitude, region, and update time
 * 
 * @param {Object} data - ISS position data from API
 */
function displayEnhancedISSData(data) {
    const infoElement = document.getElementById('iss-info');

    if (!infoElement) {
        console.error('ISS info element not found');
        return;
    }

    if (data.status === 'success') {
        // Parse and format coordinates
        const latitude = parseFloat(data.latitude).toFixed(
            DASHBOARD_CONFIG.iss.coordinatePrecision
        );
        const longitude = parseFloat(data.longitude).toFixed(
            DASHBOARD_CONFIG.iss.coordinatePrecision
        );
        const altitude = parseFloat(data.altitude_km).toFixed(
            DASHBOARD_CONFIG.iss.altitudePrecision
        );

        // Format timestamp
        const timestamp = new Date(data.timestamp * 1000).toLocaleString();

        // Determine geographic region based on longitude
        const locationContext = determineISSRegion(parseFloat(data.longitude));

        // Create enhanced display HTML
        infoElement.innerHTML = `
            <div style="text-align: left;">
                <p><strong>Current Position:</strong></p>
                <p>Lat: ${latitude}°, Lon: ${longitude}°</p>
                <p><strong>Altitude:</strong> ${altitude} km above Earth</p>
                <p><strong>Region:</strong> ${locationContext}</p>
                <p><strong>Updated:</strong> ${timestamp}</p>
                <p style="margin-top: 10px; font-size: 12px; color: #a0aec0;">
                    The ISS orbits Earth every ~90 minutes at 27,600 km/h
                </p>
            </div>
        `;
    } else {
        displayISSError(data.message || 'Unknown error occurred');
    }
}

/**
 * Determines geographic region based on ISS longitude
 * Simple region classification for user context
 * 
 * @param {number} longitude - ISS longitude coordinate
 * @returns {string} Geographic region name
 */
function determineISSRegion(longitude) {
    // Region boundaries (simplified)
    if (longitude > -180 && longitude < -60) return 'Pacific Ocean region';
    if (longitude >= -130 && longitude <= -30) return 'Americas region';
    if (longitude > -30 && longitude < 30) return 'Atlantic Ocean region';
    if (longitude >= 0 && longitude <= 60) return 'Europe/Africa region';
    if (longitude > 60 && longitude <= 180) return 'Asia/Pacific region';

    return 'Unknown region';
}

/**
 * Displays error message when ISS tracking fails
 * 
 * @param {string} errorMessage - Error description
 */
function displayISSError(errorMessage) {
    const infoElement = document.getElementById('iss-info');

    if (infoElement) {
        infoElement.innerHTML = `
            <p style="color: #fc8181;">Error: ${errorMessage}</p>
            <p style="font-size: 12px; color: #a0aec0; margin-top: 5px;">
                Try again in a moment
            </p>
        `;
    }
}


// ============================================
// 6. CLEANUP FUNCTIONS
// Stop intervals when page unloads
// ============================================

/**
 * Cleans up dashboard resources
 * Stops time interval to prevent memory leaks
 * Called automatically before page unload
 */
function cleanupDashboard() {
    if (dashboardInterval) {
        clearInterval(dashboardInterval);
        dashboardInterval = null;
        console.log('Dashboard cleanup complete');
    }
}


// ============================================
// 7. EVENT LISTENERS
// Automatic initialization and cleanup
// ============================================

/**
 * Initialize dashboard when page loads
 */
window.addEventListener('load', initializeDashboard);

/**
 * Cleanup dashboard when page unloads
 */
window.addEventListener('beforeunload', cleanupDashboard);