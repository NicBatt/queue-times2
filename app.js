// Universal Parks Wait Times Application
class ParkWaitTimesApp {
    constructor() {
        // Define the parks you want to support
        this.supportedParks = [
            { id: 334, name: "Epic Universe", shortName: "Epic" }, // Verify ID for Epic Universe
            { id: 65, name: "Universal Studios Florida", shortName: "USF" },
            { id: 66, name: "Universal Studios Hollywood", shortName: "USH" }
        ];

        this.apiConfig = {
            proxyUrl: 'https://corsproxy.io/?url=',
            // baseUrl will be constructed dynamically
        };
        
        this.currentParkId = this.supportedParks[0].id; // Default to the first park
        this.currentParkData = this.supportedParks.find(p => p.id === this.currentParkId);

        this.waitTimeData = {}; // This will store API response (lands and rides)
        this.lastUpdated = null;
        this.autoRefreshInterval = null;
        this.countdownInterval = null;
        this.autoRefreshTime = 5 * 60 * 1000; // 5 minutes

        // DOM Elements
        this.elements = {
            parkButtonsContainer: document.getElementById('parkButtonsContainer'),
            currentParkNameElement: document.getElementById('currentParkNameElement'),
            refreshBtn: document.getElementById('refresh-btn'),
            retryBtn: document.getElementById('retry-btn'),
            lastUpdatedDisplay: document.getElementById('last-updated'),
            countdownDisplay: document.getElementById('auto-refresh-countdown'),
            loadingState: document.getElementById('loading-state'),
            errorState: document.getElementById('error-state'),
            errorMessage: document.getElementById('error-message'),
            content: document.getElementById('content'),
            themedAreasContainer: document.getElementById('themed-areas')
        };

        this.init();
    }

    init() {
        this.createParkButtons();
        this.bindEventListeners();
        this.updateParkTitle();
        this.fetchWaitTimes(); // Initial fetch for the default park
        this.startAutoRefresh();
    }

    createParkButtons() {
        if (!this.elements.parkButtonsContainer) return;
        this.elements.parkButtonsContainer.innerHTML = ''; // Clear any existing

        this.supportedParks.forEach(park => {
            const button = document.createElement('button');
            button.className = 'btn btn--nav';
            button.dataset.parkId = park.id;
            button.textContent = park.shortName || park.name; // Use shortName if available
            if (park.id === this.currentParkId) {
                button.classList.add('active');
            }
            button.addEventListener('click', () => this.switchPark(park.id));
            this.elements.parkButtonsContainer.appendChild(button);
        });
    }
    
    updateParkTitle() {
        if (this.elements.currentParkNameElement && this.currentParkData) {
            this.elements.currentParkNameElement.textContent = this.currentParkData.name;
        }
    }

    switchPark(parkId) {
        if (parkId === this.currentParkId || this.isLoading) return;

        this.currentParkId = parkId;
        this.currentParkData = this.supportedParks.find(p => p.id === this.currentParkId);
        this.updateParkTitle();

        // Update active button state
        const buttons = this.elements.parkButtonsContainer.querySelectorAll('.btn--nav');
        buttons.forEach(btn => {
            btn.classList.remove('active');
            if (parseInt(btn.dataset.parkId) === parkId) {
                btn.classList.add('active');
            }
        });

        this.fetchWaitTimes(); // Fetch data for the new park
        this.startAutoRefresh(); // Restart refresh timer for context, good practice
    }


    bindEventListeners() {
        if (this.elements.refreshBtn) {
            this.elements.refreshBtn.addEventListener('click', () => this.fetchWaitTimes(true)); // Pass true for manual refresh
        }
        if (this.elements.retryBtn) {
            this.elements.retryBtn.addEventListener('click', () => this.fetchWaitTimes(true));
        }
    }

