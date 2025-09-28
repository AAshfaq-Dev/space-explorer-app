/**
 * dashboard.js - Manages right panel widgets and dashboard-specific functionality
 * This file handles: time display, ISS tracking, planet information, and future orbit visualization
 */

// --- Global Dashboard State ---
let dashboardInterval = null;
let currentPlanetData = null;

/**
 * Initializes all dashboard widgets when the page loads
 * This function sets up the time display and prepares other widgets
 */
function initializeDashboard() {
    console.log('Initializing Space Explorer Dashboard...');

    // Start the real-time clock
    startTimeDisplay();

    // Initialize planet data
    initializePlanetData();

    console.log('Dashboard initialization complete!');
}

// --- Time Widget Functions ---

/**
 * Starts the real-time clock display in the time widget
 * Updates every second to show current time and date
 */
function startTimeDisplay() {
    // Update immediately when page loads
    updateTimeDisplay();

    // Update every second (1000 milliseconds)
    dashboardInterval = setInterval(updateTimeDisplay, 1000);
}

/**
 * Updates the time and date display elements
 * Formats time in 12-hour format with AM/PM
 * Formats date in readable format
 */
function updateTimeDisplay() {
    const currentDateTime = new Date();

    // Format time (12-hour format with AM/PM)
    const timeOptions = {
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    };
    const formattedTime = currentDateTime.toLocaleTimeString('en-US', timeOptions);

    // Format date (readable format)
    const dateOptions = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    };
    const formattedDate = currentDateTime.toLocaleDateString('en-US', dateOptions);

    // Update the DOM elements
    const timeElement = document.getElementById('current-time');
    const dateElement = document.getElementById('current-date');

    if (timeElement) {
        timeElement.textContent = formattedTime;
    }

    if (dateElement) {
        dateElement.textContent = formattedDate;
    }
}

// --- Enhanced ISS Tracking Functions ---

/**
 * Enhanced ISS tracking function that provides more detailed information
 * This replaces the simple tracking from the old satellites page
 */
function trackISS() {
    console.log('Tracking ISS position...');

    // Get DOM elements for ISS widget
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
        buttonElement.textContent = 'Tracking...';
    }

    // Make API request to your Flask backend
    fetch('/api/iss-position')
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
            // Reset UI elements
            if (loadingElement) {
                loadingElement.style.display = 'none';
            }
            if (buttonElement) {
                buttonElement.disabled = false;
                buttonElement.textContent = 'Track ISS';
            }
        });
}

/**
 * Displays enhanced ISS information in the widget
 * Shows position, altitude, speed, and additional context
 */
function displayEnhancedISSData(data) {
    const infoElement = document.getElementById('iss-info');

    if (!infoElement) {
        console.error('ISS info element not found');
        return;
    }

    if (data.status === 'success') {
        // Calculate additional information
        const latitude = parseFloat(data.latitude).toFixed(4);
        const longitude = parseFloat(data.longitude).toFixed(4);
        const altitude = parseFloat(data.altitude_km).toFixed(2);
        const timestamp = new Date(data.timestamp * 1000).toLocaleString();

        // Determine ISS location context (day/night side of Earth)
        const isOverPacific = longitude > -180 && longitude < -60;
        const isOverAmericas = longitude >= -130 && longitude <= -30;
        const isOverAtlantic = longitude > -30 && longitude < 30;
        const isOverEurope = longitude >= 0 && longitude <= 60;
        const isOverAsia = longitude > 60 && longitude <= 180;

        let locationContext = 'Unknown region';
        if (isOverPacific) locationContext = 'Pacific Ocean region';
        if (isOverAmericas) locationContext = 'Americas region';
        if (isOverAtlantic) locationContext = 'Atlantic Ocean region';
        if (isOverEurope) locationContext = 'Europe/Africa region';
        if (isOverAsia) locationContext = 'Asia/Pacific region';

        // Create enhanced display
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
 * Displays error message when ISS tracking fails
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

// --- Planet Information Functions ---

/**
 * Initializes planet data for the planet widget
 * This creates a simple database of planet information
 */
function initializePlanetData() {
    currentPlanetData = {
        mars: {
            name: 'Mars',
            distance: '225 million km from Sun',
            facts: 'Red planet with polar ice caps and largest volcano in solar system',
            moons: '2 moons (Phobos & Deimos)',
            day: '24.6 hours'
        },
        jupiter: {
            name: 'Jupiter',
            distance: '778 million km from Sun',
            facts: 'Largest planet with Great Red Spot storm larger than Earth',
            moons: '95+ known moons including Io, Europa, Ganymede, Callisto',
            day: '9.9 hours'
        },
        saturn: {
            name: 'Saturn',
            distance: '1.4 billion km from Sun',
            facts: 'Famous for its ring system made of ice and rock particles',
            moons: '146+ known moons including Titan with thick atmosphere',
            day: '10.7 hours'
        }
    };

    console.log('Planet data initialized');
}

/**
 * Shows information about a selected planet
 * This function displays planet facts in the planet widget
 */
function showPlanetInfo(planetName) {
    console.log(`Showing info for planet: ${planetName}`);

    const displayElement = document.getElementById('planet-display');

    if (!displayElement) {
        console.error('Planet display element not found');
        return;
    }

    const planetData = currentPlanetData[planetName];

    if (planetData) {
        displayElement.innerHTML = `
            <div style="text-align: left;">
                <h4 style="color: #4CAF50; margin-bottom: 8px;">${planetData.name}</h4>
                <p><strong>Distance:</strong> ${planetData.distance}</p>
                <p><strong>Day Length:</strong> ${planetData.day}</p>
                <p><strong>Moons:</strong> ${planetData.moons}</p>
                <p style="margin-top: 8px; font-size: 12px;">${planetData.facts}</p>
            </div>
        `;
    } else {
        displayElement.innerHTML = `
            <p style="color: #fc8181;">Planet data not found</p>
        `;
    }
}

// --- Dashboard Cleanup Functions ---

/**
 * Cleans up dashboard resources when page is unloaded
 * Stops the time interval to prevent memory leaks
 */
function cleanupDashboard() {
    if (dashboardInterval) {
        clearInterval(dashboardInterval);
        dashboardInterval = null;
        console.log('Dashboard cleanup complete');
    }
}

// --- Event Listeners ---

/**
 * Initialize dashboard when page loads
 */
window.addEventListener('load', initializeDashboard);

/**
 * Cleanup dashboard when page unloads
 */
window.addEventListener('beforeunload', cleanupDashboard);