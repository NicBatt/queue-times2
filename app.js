// Epic Universe Wait Times Application
class EpicUniverseWaitTimes {
    constructor() {
        this.apiConfig = {
            parkId: 334, // IMPORTANT: Verify this ID for Epic Universe on queue-times.com
            proxyUrl: 'https://corsproxy.io/?url=',
            // Corrected: Added .json to the end of the baseUrl
            baseUrl: `https://queue-times.com/en-US/parks/334/queue_times.json`
        };

        this.themedAreas = {
            'celestial_park': {
                name: 'Celestial Park',
                color: '#4A90E2',
                // IMPORTANT: Ensure these names match the API's ride names exactly
                attractions: ['Constellation Carousel', 'Stardust Racers']
            },
            'dark_universe': {
                name: 'Dark Universe',
                color: '#8B0000',
                attractions: ['Curse of the Werewolf', 'Monsters Unchained: The Frankenstein Experiment']
            },
            'how_to_train_dragon': {
                name: 'How to Train Your Dragon - Isle of Berk',
                color: '#228B22',
                attractions: ['Dragon Racer\'s Rally', 'Fyre Drill', 'Hiccup\'s Wing Gliders', 'Meet Toothless and Friends'] // Example: "Meet Toothless and Friends" might be a show/experience, check API for wait times
            },
            'super_nintendo_world': {
                name: 'Super Nintendo World',
                color: '#FF4500',
                attractions: ['Bowser Jr. Challenge', 'Mario Kart: Bowser\'s Challenge', 'Mine-Cart Madness', 'Yoshi\'s Adventure']
            },
            'wizarding_world': {
                name: 'The Wizarding World of Harry Potter - Ministry of Magic',
                color: '#800080',
                attractions: ['Harry Potter and the Battle at the Ministry']
            }
        };

        this.waitTimeData = {}; // This will store processed data for your attractions
        this.lastUpdated = null;
        this.autoRefreshInterval = null;
        this.countdownInterval = null;
        this.autoRefreshTime = 5 * 60 * 1000; // 5 minutes

        this.init();
    }

    init() {
        this.bindEventListeners();
        this.fetchWaitTimes(); // Initial fetch
        this.startAutoRefresh(); // Start auto-refresh after the first fetch attempt
    }

