// Universal Parks Wait Times Application (Refactored from EpicUniverseWaitTimes)
class ParkWaitTimesApp { // Renamed class
    constructor() {
        // Updated to the three specified parks
        this.supportedParks = [
            { id: 64, name: "Islands of Adventure", shortName: "Islands", themedAreasConfigKey: "Islands" },
            { id: 65, name: "Universal Studios Florida", shortName: "Sudios", themedAreasConfigKey: "Sudios" },
            { id: 334, name: "Epic Universe", shortName: "Epic", themedAreasConfigKey: "epic_universe" } // Verify ID
        ];

        // parkLandConfigs: Used for potential color/name overrides if API land matches.
        // Keys should be lowercase API land names for matching.
        this.parkLandConfigs = {
            'epic_universe': { // Park ID 334
                'celestial park': { color: '#4A90E2', displayName: 'Celestial Park' },
                'dark universe': { color: '#8B0000', displayName: 'Dark Universe' },
                'how to train your dragon — isle of berk': { color: '#228B22', displayName: 'How to Train Your Dragon — Isle of Berk' },
                'super nintendo world': { color: '#FF4500', displayName: 'SUPER NINTENDO WORLD' },
                'the wizarding world of harry potter — ministry of magic': { color: '#800080', displayName: 'The Wizarding World of Harry Potter — Ministry of Magic' }
            },
            'Sudios': { // Park ID 65 (Universal Studios Florida)
                'dreamworks land': { color: '#0078D4', displayName: 'DreamWorks Land' },
                'hollywood': { color: '#FFD700', displayName: 'Hollywood' },
                'illumination\'s minion land': { color: '#FCE205', displayName: 'Illumination\'s Minion Land' },
                'new york': { color: '#C0C0C0', displayName: 'New York' },
                'production central': { color: '#E43F3F', displayName: 'Production Central' },
                'san francisco': { color: '#50A6C2', displayName: 'San Francisco' },
                'the wizarding world of harry potter - diagon alley': { color: '#4D2B7F', displayName: 'The Wizarding World of Harry Potter - Diagon Alley' }, // Note hyphen vs em-dash
                'world expo': { color: '#00A86B', displayName: 'World Expo' }
            },
            'Islands': { // Park ID 64 (Islands of Adventure) - Add land configs based on its JSON
                'jurassic park': { color: '#2E8B57', displayName: 'Jurassic Park' },
                'marvel super hero island': { color: '#B22222', displayName: 'Marvel Super Hero Island' },
                'seuss landing': { color: '#FF69B4', displayName: 'Seuss Landing' },
                'the wizarding world of harry potter - hogsmeade': { color: '#3A2A78', displayName: 'The Wizarding World of Harry Potter - Hogsmeade' }, // Note hyphen
                'toon lagoon': { color: '#1E90FF', displayName: 'Toon Lagoon' },
                // 'lost continent': { color: '#DAA520', displayName: 'The Lost Continent' } // Example if it were there
            }
        };

        this.currentParkId = this.supportedParks[0].id; // Default to Islands of Adventure (ID 64)
        this.currentParkMeta = this.supportedParks.find(p => p.id === this.currentParkId);

        this.apiConfig = {
            proxyUrl: 'https://corsproxy.io/?url=',
        };
        
        this.waitTimeData = { lands: [] };
        this.lastUpdated = null;
        this.autoRefreshInterval = null;
        this.countdownInterval = null;
        this.autoRefreshTime = 5 * 60 * 1000;
        this.isLoading = false;

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
    
    // ... (init, createParkButtons, updateParkTitle, switchPark, bindCoreEventListeners methods remain the same as the previous complete refined version) ...
    // ... (fetchWaitTimes remains largely the same, ensuring it uses this.currentParkId) ...
    // ... (structureApiDataForDisplay needs to correctly use this.parkLandConfigs with this.currentParkMeta.themedAreasConfigKey) ...
    // ... (getWaitTimeClass, formatWaitTime remain the same) ...
    // ... (renderWaitTimes, createThemedAreaElement, createAttractionCard need to use the land's configured color if available) ...
    // ... (UI state methods, updateLastUpdatedDisplay, startAutoRefresh, startCountdown remain the same) ...
    
    // --- Ensure methods from previous full refactor are here ---
    // (Copying the relevant methods from the most complete version I provided for the class-based approach,
    // then making sure they use the new parkLandConfigs structure correctly)

    init() {
        this.createParkButtons();
        this.bindCoreEventListeners();
        this.updateParkTitle(); // Call after currentParkMeta is set
        if (this.currentParkId) { // Ensure a park is selected before fetching
            this.fetchWaitTimes();
        }
        this.startAutoRefresh();
    }

    createParkButtons() {
        if (!this.elements.parkButtonsContainer) return;
        this.elements.parkButtonsContainer.innerHTML = ''; 

        this.supportedParks.forEach(park => {
            const button = document.createElement('button');
            button.className = 'btn btn--nav'; 
            button.dataset.parkId = park.id;
            button.textContent = park.shortName || park.name;
            if (park.id === this.currentParkId) {
                button.classList.add('active');
            }
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

        this.fetchWaitTimes(true); 
        this.startAutoRefresh(); 
    }
    
    bindCoreEventListeners() { 
        if (this.elements.refreshBtn) {
            this.elements.refreshBtn.addEventListener('click', () => this.fetchWaitTimes(true));
        }
        if (this.elements.retryBtn) {
            this.elements.retryBtn.addEventListener('click', () => this.fetchWaitTimes(true));
        }
    }
    
    async fetchWaitTimes(isManualRefresh = false) {
        if (!this.currentParkId) {
            this.showErrorState("No park selected.");
            this.isLoading = false; // Reset loading state
            return;
        }
        if (this.isLoading && !isManualRefresh) return;
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
                    } catch (e) {
                        errorDetails += ` - ${errorBody.substring(0, 100)}...`; 
                    }
                } catch (e) { /* ignore */ }
                throw new Error(errorDetails);
            }
            
            const apiData = await response.json(); 
            console.log('API Data Received:', apiData);
            
            this.waitTimeData = this.structureApiDataForDisplay(apiData); 
            console.log('Structured Data for Rendering:', this.waitTimeData);
            
            this.lastUpdated = new Date();
            this.updateLastUpdatedDisplay();
            this.renderWaitTimes(); 
            this.showContent();
            
        } catch (error) {
            console.error('Error fetching wait times:', error);
            this.showErrorState(error.message);
        } finally {
            this.isLoading = false; 
        }
    }
    
   // Inside your ParkWaitTimesApp class:

// ... (constructor, init, createParkButtons, updateParkTitle, switchPark, bindCoreEventListeners, fetchWaitTimes remain the same as the previous full refactor) ...
// ... (getWaitTimeClass, formatWaitTime remain the same) ...
// ... (renderWaitTimes, UI state methods, updateLastUpdatedDisplay, startAutoRefresh, startCountdown remain the same) ...

structureApiDataForDisplay(apiData) {
    const displayData = { lands: [] };
    const currentParkConfigKey = this.currentParkMeta ? this.currentParkMeta.themedAreasConfigKey : null;
    const currentParkLandConfig = currentParkConfigKey ? (this.parkLandConfigs[currentParkConfigKey] || {}) : {};

    let allApiRides = []; // Collect all rides from API first

    // 1. Consolidate all rides from API (from lands and root)
    if (apiData.lands && Array.isArray(apiData.lands)) {
        apiData.lands.forEach(landFromApi => {
            if (landFromApi.rides && Array.isArray(landFromApi.rides)) {
                landFromApi.rides.forEach(rideFromApi => {
                    allApiRides.push({ ...rideFromApi, originalLandName: landFromApi.name });
                });
            }
        });
    }
    if (apiData.rides && Array.isArray(apiData.rides) && apiData.rides.length > 0) { // Root rides
        apiData.rides.forEach(rideFromApi => {
            // Avoid adding if it's already there from a land (simple name check, ID check would be better if consistent)
            // For this API, root rides are usually distinct, so direct add is okay.
            allApiRides.push({ ...rideFromApi, originalLandName: rideFromApi.land || "Other Attractions" });
        });
    }

    // 2. Identify single rider lines and main rides
    const singleRiderLineNames = new Set();
    const mainRideObjectsFromApi = [];

    allApiRides.forEach(ride => {
        if (ride.name && ride.name.toLowerCase().includes('single rider')) {
            singleRiderLineNames.add(ride.name.toLowerCase());
        } else {
            mainRideObjectsFromApi.push(ride);
        }
    });

    // 3. Group main rides by land and add single rider flag
    const ridesByLand = {};

    mainRideObjectsFromApi.forEach(mainRide => {
        const landNameKey = (mainRide.originalLandName || "Other Attractions").trim().toLowerCase();
        const landConfig = currentParkLandConfig[landNameKey] || {};
        const displayLandName = landConfig.displayName || mainRide.originalLandName || "Other Attractions";
        const areaColor = landConfig.color; // Get area color

        if (!ridesByLand[displayLandName]) {
            ridesByLand[displayLandName] = {
                name: displayLandName,
                color: areaColor,
                rides: []
            };
        }

        // Check if this main ride has a corresponding single rider line
        // This assumes single rider lines are named predictably (e.g., "Ride Name Single Rider")
        const potentialSingleRiderName = `${mainRide.name} single rider`.toLowerCase();
        const hasSingleRider = singleRiderLineNames.has(potentialSingleRiderName) || 
                               singleRiderLineNames.has(`${mainRide.name.replace(/™/g, '')} single rider`.toLowerCase()) || // Handle TM symbol if present
                               singleRiderLineNames.has(`${mainRide.name.replace(/®/g, '')} single rider`.toLowerCase()); // Handle R symbol if present


        ridesByLand[displayLandName].rides.push({
            id: mainRide.id || `no-id-${mainRide.name.replace(/\s/g, '')}-${Math.random().toString(36).substr(2, 5)}`,
            name: mainRide.name,
            waitTime: mainRide.is_open ? parseInt(mainRide.wait_time, 10) : null,
            isOpen: mainRide.is_open === true,
            lastUpdated: mainRide.last_updated ? new Date(mainRide.last_updated) : new Date(),
            hasSingleRider: hasSingleRider, // Add the flag
            areaColor: areaColor // Pass area color for the sticker
        });
    });

    // 4. Convert grouped rides into the displayData.lands structure
    for (const landName in ridesByLand) {
        displayData.lands.push(ridesByLand[landName]);
    }
    
    displayData.lands.sort((a, b) => a.name.localeCompare(b.name));
    displayData.lands.forEach(land => {
        land.rides.sort((a, b) => a.name.localeCompare(b.name));
    });

    return displayData;
}