    async fetchWaitTimes(isManualRefresh = false) {
        if (this.isLoading && !isManualRefresh) return; // Prevent multiple fetches unless manual
        this.isLoading = true;
        this.showLoadingState();
        console.log(`Fetching wait times for park ID: ${this.currentParkId}...`);

        try {
            const parkApiUrl = `https://queue-times.com/en-US/parks/${this.currentParkId}/queue_times.json`;
            const proxiedUrl = this.apiConfig.proxyUrl + encodeURIComponent(parkApiUrl);
            console.log('Requesting URL:', proxiedUrl);

            const response = await fetch(proxiedUrl);
            console.log('Response status:', response.status);

            if (!response.ok) {
                let errorDetails = `HTTP error! status: ${response.status} ${response.statusText}`;
                try {
                    const errorBody = await response.text();
                    console.error('Error response body:', errorBody);
                    try {
                        const errorJson = JSON.parse(errorBody);
                        errorDetails += ` - ${errorJson.message || JSON.stringify(errorJson)}`;
                    } catch (e) { errorDetails += ` - ${errorBody.substring(0, 100)}...`; }
                } catch (e) { /* ignore */ }
                throw new Error(errorDetails);
            }

            const apiData = await response.json();
            console.log('API Data Received:', apiData);

            // Store the raw processed data directly
            this.waitTimeData = this.processAndStructureApiData(apiData);
            console.log('Processed Wait Time Data for Rendering:', this.waitTimeData);

            this.lastUpdated = new Date();
            this.updateLastUpdatedDisplay();
            this.renderWaitTimes(); // This will now use the dynamically processed data
            this.showContent();

        } catch (error) {
            console.error('Error fetching wait times:', error);
            this.showErrorState(error.message);
        } finally {
            this.isLoading = false;
        }
    }

    processAndStructureApiData(apiData) {
        const structuredData = { lands: [] };
        const processedRideIds = new Set(); // To avoid duplicates if API is inconsistent

        // 1. Process rides nested under lands from API
        if (apiData.lands && Array.isArray(apiData.lands)) {
            apiData.lands.forEach(landFromApi => {
                const currentLand = {
                    name: landFromApi.name || 'Unnamed Land',
                    rides: []
                };
                if (landFromApi.rides && Array.isArray(landFromApi.rides)) {
                    landFromApi.rides.forEach(rideFromApi => {
                        if (rideFromApi.id && !processedRideIds.has(rideFromApi.id)) {
                            currentLand.rides.push({
                                id: rideFromApi.id,
                                name: rideFromApi.name,
                                waitTime: rideFromApi.is_open ? parseInt(rideFromApi.wait_time, 10) : null,
                                isOpen: rideFromApi.is_open,
                                lastUpdated: rideFromApi.last_updated ? new Date(rideFromApi.last_updated) : new Date()
                            });
                            processedRideIds.add(rideFromApi.id);
                        } else if (!rideFromApi.id) { // Handle rides without an ID
                             currentLand.rides.push({
                                id: `no-id-${rideFromApi.name}-${Math.random()}`,
                                name: rideFromApi.name,
                                waitTime: rideFromApi.is_open ? parseInt(rideFromApi.wait_time, 10) : null,
                                isOpen: rideFromApi.is_open,
                                lastUpdated: rideFromApi.last_updated ? new Date(rideFromApi.last_updated) : new Date()
                            });
                        }
                    });
                }
                if (currentLand.rides.length > 0) { // Only add land if it has rides
                    structuredData.lands.push(currentLand);
                }
            });
        }

        // 2. Process rides from the root apiData.rides array (for parks like USH)
        let unlandedRides = [];
        if (apiData.rides && Array.isArray(apiData.rides) && apiData.rides.length > 0) {
            apiData.rides.forEach(rideFromApi => {
                if (rideFromApi.id && !processedRideIds.has(rideFromApi.id)) {
                    unlandedRides.push({
                        id: rideFromApi.id,
                        name: rideFromApi.name,
                        waitTime: rideFromApi.is_open ? parseInt(rideFromApi.wait_time, 10) : null,
                        isOpen: rideFromApi.is_open,
                        lastUpdated: rideFromApi.last_updated ? new Date(rideFromApi.last_updated) : new Date()
                    });
                    processedRideIds.add(rideFromApi.id);
                } else if (!rideFromApi.id) {
                    unlandedRides.push({
                        id: `no-id-${rideFromApi.name}-${Math.random()}`,
                        name: rideFromApi.name,
                        waitTime: rideFromApi.is_open ? parseInt(rideFromApi.wait_time, 10) : null,
                        isOpen: rideFromApi.is_open,
                        lastUpdated: rideFromApi.last_updated ? new Date(rideFromApi.last_updated) : new Date()
                    });
                }
            });
        }
        if (unlandedRides.length > 0) {
            structuredData.lands.push({ name: "Other Attractions / Events", rides: unlandedRides });
        }
        
        // Sort lands by name
        structuredData.lands.sort((a, b) => a.name.localeCompare(b.name));
        // Sort rides within each land by name
        structuredData.lands.forEach(land => {
            land.rides.sort((a, b) => a.name.localeCompare(b.name));
        });

        return structuredData;
    }


