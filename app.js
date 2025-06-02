// Universal Parks Wait Times Application (Refactored)
class ParkWaitTimesApp {
    constructor() {
        this.supportedParks = [
            { id: 64, name: "Islands of Adventure", shortName: "Islands", themedAreasConfigKey: "ioa" },
            { id: 65, name: "Universal Studios Florida", shortName: "Studios", themedAreasConfigKey: "usf" },
            { id: 334, name: "Epic Universe", shortName: "Epic", themedAreasConfigKey: "epic_universe" } // Verify ID
        ];

        this.parkLandConfigs = {
            'epic_universe': {
                'celestial park': { color: '#4A90E2', displayName: 'Celestial Park' },
                'dark universe': { color: '#8B0000', displayName: 'Dark Universe' },
                'how to train your dragon — isle of berk': { color: '#228B22', displayName: 'How to Train Your Dragon — Isle of Berk' },
                'super nintendo world': { color: '#FF4500', displayName: 'SUPER NINTENDO WORLD' },
                'the wizarding world of harry potter — ministry of magic': { color: '#800080', displayName: 'The Wizarding World of Harry Potter — Ministry of Magic' }
            },
            'usf': { 
                'dreamworks land': { color: '#0078D4', displayName: 'DreamWorks Land' },
                'hollywood': { color: '#FFD700', displayName: 'Hollywood' },
                'illumination\'s minion land': { color: '#FCE205', displayName: 'Illumination\'s Minion Land' },
                'new york': { color: '#C0C0C0', displayName: 'New York' },
                'production central': { color: '#E43F3F', displayName: 'Production Central' },
                'san francisco': { color: '#50A6C2', displayName: 'San Francisco' },
                'the wizarding world of harry potter - diagon alley': { color: '#4D2B7F', displayName: 'The Wizarding World of Harry Potter - Diagon Alley' },
                'world expo': { color: '#00A86B', displayName: 'World Expo' }
            },
            'ioa': { 
                'jurassic park': { color: '#2E8B57', displayName: 'Jurassic Park' },
                'marvel super hero island': { color: '#B22222', displayName: 'Marvel Super Hero Island' },
                'seuss landing': { color: '#FF69B4', displayName: 'Seuss Landing' },
                'the wizarding world of harry potter - hogsmeade': { color: '#3A2A78', displayName: 'The Wizarding World of Harry Potter - Hogsmeade' },
                'toon lagoon': { color: '#1E90FF', displayName: 'Toon Lagoon' },
                'the lost continent': { color: '#DAA520', displayName: 'The Lost Continent' } // Ensure this matches API name if present
            },
            // A generic key for unlanded/root rides if you want to give them a default color/name
            'other_attractions': { color: '#777777', displayName: 'Other Attractions / Events'}
        };

        this.currentParkId = this.supportedParks[0].id; // Default to first park
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
    
    init() {
        this.createParkButtons();
        this.bindCoreEventListeners();
        this.updateParkTitle();
        if (this.currentParkId) {
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
        console.log(Switching to park ID: ${parkId});

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
            this.isLoading = false;
            return;
        }
        if (this.isLoading && !isManualRefresh) return;
        this.isLoading = true;
        this.showLoadingState();
        console.log(Fetching wait times for park ID: ${this.currentParkId}...);
        
        try {
            const parkApiUrl = https://queue-times.com/en-US/parks/${this.currentParkId}/queue_times.json;
            const proxiedUrl = this.apiConfig.proxyUrl + encodeURIComponent(parkApiUrl);
            console.log('Requesting URL:', proxiedUrl);
            
            const response = await fetch(proxiedUrl);
            console.log('Response status:', response.status);
            
            if (!response.ok) {
                let errorDetails = HTTP error! status: ${response.status} ${response.statusText};
                try {
                    const errorBody = await response.text(); 
                    console.error('Error response body:', errorBody);
                    try {
                        const errorJson = JSON.parse(errorBody); 
                        errorDetails +=  - ${errorJson.message || JSON.stringify(errorJson)};
                    } catch (e) {
                        errorDetails +=  - ${errorBody.substring(0, 100)}...; 
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
    
    // This version processes all rides, including single rider lines as separate entries.
    // It uses parkLandConfigs for land display names and colors.
    structureApiDataForDisplay(apiData) {
        const displayData = { lands: [] };
        const processedRideIds = new Set(); 
        const currentParkConfigKey = this.currentParkMeta ? this.currentParkMeta.themedAreasConfigKey : null;
        const currentParkSpecificLandConfig = currentParkConfigKey ? (this.parkLandConfigs[currentParkConfigKey] || {}) : {};

        // 1. Process rides nested under lands from API
        if (apiData.lands && Array.isArray(apiData.lands)) {
            apiData.lands.forEach(landFromApi => {
                const apiLandNameLower = landFromApi.name.trim().toLowerCase();
                const landConfig = currentParkSpecificLandConfig[apiLandNameLower] || {}; // Get config for this specific land
                
                const currentLand = {
                    name: landConfig.displayName || landFromApi.name || 'Unnamed Land',
                    color: landConfig.color, // Use configured color
                    rides: []
                };

                if (landFromApi.rides && Array.isArray(landFromApi.rides)) {
                    landFromApi.rides.forEach(rideFromApi => {
                        const rideId = rideFromApi.id || no-id-${rideFromApi.name.replace(/\s/g, '')}-${Math.random().toString(36).substr(2, 5)};
                        if (!processedRideIds.has(rideId)) {
                            currentLand.rides.push({
                                id: rideId,
                                name: rideFromApi.name,
                                waitTime: rideFromApi.is_open ? parseInt(rideFromApi.wait_time, 10) : null,
                                isOpen: rideFromApi.is_open === true,
                                lastUpdated: rideFromApi.last_updated ? new Date(rideFromApi.last_updated) : new Date(),
                                areaColor: landConfig.color // Pass the land's color to the ride object
                            });
                            processedRideIds.add(rideId);
                        }
                    });
                }
                if (currentLand.rides.length > 0) {
                    displayData.lands.push(currentLand);
                }
            });
        }

        // 2. Process rides from the root apiData.rides array
        let unlandedRides = [];
        if (apiData.rides && Array.isArray(apiData.rides) && apiData.rides.length > 0) {
            const otherAttractionsConfigKey = 'other_attractions'; // Key in parkLandConfigs for generic styling
            const otherAttractionsConfig = currentParkSpecificLandConfig[otherAttractionsConfigKey] || this.parkLandConfigs[otherAttractionsConfigKey] || {};


            apiData.rides.forEach(rideFromApi => {
                const rideId = rideFromApi.id || no-id-${rideFromApi.name.replace(/\s/g, '')}-${Math.random().toString(36).substr(2, 5)};
                if (!processedRideIds.has(rideId)) {
                    unlandedRides.push({
                        id: rideId,
                        name: rideFromApi.name,
                        waitTime: rideFromApi.is_open ? parseInt(rideFromApi.wait_time, 10) : null,
                        isOpen: rideFromApi.is_open === true,
                        lastUpdated: rideFromApi.last_updated ? new Date(rideFromApi.last_updated) : new Date(),
                        areaColor: otherAttractionsConfig.color // Assign color for "Other Attractions"
                    });
                    processedRideIds.add(rideId);
                }
            });
        }
        if (unlandedRides.length > 0) {
            const otherAttractionsConfigKey = 'other_attractions';
            const otherAttractionsConfig = currentParkSpecificLandConfig[otherAttractionsConfigKey] || this.parkLandConfigs[otherAttractionsConfigKey] || {};
            displayData.lands.push({ 
                name: otherAttractionsConfig.displayName || "Other Attractions", 
                color: otherAttractionsConfig.color, 
                rides: unlandedRides 
            });
        }
        
        displayData.lands.sort((a, b) => a.name.localeCompare(b.name));
        displayData.lands.forEach(land => {
            land.rides.sort((a, b) => a.name.localeCompare(b.name));
        });

        return displayData;
    }
    
    getWaitTimeClass(waitTime, isOpen) { 
        if (!isOpen) return 'closed';
        if (waitTime === null) return 'unknown'; 
        if (waitTime === 0) return 'low'; // Treat 0 min as low if open
        if (waitTime <= 20) return 'low';
        if (waitTime <= 45) return 'medium';
        if (waitTime <= 75) return 'high';
        return 'very-high';
    }
    
    formatWaitTime(waitTime, isOpen) { 
        if (!isOpen) return 'CLOSED';
        if (waitTime === null) return 'N/A';
        if (waitTime === 0) return 'No Wait';
        return ${waitTime} min;
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
            const areaKey = landData.name.toLowerCase()
                .replace(/\s+/g, '-')
                .replace(/[^a-z0-9-]/g, '');
            const areaElement = this.createThemedAreaElement(areaKey, landData);
            container.appendChild(areaElement);
        });
    }
    
    createThemedAreaElement(areaKey, landData) {
        const areaDiv = document.createElement('div');
        areaDiv.className = themed-area themed-area--${areaKey};
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
                const attractionCard = this.createAttractionCard(rideData);
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
    
    // This createAttractionCard version does NOT include the single rider sticker logic
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
        waitTimeSpan.className = wait-time wait-time--${waitTimeClass};
        waitTimeSpan.textContent = this.formatWaitTime(rideData.waitTime, rideData.isOpen);
        
        const statusDiv = document.createElement('div');
        statusDiv.className = 'attraction-status';
        
        const statusIndicator = document.createElement('div');
        const statusClass = rideData.isOpen ? 'open' : 'closed'; 
        statusIndicator.className = status-indicator status-indicator--${statusClass};
        if (rideData.isOpen && rideData.waitTime === null) { 
            statusIndicator.classList.remove(status-indicator--${statusClass});
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
            lastUpdatedRideSpan.textContent = Updated: ${new Date(rideData.lastUpdated).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })};
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
                console.log(Auto-refreshing wait times for park ID: ${this.currentParkId});
                this.fetchWaitTimes();
            }
        }, this.autoRefreshTime);
        this.startCountdown();
    }
    
    startCountdown() {
        let timeLeft = this.autoRefreshTime / 1000;
        const updateCountdown = () => {
            if (timeLeft < 0) { 
                 timeLeft = this.autoRefreshTime / 1000; 
            }
            const minutes = Math.floor(timeLeft / 60);
            const seconds = timeLeft % 60;
            const timeString = ${minutes}:${seconds.toString().padStart(2, '0')};
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
