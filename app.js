// Application Configuration
const CONFIG = {
    parks: [
        { id: 334, name: "Epic Universe", location: "Orlando, FL" }, // Verify ID once park is live & in API
        { id: 65, name: "Universal Studios Florida", location: "Orlando, FL" },
        { id: 66, name: "Universal Studios Hollywood", location: "Hollywood, CA" },
        { id: 6, name: "Alton Towers", location: "UK" } // Example
    ],
    corsProxy: "https://corsproxy.io/?url=",
    apiBase: "https://queue-times.com/parks/",
    apiAllParks: "https://queue-times.com/en-US/parks.json",
    refreshInterval: 300000 // 5 minutes
};

// Application State
let currentParkId = CONFIG.parks[0].id;
let refreshTimer = null;
let isLoading = false;

// DOM Elements
const elements = {
    parkButtonsContainer: document.getElementById('parkButtonsContainer'),
    parkButtons: [],
    refreshBtn: document.getElementById('refreshBtn'),
    lastUpdated: document.getElementById('lastUpdated'),
    currentParkName: document.getElementById('currentParkName'),
    currentParkLocation: document.getElementById('currentParkLocation'),
    loadingContainer: document.getElementById('loadingContainer'),
    errorContainer: document.getElementById('errorContainer'),
    waitTimesContainer: document.getElementById('waitTimesContainer'),
    errorText: document.getElementById('errorText')
};

document.addEventListener('DOMContentLoaded', function() {
    populateParkButtons();
    initializeEventListeners();
    const initialPark = CONFIG.parks.find(p => p.id === currentParkId);
    if (initialPark) {
        updateParkInfo(currentParkId);
        // Set active button for initial park
        const initialButton = document.querySelector(`.btn--nav[data-park-id="${currentParkId}"]`);
        if (initialButton) initialButton.classList.add('active');
    } else if (CONFIG.parks.length > 0) { // Fallback to first park if default isn't found
        currentParkId = CONFIG.parks[0].id;
        updateParkInfo(currentParkId);
        const initialButton = document.querySelector(`.btn--nav[data-park-id="${currentParkId}"]`);
        if (initialButton) initialButton.classList.add('active');
    }

    if (currentParkId) { // Only load if a park ID is set
        loadWaitTimes(currentParkId);
        startAutoRefresh();
    }
});

function populateParkButtons() {
    if (!elements.parkButtonsContainer) return;
    elements.parkButtonsContainer.innerHTML = ''; // Clear existing buttons if any
    CONFIG.parks.forEach(park => {
        const button = document.createElement('button');
        button.className = 'btn btn--nav';
        button.dataset.parkId = park.id;
        button.textContent = park.name;
        elements.parkButtonsContainer.appendChild(button);
    });
    elements.parkButtons = document.querySelectorAll('#parkButtonsContainer .btn--nav');
    // Re-initialize event listeners for newly created buttons
    initializeEventListeners_ParkButtonsOnly();
}

function initializeEventListeners_ParkButtonsOnly() {
    elements.parkButtons.forEach(button => {
        // Remove old listener before adding new one to prevent duplicates if called multiple times
        button.replaceWith(button.cloneNode(true)); // Simple way to remove all listeners
    });
    // Re-select buttons after cloning
    elements.parkButtons = document.querySelectorAll('#parkButtonsContainer .btn--nav');
    elements.parkButtons.forEach(button => {
        button.addEventListener('click', function() {
            const parkId = parseInt(this.dataset.parkId);
            if (parkId !== currentParkId && !isLoading) {
                switchPark(parkId);
            }
        });
    });
}


function initializeEventListeners() {
    // Park buttons handled by populateParkButtons and initializeEventListeners_ParkButtonsOnly
    if (elements.refreshBtn) {
        elements.refreshBtn.addEventListener('click', function() {
            if (!isLoading) {
                loadWaitTimes(currentParkId, true);
            }
        });
    }
}

function switchPark(parkId) {
    currentParkId = parkId;
    updateActiveButton(parkId);
    updateParkInfo(parkId);
    loadWaitTimes(parkId);
    startAutoRefresh();
}