    getWaitTimeClass(waitTime, isOpen) {
        if (!isOpen) return 'closed';
        if (waitTime === null) return 'unknown'; // Open but no time
        if (waitTime <= 20) return 'low';
        if (waitTime <= 45) return 'medium';
        if (waitTime <= 75) return 'high';
        return 'very-high';
    }

    formatWaitTime(waitTime, isOpen) {
        if (!isOpen) return 'CLOSED';
        if (waitTime === null) return 'N/A';
        return `${waitTime} min`;
    }

    renderWaitTimes() {
        const container = this.elements.themedAreasContainer;
        if (!container) {
            console.error('Element with ID "themed-areas" not found for rendering.');
            return;
        }
        container.innerHTML = ''; // Clear previous content

        if (!this.waitTimeData || !this.waitTimeData.lands || this.waitTimeData.lands.length === 0) {
            container.innerHTML = '<p class="no-rides-message">No ride data available for this park currently.</p>';
            return;
        }

        this.waitTimeData.lands.forEach(landData => {
            // areaKey can be generated from landData.name for CSS class if needed
            const areaKey = landData.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
            const areaElement = this.createThemedAreaElement(areaKey, landData);
            container.appendChild(areaElement);
        });
    }
    
    // createThemedAreaElement now takes landData directly from processed API response
    createThemedAreaElement(areaKey, landData) {
        const areaDiv = document.createElement('div');
        // Use a generic class and potentially add specific one if colors are re-introduced
        areaDiv.className = `themed-area themed-area--${areaKey}`; 
                                                        
        const headerDiv = document.createElement('div');
        headerDiv.className = 'area-header';

        // Generic icon, or re-introduce colors if you have a mapping for all parks/lands
        const iconDiv = document.createElement('div');
        iconDiv.className = 'area-icon';
        // iconDiv.style.backgroundColor = '#777'; // Default color or remove

        const titleH2 = document.createElement('h2');
        titleH2.className = 'area-title';
        titleH2.textContent = landData.name;

        headerDiv.appendChild(iconDiv); // Keep icon div for structure, even if not colored yet
        headerDiv.appendChild(titleH2);

        const attractionsGrid = document.createElement('div');
        attractionsGrid.className = 'attractions-grid';

        if (landData.rides && landData.rides.length > 0) {
            landData.rides.forEach(rideData => { // Iterate over rides in this land
                const attractionCard = this.createAttractionCard(rideData);
                attractionsGrid.appendChild(attractionCard);
            });
        } else {
            const noRidesMsg = document.createElement('p');
            noRidesMsg.textContent = 'No ride information available for this area.';
            noRidesMsg.className = 'no-rides-in-area-message';
            attractionsGrid.appendChild(noRidesMsg);
        }

        areaDiv.appendChild(headerDiv);
        areaDiv.appendChild(attractionsGrid);
        return areaDiv;
    }