createThemedAreaElement(areaKey, landData) {
    const areaDiv = document.createElement('div');
    areaDiv.className = `themed-area themed-area--${areaKey}`;
    if (landData.color) {
        areaDiv.style.borderColor = landData.color;
    } else {
        areaDiv.style.borderColor = 'rgba(255, 255, 255, 0.2)'; 
    }
    
    const headerDiv = document.createElement('div');
    headerDiv.className = 'area-header';
    
    const iconDiv = document.createElement('div');
    iconDiv.className = 'area-icon';
    if (landData.color) {
        iconDiv.style.backgroundColor = landData.color; 
    } else {
         iconDiv.style.backgroundColor = 'var(--color-text-secondary)';
    }
    
    const titleH2 = document.createElement('h2');
    titleH2.className = 'area-title';
    titleH2.textContent = landData.name; 
    
    headerDiv.appendChild(iconDiv);
    headerDiv.appendChild(titleH2);
    
    const attractionsGrid = document.createElement('div');
    attractionsGrid.className = 'attractions-grid';
    
    if (landData.rides && landData.rides.length > 0) {
        landData.rides.forEach(rideData => {
            // Pass landData.color to createAttractionCard if needed, or ensure rideData contains it
            const attractionCard = this.createAttractionCard(rideData); // rideData now includes areaColor
            attractionsGrid.appendChild(attractionCard);
        });
    } else {
        const noRidesMsg = document.createElement('p');
        noRidesMsg.textContent = 'No specific ride data in this area currently.';
        noRidesMsg.className = 'no-rides-in-area-message';
        attractionsGrid.appendChild(noRidesMsg);
    }
    
    areaDiv.appendChild(headerDiv);
    areaDiv.appendChild(attractionsGrid);
    return areaDiv;
}