function updateActiveButton(parkId) {
    elements.parkButtons.forEach(button => {
        button.classList.remove('active');
        if (parseInt(button.dataset.parkId) === parkId) {
            button.classList.add('active');
        }
    });
}

function updateParkInfo(parkId) {
    const park = CONFIG.parks.find(p => p.id === parkId);
    if (park) {
        if (elements.currentParkName) elements.currentParkName.textContent = park.name;
        if (elements.currentParkLocation) elements.currentParkLocation.textContent = park.location;
    }
}

async function loadWaitTimes(parkId, isManualRefresh = false) {
    if (!parkId) {
        console.warn("loadWaitTimes called with no parkId.");
        showErrorState("No park selected or park ID is invalid.");
        return;
    }
    if (isLoading) return;
    isLoading = true;
    showLoadingState();

    if (isManualRefresh && elements.refreshBtn) {
        elements.refreshBtn.classList.add('refreshing');
    }

    try {
        const targetUrl = `${CONFIG.apiBase}${parkId}/queue_times.json`;
        const url = `${CONFIG.corsProxy}${encodeURIComponent(targetUrl)}`;
        console.log('Fetching data from:', url);

        const response = await fetch(url, {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
        });

        if (!response.ok) {
            let errorDetails = `Failed to fetch data (${response.status} ${response.statusText})`;
            try {
                const errorBody = await response.text();
                console.error('Error response body:', errorBody);
                try {
                    const errorJson = JSON.parse(errorBody);
                    errorDetails += ` - ${errorJson.message || JSON.stringify(errorJson)}`;
                } catch (e) {
                    errorDetails += ` - Server response: ${errorBody.substring(0,150)}...`;
                }
            } catch(e) { /* Failed to read error body */ }
            throw new Error(errorDetails);
        }

        const data = await response.json();
        console.log('API Response:', data);

        if (!data || (Object.keys(data).length === 0 && data.constructor === Object && !Array.isArray(data))) {
             // Allow empty arrays if API returns that for a park with no rides/lands
            if (Array.isArray(data) && data.length === 0) {
                // This is okay, means no rides reported
            } else if (!(data.lands && Array.isArray(data.lands)) && !(data.rides && Array.isArray(data.rides))) {
                throw new Error('No valid ride or land data received from API.');
            }
        }


        displayWaitTimes(data);
        updateLastUpdatedTime();
        hideErrorState();

    } catch (error) {
        console.error('Error fetching wait times:', error);
        let errorMessage = 'Unable to load wait times. ';
        if (error.message.includes('Failed to fetch')) {
            errorMessage += 'Please check your internet connection or the proxy server status.';
        } else if (error.message.includes('404')) {
            errorMessage += 'Park data not found. The Park ID might be incorrect or the park is not in the API.';
        } else if (error.message.includes('No valid ride or land data') || error.message.includes('park data is empty')) {
            errorMessage += 'The park may be closed or data is currently unavailable.';
        } else {
            errorMessage += error.message;
        }
        showErrorState(errorMessage);
    } finally {
        isLoading = false;
        hideLoadingState();
        if (elements.refreshBtn) elements.refreshBtn.classList.remove('refreshing');
    }
}