    // createAttractionCard now takes rideData directly from processed API response
    createAttractionCard(rideData) {
        const cardDiv = document.createElement('div');
        cardDiv.className = 'attraction-card';
        if (!rideData.isOpen) {
            cardDiv.classList.add('attraction-card--closed');
        }

        const headerDiv = document.createElement('div');
        headerDiv.className = 'attraction-header';

        const nameH3 = document.createElement('h3');
        nameH3.className = 'attraction-name';
        nameH3.textContent = rideData.name;

        const waitTimeDisplayDiv = document.createElement('div');
        waitTimeDisplayDiv.className = 'wait-time-display';

        const waitTimeSpan = document.createElement('span');
        const waitTimeClass = this.getWaitTimeClass(rideData.waitTime, rideData.isOpen);
        waitTimeSpan.className = `wait-time wait-time--${waitTimeClass}`;
        waitTimeSpan.textContent = this.formatWaitTime(rideData.waitTime, rideData.isOpen);

        const statusDiv = document.createElement('div');
        statusDiv.className = 'attraction-status';

        const statusIndicator = document.createElement('div');
        const statusClass = rideData.isOpen ? 'open' : 'closed';
        statusIndicator.className = `status-indicator status-indicator--${statusClass}`;

        const statusDot = document.createElement('span');
        statusDot.className = 'status-dot';

        const statusTextSpan = document.createElement('span'); // Renamed from statusText
        statusTextSpan.className = 'status-text';
        statusTextSpan.textContent = rideData.isOpen ? 'Open' : 'Closed';

        statusIndicator.appendChild(statusDot);
        statusIndicator.appendChild(statusTextSpan);
        statusDiv.appendChild(statusIndicator);

        if (rideData.lastUpdated && rideData.isOpen) { // Only show if open and has update time
            const lastUpdatedRideSpan = document.createElement('span');
            lastUpdatedRideSpan.className = 'ride-last-updated';
            lastUpdatedRideSpan.textContent = `Updated: ${new Date(rideData.lastUpdated).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
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
        if (this.elements.loadingState) this.elements.loadingState.classList.remove('hidden');
        if (this.elements.errorState) this.elements.errorState.classList.add('hidden');
        if (this.elements.content) this.elements.content.classList.add('hidden');
    }

    showErrorState(message) {
        if (this.elements.loadingState) this.elements.loadingState.classList.add('hidden');
        if (this.elements.errorState) this.elements.errorState.classList.remove('hidden');
        if (this.elements.content) this.elements.content.classList.add('hidden');
        if (this.elements.errorMessage) {
            this.elements.errorMessage.textContent = message || 'An unknown error occurred.';
        }
    }

    showContent() {
        if (this.elements.loadingState) this.elements.loadingState.classList.add('hidden');
        if (this.elements.errorState) this.elements.errorState.classList.add('hidden');
        if (this.elements.content) this.elements.content.classList.remove('hidden');
    }

    updateLastUpdatedDisplay() {
        if (this.elements.lastUpdatedDisplay && this.lastUpdated) {
            const timeString = this.lastUpdated.toLocaleTimeString('en-US', {
                hour: 'numeric', minute: '2-digit'
            });
            this.elements.lastUpdatedDisplay.textContent = timeString;
        }
    }

    startAutoRefresh() {
        if (this.autoRefreshInterval) clearInterval(this.autoRefreshInterval);
        if (this.countdownInterval) clearInterval(this.countdownInterval);

        this.autoRefreshInterval = setInterval(() => {
            if (!this.isLoading && document.visibilityState === 'visible') {
                 console.log(`Auto-refreshing for park ID: ${this.currentParkId}`);
                 this.fetchWaitTimes();
            }
        }, this.autoRefreshTime);
        this.startCountdown();
    }

    startCountdown() {
        let timeLeft = this.autoRefreshTime / 1000;
        const updateCountdown = () => {
            if (timeLeft <= 0) timeLeft = this.autoRefreshTime / 1000;
            const minutes = Math.floor(timeLeft / 60);
            const seconds = timeLeft % 60;
            const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            if (this.elements.countdownDisplay) this.elements.countdownDisplay.textContent = timeString;
            timeLeft--;
        };
        updateCountdown(); // Initial call
        this.countdownInterval = setInterval(updateCountdown, 1000);
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    new ParkWaitTimesApp();
});