    bindEventListeners() {
        const refreshBtn = document.getElementById('refresh-btn');
        const retryBtn = document.getElementById('retry-btn');

        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.fetchWaitTimes());
        }

        if (retryBtn) {
            retryBtn.addEventListener('click', () => this.fetchWaitTimes());
        }
    }

    async fetchWaitTimes() {
        this.showLoadingState();
        console.log('Fetching wait times...');

        try {
            const fullApiUrl = this.apiConfig.baseUrl; // Uses the park-specific .json URL
            const proxiedUrl = this.apiConfig.proxyUrl + encodeURIComponent(fullApiUrl);
            console.log('Requesting URL:', proxiedUrl);

            const response = await fetch(proxiedUrl);
            console.log('Response status:', response.status);

            if (!response.ok) {
                let errorDetails = `HTTP error! status: ${response.status}`;
                try {
                    // Try to get more info from the response body if it's JSON or text
                    const errorBody = await response.text(); // Read as text first
                    console.error('Error response body:', errorBody);
                    try {
                        const errorJson = JSON.parse(errorBody);
                        errorDetails += ` - ${JSON.stringify(errorJson)}`;
                    } catch (e) {
                        errorDetails += ` - ${errorBody.substring(0, 100)}...`; // Add snippet if not JSON
                    }
                } catch (e) { /* ignore if error response body can't be read */ }
                throw new Error(errorDetails);
            }

            const apiData = await response.json(); // Directly parse the JSON response
            console.log('API Data Received:', apiData);

            this.waitTimeData = this.processRealApiData(apiData); // Process the real data
            console.log('Processed Wait Time Data:', this.waitTimeData);

            this.lastUpdated = new Date();
            this.updateLastUpdatedDisplay();
            this.renderWaitTimes();
            this.showContent();

        } catch (error) {
            console.error('Error fetching wait times:', error);
            this.showErrorState(error.message);
        }
    }

    processRealApiData(apiData) {
        const processedData = {};
        let allRidesFromApi = [];

        // The API response might have a 'lands' array, each with a 'rides' array,
        // OR just a 'rides' array at the top level.
        if (apiData.lands && Array.isArray(apiData.lands)) {
            apiData.lands.forEach(land => {
                if (land.rides && Array.isArray(land.rides)) {
                    allRidesFromApi = allRidesFromApi.concat(land.rides);
                }
            });
        } else if (apiData.rides && Array.isArray(apiData.rides)) { // Fallback for flat ride structure
            allRidesFromApi = apiData.rides;
        } else {
            console.warn("API data does not contain 'lands' or 'rides' array:", apiData);
        }

        // Get all attraction names defined in this.themedAreas
        const appAttractionNames = Object.values(this.themedAreas).flatMap(area => area.attractions);

        appAttractionNames.forEach(appAttractionName => {
            // Find the corresponding ride in the API data by name
            // API names can be tricky, ensure exact match or use a more fuzzy match if needed
            const apiRideData = allRidesFromApi.find(
                ride => ride.name.trim().toLowerCase() === appAttractionName.trim().toLowerCase()
            );

            if (apiRideData) {
                processedData[appAttractionName] = {
                    name: apiRideData.name, // Use the name from API for consistency if slightly different
                    waitTime: apiRideData.is_open ? parseInt(apiRideData.wait_time, 10) : null,
                    status: apiRideData.is_open ? 'Open' : 'Closed',
                    isOpen: apiRideData.is_open,
                    lastUpdated: new Date() // Or use a timestamp from API if available and preferred
                };
            } else {
                // Attraction defined in your app but not found in API response for this park
                processedData[appAttractionName] = {
                    name: appAttractionName,
                    waitTime: null,
                    status: 'Not Found',
                    isOpen: false,
                    lastUpdated: new Date()
                };
            }
        });
        return processedData;
    }

    getWaitTimeClass(waitTime) {
        if (waitTime === null || typeof waitTime === 'undefined') return 'unknown'; // For 'Not Found' or truly null
        if (waitTime === 0 && status !== 'Open') return 'closed'; // If waitTime is 0 but ride is 'Open', treat as low.
        if (waitTime <= 20) return 'low';
        if (waitTime <= 45) return 'medium';
        if (waitTime <= 75) return 'high';
        return 'very-high';
    }

    formatWaitTime(waitTime, status) {
        if (status === 'Closed' || status === 'Not Found' || waitTime === null) {
            return status.toUpperCase();
        }
        return `${waitTime} min`;
    }

    renderWaitTimes() {
        const themedAreasContainer = document.getElementById('themed-areas');
        if (!themedAreasContainer) {
            console.error('Element with ID "themed-areas" not found for rendering.');
            return;
        }
        themedAreasContainer.innerHTML = ''; // Clear previous content

        Object.entries(this.themedAreas).forEach(([areaKey, areaData]) => {
            const areaElement = this.createThemedAreaElement(areaKey, areaData);
            themedAreasContainer.appendChild(areaElement);
        });
    }

    createThemedAreaElement(areaKey, areaData) {
        const areaDiv = document.createElement('div');
        areaDiv.className = `themed-area themed-area--${areaKey.replace(/_/g, '-')}`; // Ensure all _ are replaced

        const headerDiv = document.createElement('div');
        headerDiv.className = 'area-header';

        const iconDiv = document.createElement('div');
        iconDiv.className = 'area-icon';
        iconDiv.style.backgroundColor = areaData.color;

        const titleH2 = document.createElement('h2');
        titleH2.className = 'area-title';
        titleH2.textContent = areaData.name;

        headerDiv.appendChild(iconDiv);
        headerDiv.appendChild(titleH2);

        const attractionsGrid = document.createElement('div');
        attractionsGrid.className = 'attractions-grid';

        areaData.attractions.forEach(attractionName => {
            const attractionData = this.waitTimeData[attractionName];
            // Only create a card if data exists (even if it's 'Not Found' status)
            if (attractionData) {
                const attractionCard = this.createAttractionCard(attractionData);
                attractionsGrid.appendChild(attractionCard);
            } else {
                // This case should be less common if processRealApiData populates all defined attractions
                console.warn(`No data found in this.waitTimeData for attraction: ${attractionName}`);
            }
        });

        areaDiv.appendChild(headerDiv);
        areaDiv.appendChild(attractionsGrid);
        return areaDiv;
    }

    createAttractionCard(attractionData) {
        const cardDiv = document.createElement('div');
        cardDiv.className = 'attraction-card';

        const headerDiv = document.createElement('div');
        headerDiv.className = 'attraction-header';

        const nameH3 = document.createElement('h3');
        nameH3.className = 'attraction-name';
        nameH3.textContent = attractionData.name;

        const waitTimeDisplayDiv = document.createElement('div');
        waitTimeDisplayDiv.className = 'wait-time-display';

        const waitTimeSpan = document.createElement('span');
        // Pass status to getWaitTimeClass if it affects styling of '0' wait time
        const waitTimeClass = this.getWaitTimeClass(attractionData.waitTime, attractionData.status);
        waitTimeSpan.className = `wait-time wait-time--${waitTimeClass}`;
        waitTimeSpan.textContent = this.formatWaitTime(attractionData.waitTime, attractionData.status);

        const statusDiv = document.createElement('div');
        statusDiv.className = 'attraction-status';

        const statusIndicator = document.createElement('div');
        // Use a more generic class or specific for 'not-found'
        const statusClass = attractionData.isOpen ? 'open' : (attractionData.status === 'Not Found' ? 'not-found' : 'closed');
        statusIndicator.className = `status-indicator status-indicator--${statusClass}`;

        const statusDot = document.createElement('span');
        statusDot.className = 'status-dot';

        const statusText = document.createElement('span');
        statusText.className = 'status-text'; // Added class for easier styling
        statusText.textContent = attractionData.status;

        statusIndicator.appendChild(statusDot);
        statusIndicator.appendChild(statusText);
        statusDiv.appendChild(statusIndicator);

        waitTimeDisplayDiv.appendChild(waitTimeSpan);
        waitTimeDisplayDiv.appendChild(statusDiv);

        headerDiv.appendChild(nameH3);
        headerDiv.appendChild(waitTimeDisplayDiv);

        cardDiv.appendChild(headerDiv);
        return cardDiv;
    }

    showLoadingState() {
        const loadingEl = document.getElementById('loading-state');
        const errorEl = document.getElementById('error-state');
        const contentEl = document.getElementById('content');
        if (loadingEl) loadingEl.classList.remove('hidden');
        if (errorEl) errorEl.classList.add('hidden');
        if (contentEl) contentEl.classList.add('hidden');
    }

    showErrorState(message) {
        const loadingEl = document.getElementById('loading-state');
        const errorEl = document.getElementById('error-state');
        const contentEl = document.getElementById('content');
        if (loadingEl) loadingEl.classList.add('hidden');
        if (errorEl) errorEl.classList.remove('hidden');
        if (contentEl) contentEl.classList.add('hidden');

        const errorMessageEl = document.getElementById('error-message');
        if (errorMessageEl) {
            errorMessageEl.textContent = message || 'An unknown error occurred. Please try again.';
        }
    }

    showContent() {
        const loadingEl = document.getElementById('loading-state');
        const errorEl = document.getElementById('error-state');
        const contentEl = document.getElementById('content');
        if (loadingEl) loadingEl.classList.add('hidden');
        if (errorEl) errorEl.classList.add('hidden');
        if (contentEl) contentEl.classList.remove('hidden');
    }

    updateLastUpdatedDisplay() {
        const lastUpdatedElement = document.getElementById('last-updated');
        if (lastUpdatedElement && this.lastUpdated) {
            const timeString = this.lastUpdated.toLocaleTimeString('en-US', {
                hour: 'numeric', // '2-digit'
                minute: '2-digit',
                // second: '2-digit' // Optional: if you want seconds
            });
            lastUpdatedElement.textContent = timeString;
        }
    }

    startAutoRefresh() {
        if (this.autoRefreshInterval) clearInterval(this.autoRefreshInterval);
        if (this.countdownInterval) clearInterval(this.countdownInterval);

        this.autoRefreshInterval = setInterval(() => {
            console.log('Auto-refreshing wait times...');
            this.fetchWaitTimes();
        }, this.autoRefreshTime);

        this.startCountdown();
    }

    startCountdown() {
        let timeLeft = this.autoRefreshTime / 1000;
        const countdownElement = document.getElementById('auto-refresh-countdown');

        const updateCountdown = () => {
            if (timeLeft <= 0) {
                timeLeft = this.autoRefreshTime / 1000; // Reset for next cycle
            }
            const minutes = Math.floor(timeLeft / 60);
            const seconds = timeLeft % 60;
            const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;

            if (countdownElement) {
                countdownElement.textContent = timeString;
            }
            timeLeft--;
        };
        
        updateCountdown(); // Call once immediately to display initial countdown
        this.countdownInterval = setInterval(updateCountdown, 1000);
    }
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new EpicUniverseWaitTimes();
});
