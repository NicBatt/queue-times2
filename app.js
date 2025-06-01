// Epic Universe Wait Times Application
class EpicUniverseWaitTimes {
    constructor() {
        this.apiConfig = {
            parkId: 334, // IMPORTANT: Verify this ID for Epic Universe on queue-times.com
            proxyUrl: 'https://corsproxy.io/?url=',
            baseUrl: `https://queue-times.com/en-US/parks/334/queue_times.json`
        };

        // Corrected this.themedAreas to match API response names exactly
        this.themedAreas = {
            'celestial_park': {
                name: 'Celestial Park',
                color: '#4A90E2',
                attractions: ['Constellation Carousel', 'Stardust Racers']
            },
            'dark_universe': {
                name: 'Dark Universe',
                color: '#8B0000',
                attractions: ['Curse of the Werewolf', 'Monsters Unchained: The Frankenstein Experiment']
            },
            'how_to_train_dragon': {
                name: 'How to Train Your Dragon — Isle of Berk', // Matched API's em dash
                color: '#228B22',
                attractions: [
                    'Dragon Racer\'s Rally',
                    'Fyre Drill',
                    'Hiccup Wing Glider', // Corrected from "Hiccup's Wing Gliders"
                    'Meet Toothless and Friends'
                ]
            },
            'super_nintendo_world': {
                name: 'SUPER NINTENDO WORLD', // Matched API casing
                color: '#FF4500',
                attractions: [
                    'Bowser Jr. Challenge',
                    'Mario Kart™: Bowser\'s Challenge', // Added ™
                    'Mine-Cart Madness™',              // Added ™
                    'Yoshi\'s Adventure™'               // Added ™
                ]
            },
            'wizarding_world': {
                name: 'The Wizarding World of Harry Potter — Ministry of Magic', // Matched API's em dash
                color: '#800080',
                attractions: [
                    'Harry Potter and the Battle at the Ministry™' // Added ™
                ]
            }
        };

        this.waitTimeData = {};
        this.lastUpdated = null;
        this.autoRefreshInterval = null;
        this.countdownInterval = null;
        this.autoRefreshTime = 5 * 60 * 1000; // 5 minutes

        this.init();
    }

    init() {
        this.bindEventListeners();
        this.fetchWaitTimes();
        this.startAutoRefresh();
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
            const fullApiUrl = this.apiConfig.baseUrl;
            const proxiedUrl = this.apiConfig.proxyUrl + encodeURIComponent(fullApiUrl);
            console.log('Requesting URL:', proxiedUrl);

            const response = await fetch(proxiedUrl);
            console.log('Response status:', response.status);

            if (!response.ok) {
                let errorDetails = `HTTP error! status: ${response.status}`;
                try {
                    const errorBody = await response.text();
                    console.error('Error response body:', errorBody);
                    try {
                        const errorJson = JSON.parse(errorBody);
                        errorDetails += ` - ${JSON.stringify(errorJson)}`;
                    } catch (e) {
                        errorDetails += ` - ${errorBody.substring(0, 100)}...`;
                    }
                } catch (e) { /* ignore */ }
                throw new Error(errorDetails);
            }

            const apiData = await response.json();
            console.log('API Data Received:', apiData);

            this.waitTimeData = this.processRealApiData(apiData);
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

        if (apiData.lands && Array.isArray(apiData.lands)) {
            apiData.lands.forEach(land => {
                if (land.rides && Array.isArray(land.rides)) {
                    allRidesFromApi = allRidesFromApi.concat(land.rides);
                }
            });
        } else if (apiData.rides && Array.isArray(apiData.rides)) {
            allRidesFromApi = apiData.rides;
        } else {
            console.warn("API data does not contain 'lands' or 'rides' array:", apiData);
        }

        const appAttractionNames = Object.values(this.themedAreas).flatMap(area => area.attractions);

        appAttractionNames.forEach(appAttractionName => {
            const apiRideData = allRidesFromApi.find(
                ride => ride.name.trim().toLowerCase() === appAttractionName.trim().toLowerCase()
            );

            if (apiRideData) {
                processedData[appAttractionName] = {
                    name: apiRideData.name,
                    waitTime: apiRideData.is_open ? parseInt(apiRideData.wait_time, 10) : null,
                    status: apiRideData.is_open ? 'Open' : 'Closed',
                    isOpen: apiRideData.is_open,
                    lastUpdated: new Date(apiRideData.last_updated) // Use last_updated from API
                };
            } else {
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

    getWaitTimeClass(waitTime, status) { // Added status parameter for context
        if (status === 'Not Found' || status === 'Closed' || waitTime === null || typeof waitTime === 'undefined') {
             // Distinguish closed from simply 0 wait time if needed
            if (status === 'Closed' || status === 'Not Found') return 'closed'; // Or 'not-found'
            return 'unknown';
        }
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
        themedAreasContainer.innerHTML = '';

        Object.entries(this.themedAreas).forEach(([areaKey, areaData]) => {
            const areaElement = this.createThemedAreaElement(areaKey, areaData);
            themedAreasContainer.appendChild(areaElement);
        });
    }

    createThemedAreaElement(areaKey, areaData) {
        const areaDiv = document.createElement('div');
        areaDiv.className = `themed-area themed-area--${areaKey.replace(/_/g, '-')}`;

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
            if (attractionData) {
                const attractionCard = this.createAttractionCard(attractionData);
                attractionsGrid.appendChild(attractionCard);
            } else {
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
        const waitTimeClass = this.getWaitTimeClass(attractionData.waitTime, attractionData.status);
        waitTimeSpan.className = `wait-time wait-time--${waitTimeClass}`;
        waitTimeSpan.textContent = this.formatWaitTime(attractionData.waitTime, attractionData.status);

        const statusDiv = document.createElement('div');
        statusDiv.className = 'attraction-status';

        const statusIndicator = document.createElement('div');
        const statusClass = attractionData.isOpen ? 'open' : (attractionData.status === 'Not Found' ? 'not-found' : 'closed');
        statusIndicator.className = `status-indicator status-indicator--${statusClass}`;

        const statusDot = document.createElement('span');
        statusDot.className = 'status-dot';

        const statusText = document.createElement('span');
        statusText.className = 'status-text';
        statusText.textContent = attractionData.status;

        // Display last_updated from API for each ride
        const lastUpdatedRideSpan = document.createElement('span');
        lastUpdatedRideSpan.className = 'ride-last-updated';
        if (attractionData.lastUpdated && attractionData.status !== 'Not Found') {
            lastUpdatedRideSpan.textContent = `Updated: ${new Date(attractionData.lastUpdated).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
        }


        statusIndicator.appendChild(statusDot);
        statusIndicator.appendChild(statusText);
        statusDiv.appendChild(statusIndicator);
        // Add the ride-specific last updated time
        if (attractionData.status !== 'Not Found') { // Only show if ride data was found
             statusDiv.appendChild(lastUpdatedRideSpan);
        }


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
                hour: 'numeric',
                minute: '2-digit',
            });
            lastUpdatedElement.textContent = timeString; // This is the overall fetch time
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
                timeLeft = this.autoRefreshTime / 1000;
            }
            const minutes = Math.floor(timeLeft / 60);
            const seconds = timeLeft % 60;
            const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;

            if (countdownElement) {
                countdownElement.textContent = timeString;
            }
            timeLeft--;
        };
        
        updateCountdown();
        this.countdownInterval = setInterval(updateCountdown, 1000);
    }
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new EpicUniverseWaitTimes();
});
