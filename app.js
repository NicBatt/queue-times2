// Application Configuration
const CONFIG = {
    parks: [
        { id: 334, name: "Epic Universe", location: "Orlando, FL" },
        { id: 65, name: "Universal Studios Florida", location: "Orlando, FL" },
        { id: 66, name: "Universal Studios Hollywood", location: "Hollywood, CA" }
    ],
    corsProxy: "https://corsproxy.io/?url=",
    apiBase: "https://queue-times.com/parks/",
    refreshInterval: 300000 // 5 minutes
};

// Application State
let currentParkId = 334; // Default to Epic Universe
let refreshTimer = null;
let isLoading = false;

// DOM Elements
const elements = {
    parkButtons: document.querySelectorAll('.btn--nav'),
    refreshBtn: document.getElementById('refreshBtn'),
    lastUpdated: document.getElementById('lastUpdated'),
    currentParkName: document.getElementById('currentParkName'),
    currentParkLocation: document.getElementById('currentParkLocation'),
    loadingContainer: document.getElementById('loadingContainer'),
    errorContainer: document.getElementById('errorContainer'),
    waitTimesContainer: document.getElementById('waitTimesContainer'),
    errorText: document.getElementById('errorText')
};

// Initialize Application
document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
    loadWaitTimes(currentParkId);
    startAutoRefresh();
});

// Event Listeners
function initializeEventListeners() {
    // Park navigation buttons
    elements.parkButtons.forEach(button => {
        button.addEventListener('click', function() {
            const parkId = parseInt(this.dataset.parkId);
            if (parkId !== currentParkId && !isLoading) {
                switchPark(parkId);
            }
        });
    });

    // Refresh button
    elements.refreshBtn.addEventListener('click', function() {
        if (!isLoading) {
            loadWaitTimes(currentParkId, true);
        }
    });
}

// Park Switching
function switchPark(parkId) {
    currentParkId = parkId;
    updateActiveButton(parkId);
    updateParkInfo(parkId);
    loadWaitTimes(parkId);
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
        elements.currentParkName.textContent = park.name;
        elements.currentParkLocation.textContent = park.location;
    }
}

// Data Fetching
async function loadWaitTimes(parkId, isManualRefresh = false) {
    if (isLoading) return;
    
    isLoading = true;
    showLoadingState();
    
    if (isManualRefresh) {
        elements.refreshBtn.classList.add('refreshing');
    }
    
    try {
        const url = `${CONFIG.corsProxy}${CONFIG.apiBase}${parkId}/queue_times.json`;
        console.log('Fetching data from:', url);
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            },
        });
        
        if (!response.ok) {
            throw new Error(`Failed to fetch data (${response.status})`);
        }
        
        const data = await response.json();
        console.log('API Response:', data);
        
        if (!data) {
            throw new Error('No data received from API');
        }
        
        displayWaitTimes(data);
        updateLastUpdatedTime();
        hideErrorState();
        
    } catch (error) {
        console.error('Error fetching wait times:', error);
        
        // Show more specific error messages
        let errorMessage = 'Unable to load wait times. ';
        if (error.message.includes('Failed to fetch')) {
            errorMessage += 'Please check your internet connection.';
        } else if (error.message.includes('404')) {
            errorMessage += 'Park data not found.';
        } else if (error.message.includes('No data received')) {
            errorMessage += 'The park may be closed or data is unavailable.';
        } else {
            errorMessage += error.message;
        }
        
        showErrorState(errorMessage);
    } finally {
        isLoading = false;
        hideLoadingState();
        elements.refreshBtn.classList.remove('refreshing');
    }
}

// Data Processing and Display
function displayWaitTimes(data) {
    const container = elements.waitTimesContainer;
    container.innerHTML = '';
    
    console.log('Processing wait times data:', data);
    
    // Handle different possible data structures
    let attractions = [];
    
    if (data.lands && Array.isArray(data.lands)) {
        // Structure with lands
        data.lands.forEach(land => {
            if (land.rides && Array.isArray(land.rides)) {
                land.rides.forEach(ride => {
                    attractions.push({
                        name: ride.name,
                        waitTime: ride.wait_time || 0,
                        isOpen: ride.is_open !== false,
                        singleRider: ride.single_rider === true,
                        areaName: land.name || 'General Area'
                    });
                });
            }
        });
    } else if (data.rides && Array.isArray(data.rides)) {
        // Direct rides array
        attractions = data.rides.map(ride => ({
            name: ride.name,
            waitTime: ride.wait_time || 0,
            isOpen: ride.is_open !== false,
            singleRider: ride.single_rider === true,
            areaName: ride.land || 'General Area'
        }));
    } else if (Array.isArray(data)) {
        // Data is directly an array
        attractions = data.map(ride => ({
            name: ride.name,
            waitTime: ride.wait_time || 0,
            isOpen: ride.is_open !== false,
            singleRider: ride.single_rider === true,
            areaName: ride.land || 'General Area'
        }));
    }
    
    if (attractions.length === 0) {
        showNoDataState();
        return;
    }
    
    // Group attractions by area
    const groupedAttractions = groupAttractionsByArea(attractions);
    
    // Create sections for each area
    Object.entries(groupedAttractions).forEach(([areaName, areaAttractions]) => {
        const areaSection = createAreaSection(areaName, areaAttractions);
        container.appendChild(areaSection);
    });
}