// === Updated displayWaitTimes and groupAttractionsByArea ===
function displayWaitTimes(data) {
    const container = elements.waitTimesContainer;
    if (!container) {
        console.error("Wait times container not found in DOM.");
        return;
    }
    container.innerHTML = ''; // Clear previous content

    console.log('Processing wait times data:', data);
    let attractions = [];
    const processedRideIds = new Set(); // To keep track of processed ride IDs and avoid duplicates

    // 1. Process rides nested under lands
    if (data.lands && Array.isArray(data.lands)) {
        data.lands.forEach(land => {
            if (land.rides && Array.isArray(land.rides)) {
                land.rides.forEach(ride => {
                    // Ensure ride.id is present and unique before adding
                    if (ride.id && !processedRideIds.has(ride.id)) {
                        attractions.push({
                            id: ride.id,
                            name: ride.name,
                            waitTime: ride.wait_time === undefined || ride.wait_time === null ? null : parseInt(ride.wait_time, 10),
                            isOpen: ride.is_open === true,
                            areaName: land.name || 'General Area',
                            lastUpdated: ride.last_updated ? new Date(ride.last_updated) : null
                        });
                        processedRideIds.add(ride.id);
                    } else if (!ride.id) { // Handle rides without an ID (less ideal)
                         attractions.push({
                            id: `no-id-${ride.name}-${Math.random()}`, // Generate a temporary unique key if no ID
                            name: ride.name,
                            waitTime: ride.wait_time === undefined || ride.wait_time === null ? null : parseInt(ride.wait_time, 10),
                            isOpen: ride.is_open === true,
                            areaName: land.name || 'General Area',
                            lastUpdated: ride.last_updated ? new Date(ride.last_updated) : null
                        });
                    }
                });
            }
        });
    }

    // 2. Process rides from the root data.rides array
    if (data.rides && Array.isArray(data.rides) && data.rides.length > 0) {
        data.rides.forEach(ride => {
            if (ride.id && !processedRideIds.has(ride.id)) {
                attractions.push({
                    id: ride.id,
                    name: ride.name,
                    waitTime: ride.wait_time === undefined || ride.wait_time === null ? null : parseInt(ride.wait_time, 10),
                    isOpen: ride.is_open === true,
                    areaName: ride.land || 'Special Attractions / Other',
                    lastUpdated: ride.last_updated ? new Date(ride.last_updated) : null
                });
                processedRideIds.add(ride.id);
            } else if (!ride.id) {
                 attractions.push({
                    id: `no-id-${ride.name}-${Math.random()}`,
                    name: ride.name,
                    waitTime: ride.wait_time === undefined || ride.wait_time === null ? null : parseInt(ride.wait_time, 10),
                    isOpen: ride.is_open === true,
                    areaName: ride.land || 'Special Attractions / Other',
                    lastUpdated: ride.last_updated ? new Date(ride.last_updated) : null
                });
            }
        });
    }
    
    // 3. Fallback if data is directly an array of rides AND attractions list is still empty
    if (attractions.length === 0 && Array.isArray(data) && data.length > 0) {
         attractions = data.map(ride => ({
            id: ride.id || `no-id-${ride.name}-${Math.random()}`,
            name: ride.name,
            waitTime: ride.wait_time === undefined || ride.wait_time === null ? null : parseInt(ride.wait_time, 10),
            isOpen: ride.is_open === true,
            areaName: ride.land || 'General Rides',
            lastUpdated: ride.last_updated ? new Date(ride.last_updated) : null
        }));
    }

    if (attractions.length === 0) {
        showNoDataState();
        return;
    }

    const groupedAttractions = groupAttractionsByArea(attractions);

    Object.keys(groupedAttractions)
        .sort()
        .forEach(areaName => {
            const areaSection = createAreaSection(areaName, groupedAttractions[areaName]);
            container.appendChild(areaSection);
        });
}

function groupAttractionsByArea(attractions) {
    const grouped = {};
    attractions.forEach(attraction => {
        const areaName = attraction.areaName || 'Uncategorized Attractions';
        if (!grouped[areaName]) {
            grouped[areaName] = [];
        }
        grouped[areaName].push(attraction);
    });
    return grouped;
}
// === End of Updated functions ===

function createAreaSection(areaName, attractions) {
    const section = document.createElement('div');
    section.className = 'area-section';

    const header = document.createElement('h3');
    header.className = 'area-header';
    header.textContent = areaName;
    section.appendChild(header);

    const grid = document.createElement('div');
    grid.className = 'attractions-grid';

    attractions.sort((a, b) => a.name.localeCompare(b.name));

    attractions.forEach(attraction => {
        const card = createAttractionCard(attraction);
        grid.appendChild(card);
    });

    section.appendChild(grid);
    return section;
}

