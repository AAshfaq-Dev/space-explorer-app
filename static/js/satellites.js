/**
 * satellites.js
 * Contains all logic for tracking the International Space Station (ISS).
 * This code was moved from satellites.html to separate concerns.
 */

// Utility object to centralize DOM selectors
const ISS_DOM = {
    loading: document.getElementById('loading'),
    info: document.getElementById('iss-info'),
};

/**
 * Initiates the API request to track the ISS position.
 * The function is verbose, using intermediate variables and explicit DOM manipulation.
 */
function trackISS() {
    // 1. Show loading indicator and placeholder text
    ISS_DOM.loading.style.display = 'block';
    ISS_DOM.info.innerHTML = '<p>Loading...</p>';

    // 2. Make API request to the backend endpoint
    const apiEndpoint = '/api/iss-position';

    fetch(apiEndpoint)
        .then(response => {
            // Check for non-200 status codes
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            // 3. Hide loading indicator
            ISS_DOM.loading.style.display = 'none';

            // 4. Display the results
            displayISSData(data);
        })
        .catch(error => {
            // 5. Handle errors explicitly
            ISS_DOM.loading.style.display = 'none';
            // Use CSS class for error styling
            ISS_DOM.info.innerHTML =
                '<p class="error-text">Error: Could not fetch ISS data. Check console for details.</p>';
            console.error('Fetch Error:', error);
        });
}

/**
 * Formats and displays the ISS position data.
 * @param {Object} data - The JSON data received from the /api/iss-position endpoint.
 */
function displayISSData(data) {
    if (data.status === 'success') {
        // Use intermediate variables for explicit calculation/formatting
        const rawTimestamp = data.timestamp;
        const timestamp = new Date(rawTimestamp * 1000).toLocaleString();

        const latitude = parseFloat(data.latitude).toFixed(4);
        const longitude = parseFloat(data.longitude).toFixed(4);
        const altitude = parseFloat(data.altitude_km).toFixed(2);

        const satelliteName = data.satellite_name;

        // Create a nicely formatted display using the dedicated CSS class
        ISS_DOM.info.innerHTML = `
            <div class="iss-data-display">
                <h4>${satelliteName} Current Position</h4>
                <p><strong>Latitude:</strong> ${latitude}°</p>
                <p><strong>Longitude:</strong> ${longitude}°</p>
                <p><strong>Altitude:</strong> ${altitude} km</p>
                <p><strong>Last Updated:</strong> ${timestamp}</p>
            </div>
        `;
    } else {
        // Display error message using the dedicated CSS class
        const errorMessage = data.message || 'Unknown error occurred while processing ISS data.';
        ISS_DOM.info.innerHTML = `
            <p class="error-text">Error: ${errorMessage}</p>
        `;
    }
}