function groupAttractionsByArea(attractions) {
    const grouped = {};
    
    attractions.forEach(attraction => {
        const areaName = attraction.areaName || 'Other Attractions';
        
        if (!grouped[areaName]) {
            grouped[areaName] = [];
        }
        
        grouped[areaName].push(attraction);
    });
    
    return grouped;
}

function createAreaSection(areaName, attractions) {
    const section = document.createElement('div');
    section.className = 'area-section';
    
    const header = document.createElement('h3');
    header.className = 'area-header';
    header.textContent = areaName;
    section.appendChild(header);
    
    const grid = document.createElement('div');
    grid.className = 'attractions-grid';
    
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
    
    const name = document.createElement('div');
    name.className = 'attraction-name';
    name.textContent = attraction.name;
    card.appendChild(name);
    
    const waitInfo = document.createElement('div');
    waitInfo.className = 'wait-time-info';
    
    const waitTime = document.createElement('div');
    waitTime.className = `wait-time ${getWaitTimeClass(attraction)}`;
    waitTime.textContent = getWaitTimeText(attraction);
    
    waitInfo.appendChild(waitTime);
    card.appendChild(waitInfo);
    
    // Add single rider indicator if available
    if (attraction.singleRider && attraction.isOpen) {
        const singleRider = document.createElement('div');
        singleRider.className = 'single-rider';
        singleRider.textContent = 'Single Rider Available';
        card.appendChild(singleRider);
    }
    
    return card;
}

function getWaitTimeClass(attraction) {
    if (!attraction.isOpen) {
        return 'wait-time--closed';
    }
    
    const waitTime = attraction.waitTime;
    if (waitTime === 0) return 'wait-time--short';
    if (waitTime <= 20) return 'wait-time--short';
    if (waitTime <= 40) return 'wait-time--medium';
    if (waitTime <= 75) return 'wait-time--long';
    return 'wait-time--very-long';
}

function getWaitTimeText(attraction) {
    if (!attraction.isOpen) {
        return 'Closed';
    }
    
    if (attraction.waitTime === 0) {
        return 'Walk On';
    }
    
    return `${attraction.waitTime} min`;
}

// UI State Management
function showLoadingState() {
    elements.loadingContainer.classList.remove('hidden');
    elements.waitTimesContainer.classList.add('switching');
    elements.errorContainer.classList.add('hidden');
}

function hideLoadingState() {
    elements.loadingContainer.classList.add('hidden');
    elements.waitTimesContainer.classList.remove('switching');
}

function showErrorState(errorMessage) {
    elements.errorContainer.classList.remove('hidden');
    elements.waitTimesContainer.innerHTML = '';
    elements.errorText.textContent = errorMessage || 'Unable to load wait times. Please try again.';
}

function hideErrorState() {
    elements.errorContainer.classList.add('hidden');
}

function showNoDataState() {
    elements.waitTimesContainer.innerHTML = `
        <div class="no-data">
            <div class="no-data-icon">🎢</div>
            <h3>No wait time data available</h3>
            <p>Wait times may not be available for this park at the moment. Try refreshing or select a different park.</p>
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
    elements.lastUpdated.textContent = `Last updated: ${timeString}`;
}

// Auto Refresh
function startAutoRefresh() {
    if (refreshTimer) {
        clearInterval(refreshTimer);
    }
    
    refreshTimer = setInterval(() => {
        if (!isLoading) {
            loadWaitTimes(currentParkId);
        }
    }, CONFIG.refreshInterval);
}

function stopAutoRefresh() {
    if (refreshTimer) {
        clearInterval(refreshTimer);
        refreshTimer = null;
    }
}

// Global retry function for error state
function retryLoad() {
    loadWaitTimes(currentParkId, true);
}

// Handle page visibility changes to pause/resume auto-refresh
document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
        stopAutoRefresh();
    } else {
        startAutoRefresh();
        // Refresh data when page becomes visible again
        if (!isLoading) {
            loadWaitTimes(currentParkId);
        }
    }
});

// Cleanup on page unload
window.addEventListener('beforeunload', function() {
    stopAutoRefresh();
});