function createAttractionCard(attraction) {
    const card = document.createElement('div');
    card.className = 'attraction-card';
    if (!attraction.isOpen) {
        card.classList.add('attraction-card--closed');
    }

    const nameDiv = document.createElement('div');
    nameDiv.className = 'attraction-name';
    nameDiv.textContent = attraction.name;
    card.appendChild(nameDiv);

    const waitInfoDiv = document.createElement('div');
    waitInfoDiv.className = 'wait-time-info';

    const waitTimeDiv = document.createElement('div');
    waitTimeDiv.className = `wait-time ${getWaitTimeClass(attraction)}`;
    waitTimeDiv.textContent = getWaitTimeText(attraction);
    waitInfoDiv.appendChild(waitTimeDiv);

    if (attraction.lastUpdated) {
        const rideUpdatedDiv = document.createElement('div');
        rideUpdatedDiv.className = 'ride-last-updated';
        rideUpdatedDiv.textContent = `Updated: ${attraction.lastUpdated.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
        waitInfoDiv.appendChild(rideUpdatedDiv);
    }
    card.appendChild(waitInfoDiv);

    if (attraction.name.toLowerCase().includes('single rider') && attraction.isOpen) {
        const singleRiderDiv = document.createElement('div');
        singleRiderDiv.className = 'single-rider-indicator';
        singleRiderDiv.textContent = 'Single Rider';
        card.appendChild(singleRiderDiv);
    }
    return card;
}

function getWaitTimeClass(attraction) {
    if (!attraction.isOpen) return 'wait-time--closed';
    if (attraction.waitTime === null) return 'wait-time--unknown';

    const waitTime = attraction.waitTime;
    if (waitTime === 0) return 'wait-time--walkon';
    if (waitTime <= 20) return 'wait-time--short';
    if (waitTime <= 40) return 'wait-time--medium';
    if (waitTime <= 75) return 'wait-time--long';
    return 'wait-time--very-long';
}

function getWaitTimeText(attraction) {
    if (!attraction.isOpen) return 'Closed';
    if (attraction.waitTime === null) return 'N/A';

    if (attraction.waitTime === 0) return 'Walk On';
    return `${attraction.waitTime} min`;
}

function showLoadingState() {
    if (elements.loadingContainer) elements.loadingContainer.classList.remove('hidden');
    if (elements.waitTimesContainer) elements.waitTimesContainer.classList.add('switching');
    if (elements.errorContainer) elements.errorContainer.classList.add('hidden');
}

function hideLoadingState() {
    if (elements.loadingContainer) elements.loadingContainer.classList.add('hidden');
    if (elements.waitTimesContainer) elements.waitTimesContainer.classList.remove('switching');
}

function showErrorState(errorMessage) {
    if (elements.errorContainer) elements.errorContainer.classList.remove('hidden');
    if (elements.waitTimesContainer) elements.waitTimesContainer.innerHTML = '';
    if (elements.errorText) elements.errorText.textContent = errorMessage || 'Unable to load wait times. Please try again.';
    if (elements.loadingContainer) elements.loadingContainer.classList.add('hidden');
}

function hideErrorState() {
    if (elements.errorContainer) elements.errorContainer.classList.add('hidden');
}

function showNoDataState() {
    if (!elements.waitTimesContainer) return;
    elements.waitTimesContainer.innerHTML = `
        <div class="no-data-message">
            <p>No wait time data is currently available for this park.</p>
            <p>This could be due to the park being closed, or data is temporarily unavailable. Please try again later.</p>
        </div>
    `;
}

function updateLastUpdatedTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
    if (elements.lastUpdated) elements.lastUpdated.textContent = `Times as of: ${timeString}`;
}

function startAutoRefresh() {
    stopAutoRefresh();
    refreshTimer = setInterval(() => {
        if (!isLoading && document.visibilityState === 'visible' && currentParkId) {
            console.log('Auto-refreshing wait times for park ID:', currentParkId);
            loadWaitTimes(currentParkId);
        }
    }, CONFIG.refreshInterval);
}

function stopAutoRefresh() {
    if (refreshTimer) {
        clearInterval(refreshTimer);
        refreshTimer = null;
        console.log('Auto-refresh stopped.');
    }
}

document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
        stopAutoRefresh();
    } else {
        console.log('Page visible, restarting auto-refresh and fetching current data.');
        // Fetch immediately when tab becomes visible if not already loading AND a park is selected
        if (!isLoading && currentParkId) {
            loadWaitTimes(currentParkId);
        }
        startAutoRefresh(); // Restart the timer logic regardless
    }
});

window.addEventListener('beforeunload', function() {
    stopAutoRefresh();
});