createAttractionCard(rideData) { // rideData now contains areaColor and hasSingleRider
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
    if (rideData.isOpen && rideData.waitTime === null) {
        statusIndicator.classList.remove(`status-indicator--${statusClass}`);
        statusIndicator.classList.add('status-indicator--unknown');
    }
    
    const statusDot = document.createElement('span');
    statusDot.className = 'status-dot';
    
    const statusText = document.createElement('span');
    statusText.className = 'status-text'; 
    statusText.textContent = rideData.isOpen ? 'Open' : 'Closed';
    if (rideData.isOpen && rideData.waitTime === null) statusText.textContent = 'N/A';
    
    statusIndicator.appendChild(statusDot);
    statusIndicator.appendChild(statusText);
    statusDiv.appendChild(statusIndicator);
    
    if (rideData.lastUpdated) { 
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

    // *** ADD SINGLE RIDER STICKER ***
    if (rideData.hasSingleRider && rideData.isOpen) { // Only show if open and available
        const sticker = document.createElement('div');
        sticker.className = 'single-rider-sticker';
        sticker.textContent = 'SINGLE';
        if (rideData.areaColor) {
            sticker.style.backgroundColor = rideData.areaColor;
            // Basic contrast for text color - you might need a more sophisticated function
            // if your area colors vary a lot in brightness.
            const isDark = (parseInt(rideData.areaColor.substr(1, 2), 16) * 0.299 + 
                            parseInt(rideData.areaColor.substr(3, 2), 16) * 0.587 + 
                            parseInt(rideData.areaColor.substr(5, 2), 16) * 0.114) < 186;
            sticker.style.color = isDark ? 'white' : 'black';
        } else {
            sticker.style.backgroundColor = 'var(--color-primary)'; // Fallback color
            sticker.style.color = 'var(--color-btn-primary-text)';
        }
        cardDiv.appendChild(sticker);
    }
    
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
                hour: 'numeric', 
                minute: '2-digit'
            });
            this.elements.lastUpdatedDisplay.textContent = timeString;
        }
    }
    
    startAutoRefresh() {
        if (this.autoRefreshInterval) clearInterval(this.autoRefreshInterval);
        if (this.countdownInterval) clearInterval(this.countdownInterval);
        
        this.autoRefreshInterval = setInterval(() => {
            if (!this.isLoading && document.visibilityState === 'visible' && this.currentParkId) { 
                console.log(`Auto-refreshing wait times for park ID: ${this.currentParkId}`);
                this.fetchWaitTimes();
            }
        }, this.autoRefreshTime);
        this.startCountdown();
    }
    
    startCountdown() {
        let timeLeft = this.autoRefreshTime / 1000;
        const updateCountdown = () => {
            if (timeLeft < 0) { // Check if less than 0 to prevent briefly showing negative
                 timeLeft = this.autoRefreshTime / 1000; 
            }
            const minutes = Math.floor(timeLeft / 60);
            const seconds = timeLeft % 60;
            const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            if (this.elements.countdownDisplay) {
                this.elements.countdownDisplay.textContent = timeString;
            }
            timeLeft--;
        };
        updateCountdown(); 
        this.countdownInterval = setInterval(updateCountdown, 1000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new ParkWaitTimesApp();
});
