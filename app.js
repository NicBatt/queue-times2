// Universal Parks Wait Times Application (Refactored from EpicUniverseWaitTimes)
class ParkWaitTimesApp {
    constructor() {
        this.supportedParks = [
            { id: 334, name: "Epic Universe", shortName: "Epic", themedAreasConfigKey: "epic_universe" }, // Verify ID for Epic Universe
            { id: 65, name: "Universal Studios Florida", shortName: "USF", themedAreasConfigKey: "usf" },
            { id: 66, name: "Universal Studios Hollywood", shortName: "USH", themedAreasConfigKey: "ush" }
        ];

        // Original themedAreas, now used for potential color/name overrides if API land matches
        // The 'attractions' array within these will NOT be used to filter rides.
        // We display all rides from the API.
        this.parkLandConfigs = {
            'epic_universe': { // Key matches themedAreasConfigKey
                'celestial park': { color: '#4A90E2', displayName: 'Celestial Park' }, // API land names are keys, lowercased
                'dark universe': { color: '#8B0000', displayName: 'Dark Universe' },
                'how to train your dragon — isle of berk': { color: '#228B22', displayName: 'How to Train Your Dragon — Isle of Berk' },
                'super nintendo world': { color: '#FF4500', displayName: 'SUPER NINTENDO WORLD' }, // API name for USF is all caps
                'the wizarding world of harry potter — ministry of magic': { color: '#800080', displayName: 'The Wizarding World of Harry Potter — Ministry of Magic' }
            },
            'usf': { // Universal Studios Florida - Park ID 65
                'dreamworks land': { color: '#0078D4', displayName: 'DreamWorks Land' },
                'hollywood': { color: '#FFD700', displayName: 'Hollywood' },
                'illumination\'s minion land': { color: '#FCE205', displayName: 'Illumination\'s Minion Land' },
                'new york': { color: '#C0C0C0', displayName: 'New York' },
                'production central': { color: '#E43F3F', displayName: 'Production Central' },
                'san francisco': { color: '#50A6C2', displayName: 'San Francisco' },
                'the wizarding world of harry potter - diagon alley': { color: '#4D2B7F', displayName: 'The Wizarding World of Harry Potter - Diagon Alley' },
                'world expo': { color: '#00A86B', displayName: 'World Expo' }
            },
            'ush': { // Universal Studios Hollywood - Park ID 66
                'jurassic world': { color: '#006400', displayName: 'Jurassic World' },
                'lower lot': { color: '#808080', displayName: 'Lower Lot' }, // Generic color
                'minion land': { color: '#FCE205', displayName: 'Minion Land' }, // Different from USF's Minion Land name
                'production plaza': { color: '#D2691E', displayName: 'Production Plaza' },
                'springfield, u.s.a.': { color: '#FFD700', displayName: 'Springfield, U.S.A.' }, // Note the dots
                'super nintendo world': { color: '#FF4500', displayName: 'SUPER NINTENDO WORLD' }, // Same as Epic if API name matches
                'the wizarding world of harry potter': { color: '#4D2B7F', displayName: 'The Wizarding World of Harry Potter' }, // Different from USF/Epic
                'transformers metrobase': { color: '#4682B4', displayName: 'TRANSFORMERS Metrobase' },
                'upper lot': { color: '#A9A9A9', displayName: 'Upper Lot' } // Generic color
            }
            // Add more configs if needed
        };

        this.currentParkId = this.supportedParks[0].id;
        this.currentParkMeta = this.supportedParks.find(p => p.id === this.currentParkId);

        this.apiConfig = {
            proxyUrl: 'https://corsproxy.io/?url=',
            // baseUrl will be constructed dynamically in fetchWaitTimes
        };
        
        this.waitTimeData = { lands: [] }; // Will store API structure: { lands: [{name, rides:[]}] }
        this.lastUpdated = null;
        this.autoRefreshInterval = null;
        this.countdownInterval = null;
        this.autoRefreshTime = 5 * 60 * 1000; // 5 minutes
        this.isLoading = false;

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
            themedAreasContainer: document.getElementById('themed-areas') // This is where lands will be rendered
        };
        
        this.init();
    }
    
    init() {
        this.createParkButtons();
        this.bindCoreEventListeners(); // Renamed from bindEventListeners
        this.updateParkTitle();
        this.fetchWaitTimes(); 
        this.startAutoRefresh();
    }

    createParkButtons() {
        if (!this.elements.parkButtonsContainer) return;
        this.elements.parkButtonsContainer.innerHTML = ''; 

        this.supportedParks.forEach(park => {
            const button = document.createElement('button');
            // Use a generic 'btn' and your specific 'btn--nav' if you added it to style.css
            button.className = 'btn btn--nav'; 
            button.dataset.parkId = park.id;
            button.textContent = park.shortName || park.name;
            if (park.id === this.currentParkId) {
                button.classList.add('active');
            }
            // Important: Clone button or remove old listeners if this function can be called multiple times
            // For now, assuming it's called once at init. If park list could change, this needs care.
            button.addEventListener('click', () => this.switchPark(park.id));
            this.elements.parkButtonsContainer.appendChild(button);
        });
    }

    updateParkTitle() {
        if (this.elements.currentParkNameElement && this.currentParkMeta) {
            this.elements.currentParkNameElement.textContent = this.currentParkMeta.name;
        }
    }

    switchPark(parkId) {
        if (parkId === this.currentParkId || this.isLoading) return;
        console.log(`Switching to park ID: ${parkId}`);

        this.currentParkId = parkId;
        this.currentParkMeta = this.supportedParks.find(p => p.id === this.currentParkId);
        this.updateParkTitle();

        const buttons = this.elements.parkButtonsContainer.querySelectorAll('.btn--nav');
        buttons.forEach(btn => {
            btn.classList.remove('active');
            if (parseInt(btn.dataset.parkId) === parkId) {
                btn.classList.add('active');
            }
        });

        this.fetchWaitTimes(true); // Force fetch for new park
        this.startAutoRefresh(); 
    }
    
    bindCoreEventListeners() { // Renamed to avoid confusion with button listeners if re-created
        if (this.elements.refreshBtn) {
            this.elements.refreshBtn.addEventListener('click', () => this.fetchWaitTimes(true));
        }
        if (this.elements.retryBtn) {
            this.elements.retryBtn.addEventListener('click', () => this.fetchWaitTimes(true));
        }
    }
    
    async fetchWaitTimes(isManualRefresh = false) {
        if (this.isLoading && !isManualRefresh) return;
        this.isLoading = true;
        this.showLoadingState();
        console.log(`Fetching wait times for park ID: ${this.currentParkId}`);
        
        try {
            // Construct baseUrl dynamically
            const parkApiUrl = `https://queue-times.com/en-US/parks/${this.currentParkId}/queue_times.json`;
            const proxiedUrl = this.apiConfig.proxyUrl + encodeURIComponent(parkApiUrl);
            console.log('Requesting URL:', proxiedUrl);
            
            const response = await fetch(proxiedUrl);
            console.log('Response status:', response.status);
            
            if (!response.ok) {
                let errorDetails = `HTTP error! status: ${response.status} ${response.statusText}`; // Added statusText
                try {
                    const errorBody = await response.text(); // Read as text first
                    console.error('Error response body:', errorBody);
                    try {
                        const errorJson = JSON.parse(errorBody); // Try to parse as JSON
                        errorDetails += ` - ${errorJson.message || JSON.stringify(errorJson)}`;
                    } catch (e) {
                        errorDetails += ` - ${errorBody.substring(0, 100)}...`; // Add snippet if not JSON
                    }
                } catch (e) { /* ignore if error response body can't be read */ }
                throw new Error(errorDetails);
            }
            
            const apiData = await response.json(); // API returns JSON
            console.log('API Data Received:', apiData);
            
            this.waitTimeData = this.structureApiDataForDisplay(apiData); // New processing method
            console.log('Structured Data for Rendering:', this.waitTimeData);
            
            this.lastUpdated = new Date();
            this.updateLastUpdatedDisplay();
            this.renderWaitTimes(); // Render based on the new dynamic structure
            this.showContent();
            
        } catch (error) {
            console.error('Error fetching wait times:', error);
            this.showErrorState(error.message);
        } finally {
            this.isLoading = false; // Ensure isLoading is reset
            // showLoadingState hides content and error, showContent or showErrorState reveals one.
            // We don't need hideLoadingState here if showContent/showErrorState is always called.
        }
    }
    
    // Renamed and repurposed from processRealApiData
    // This method now takes raw API data and structures it for rendering.
    // It doesn't rely on this.themedAreas for ride lists, only for potential color overrides.
    structureApiDataForDisplay(apiData) {
        const displayData = { lands: [] };
        const processedRideIds = new Set();
        const currentParkLandConfig = this.parkLandConfigs[this.currentParkMeta.themedAreasConfigKey] || {};

        // 1. Process rides nested under lands from API
        if (apiData.lands && Array.isArray(apiData.lands)) {
            apiData.lands.forEach(landFromApi => {
                const landConfig = currentParkLandConfig[landFromApi.name.trim().toLowerCase()] || {};
                const currentLand = {
                    name: landConfig.displayName || landFromApi.name || 'Unnamed Land',
                    color: landConfig.color, // Get color from our config if available
                    rides: []
                };

                if (landFromApi.rides && Array.isArray(landFromApi.rides)) {
                    landFromApi.rides.forEach(rideFromApi => {
                        if (rideFromApi.id && !processedRideIds.has(rideFromApi.id)) {
                            currentLand.rides.push({
                                id: rideFromApi.id,
                                name: rideFromApi.name,
                                waitTime: rideFromApi.is_open ? parseInt(rideFromApi.wait_time, 10) : null,
                                isOpen: rideFromApi.is_open === true, // Be explicit
                                lastUpdated: rideFromApi.last_updated ? new Date(rideFromApi.last_updated) : new Date()
                            });
                            processedRideIds.add(rideFromApi.id);
                        } else if (!rideFromApi.id) { // Handle rides without an ID
                             currentLand.rides.push({
                                id: `no-id-${rideFromApi.name.replace(/\s/g, '')}-${Math.random().toString(36).substr(2, 5)}`,
                                name: rideFromApi.name,
                                waitTime: rideFromApi.is_open ? parseInt(rideFromApi.wait_time, 10) : null,
                                isOpen: rideFromApi.is_open === true,
                                lastUpdated: rideFromApi.last_updated ? new Date(rideFromApi.last_updated) : new Date()
                            });
                        }
                    });
                }
                if (currentLand.rides.length > 0) {
                    displayData.lands.push(currentLand);
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
                        isOpen: rideFromApi.is_open === true,
                        lastUpdated: rideFromApi.last_updated ? new Date(rideFromApi.last_updated) : new Date()
                    });
                    processedRideIds.add(rideFromApi.id);
                } else if (!rideFromApi.id) {
                    unlandedRides.push({
                         id: `no-id-${rideFromApi.name.replace(/\s/g, '')}-${Math.random().toString(36).substr(2, 5)}`,
                        name: rideFromApi.name,
                        waitTime: rideFromApi.is_open ? parseInt(rideFromApi.wait_time, 10) : null,
                        isOpen: rideFromApi.is_open === true,
                        lastUpdated: rideFromApi.last_updated ? new Date(rideFromApi.last_updated) : new Date()
                    });
                }
            });
        }
        if (unlandedRides.length > 0) {
             const unlandedConfig = currentParkLandConfig['other attractions / events'] || {};
            displayData.lands.push({ 
                name: unlandedConfig.displayName || "Other Attractions / Events", 
                color: unlandedConfig.color,
                rides: unlandedRides 
            });
        }
        
        // Sort lands by name, then rides within each land by name
        displayData.lands.sort((a, b) => a.name.localeCompare(b.name));
        displayData.lands.forEach(land => {
            land.rides.sort((a, b) => a.name.localeCompare(b.name));
        });

        return displayData;
    }
    
    getWaitTimeClass(waitTime, isOpen) { // isOpen is now a boolean
        if (!isOpen) return 'closed';
        if (waitTime === null) return 'unknown'; // For N/A when open
        if (waitTime <= 20) return 'low';
        if (waitTime <= 45) return 'medium';
        if (waitTime <= 75) return 'high';
        return 'very-high';
    }
    
    formatWaitTime(waitTime, isOpen) { // isOpen is now a boolean
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
        container.innerHTML = '';
        
        if (!this.waitTimeData || !this.waitTimeData.lands || this.waitTimeData.lands.length === 0) {
            container.innerHTML = '<p class="no-rides-message" style="text-align:center; padding: 20px; color: var(--color-text-secondary);">No ride data available for this park at the moment.</p>';
            return;
        }

        this.waitTimeData.lands.forEach(landData => {
            // Use landData.name to generate a key for CSS classes
            const areaKey = landData.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
            const areaElement = this.createThemedAreaElement(areaKey, landData);
            container.appendChild(areaElement);
        });
    }
    
    createThemedAreaElement(areaKey, landData) {
        const areaDiv = document.createElement('div');
        areaDiv.className = `themed-area themed-area--${areaKey}`;
        // Apply border color if defined in parkLandConfigs
        if (landData.color) {
            areaDiv.style.borderColor = landData.color;
        } else {
            areaDiv.style.borderColor = 'rgba(255, 255, 255, 0.2)'; // Default border
        }
        
        const headerDiv = document.createElement('div');
        headerDiv.className = 'area-header';
        
        const iconDiv = document.createElement('div');
        iconDiv.className = 'area-icon';
        if (landData.color) {
            iconDiv.style.backgroundColor = landData.color; // Use configured color for icon
        } else {
             iconDiv.style.backgroundColor = 'var(--color-text-secondary)'; // Default icon color
        }
        
        const titleH2 = document.createElement('h2');
        titleH2.className = 'area-title';
        titleH2.textContent = landData.name; // Already contains display name
        
        headerDiv.appendChild(iconDiv);
        headerDiv.appendChild(titleH2);
        
        const attractionsGrid = document.createElement('div');
        attractionsGrid.className = 'attractions-grid';
        
        if (landData.rides && landData.rides.length > 0) {
            landData.rides.forEach(rideData => {
                const attractionCard = this.createAttractionCard(rideData);
                attractionsGrid.appendChild(attractionCard);
            });
        } else {
            const noRidesMsg = document.createElement('p');
            noRidesMsg.textContent = 'No specific ride data in this area currently.';
            noRidesMsg.className = 'no-rides-in-area-message'; // Add style for this
            attractionsGrid.appendChild(noRidesMsg);
        }
        
        areaDiv.appendChild(headerDiv);
        areaDiv.appendChild(attractionsGrid);
        return areaDiv;
    }
    
    createAttractionCard(rideData) {
        const cardDiv = document.createElement('div');
        cardDiv.className = 'attraction-card';
         if (!rideData.isOpen) { // Add class if closed
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
        // Use isOpen directly for status class
        const statusClass = rideData.isOpen ? 'open' : 'closed'; 
        if (rideData.isOpen && rideData.waitTime === null) statusIndicator.classList.add('status-indicator--unknown');
        statusIndicator.className = `status-indicator status-indicator--${statusClass}`;
        
        const statusDot = document.createElement('span');
        statusDot.className = 'status-dot';
        
        const statusText = document.createElement('span');
        statusText.className = 'status-text'; // Added for consistency
        statusText.textContent = rideData.isOpen ? 'Open' : 'Closed';
        if (rideData.isOpen && rideData.waitTime === null) statusText.textContent = 'N/A';


        statusIndicator.appendChild(statusDot);
        statusIndicator.appendChild(statusText);
        statusDiv.appendChild(statusIndicator);
        
        // Display last_updated from API for each ride
        if (rideData.lastUpdated) { // Show if available
            const lastUpdatedRideSpan = document.createElement('span');
            lastUpdatedRideSpan.className = 'ride-last-updated'; // Add CSS for this
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
        if(this.elements.loadingState) this.elements.loadingState.classList.remove('hidden');
        if(this.elements.errorState) this.elements.errorState.classList.add('hidden');
        if(this.elements.content) this.elements.content.classList.add('hidden');
    }
    
    showErrorState(message) {
        if(this.elements.loadingState) this.elements.loadingState.classList.add('hidden');
        if(this.elements.errorState) this.elements.errorState.classList.remove('hidden');
        if(this.elements.content) this.elements.content.classList.add('hidden');
        if(this.elements.errorMessage) {
            this.elements.errorMessage.textContent = message || 'An unknown error occurred. Please try again.';
        }
    }
    
    showContent() {
        if(this.elements.loadingState) this.elements.loadingState.classList.add('hidden');
        if(this.elements.errorState) this.elements.errorState.classList.add('hidden');
        if(this.elements.content) this.elements.content.classList.remove('hidden');
    }
    
    updateLastUpdatedDisplay() {
        if (this.elements.lastUpdatedDisplay && this.lastUpdated) {
            const timeString = this.lastUpdated.toLocaleTimeString('en-US', {
                hour: 'numeric', // '2-digit'
                minute: '2-digit'
                // Omitting seconds for brevity, as in original request's app.js
            });
            this.elements.lastUpdatedDisplay.textContent = timeString;
        }
    }
    
    startAutoRefresh() {
        if (this.autoRefreshInterval) clearInterval(this.autoRefreshInterval);
        if (this.countdownInterval) clearInterval(this.countdownInterval);
        
        this.autoRefreshInterval = setInterval(() => {
            if (!this.isLoading && document.visibilityState === 'visible') { // Only refresh if visible
                console.log(`Auto-refreshing wait times for park ID: ${this.currentParkId}`);
                this.fetchWaitTimes();
            }
        }, this.autoRefreshTime);
        this.startCountdown();
    }
    
    startCountdown() {
        let timeLeft = this.autoRefreshTime / 1000;
        const updateCountdown = () => {
            if (timeLeft <= 0) {
                timeLeft = this.autoRefreshTime / 1000; // Reset
            }
            const minutes = Math.floor(timeLeft / 60);
            const seconds = timeLeft % 60;
            const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            if (this.elements.countdownDisplay) {
                this.elements.countdownDisplay.textContent = timeString;
            }
            timeLeft--;
        };
        updateCountdown(); // Call immediately
        this.countdownInterval = setInterval(updateCountdown, 1000);
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    new ParkWaitTimesApp(); // Changed class name
});
