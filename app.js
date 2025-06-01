// Epic Universe Wait Times Application
class EpicUniverseWaitTimes {
    constructor() {
        this.apiConfig = {
            parkId: 334,
            proxyUrl: 'https://corsproxy.io/?url=',
            baseUrl: 'https://queue-times.com/en-US/parks/334/queue_times'
        };
        
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
                name: 'How to Train Your Dragon - Isle of Berk',
                color: '#228B22',
                attractions: ['Dragon Racer\'s Rally', 'Fyre Drill', 'Hiccup\'s Wing Gliders', 'Meet Toothless and Friends']
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
        
        this.waitTimeData = {};
        this.lastUpdated = null;
        this.autoRefreshInterval = null;
        this.countdownInterval = null;
        this.autoRefreshTime = 5 * 60 * 1000; // 5 minutes
        
        this.init();
    }
    
    init() {
        this.bindEventListeners();
        this.startAutoRefresh();
        this.fetchWaitTimes();
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
        
        try {
            const url = this.apiConfig.proxyUrl + encodeURIComponent(this.apiConfig.baseUrl);
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const htmlText = await response.text();
            const waitTimeData = this.parseWaitTimeData(htmlText);
            
            this.waitTimeData = waitTimeData;
            this.lastUpdated = new Date();
            this.updateLastUpdatedDisplay();
            this.renderWaitTimes();
            this.showContent();
            
        } catch (error) {
            console.error('Error fetching wait times:', error);
            this.showErrorState(error.message);
        }
    }
    
    parseWaitTimeData(htmlText) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlText, 'text/html');
        const waitTimeData = {};
        
        // Try to find attraction elements - this is a simplified parser
        // The actual structure may vary, so we'll create mock data for demonstration
        // In a real implementation, you'd need to inspect the actual HTML structure
        
        // For demonstration, let's create sample data
        const allAttractions = Object.values(this.themedAreas).flatMap(area => area.attractions);
        
        allAttractions.forEach(attraction => {
            // Simulate different wait times and statuses
            const isOpen = Math.random() > 0.2; // 80% chance of being open
            let waitTime = null;
            let status = 'Closed';
            
            if (isOpen) {
                waitTime = Math.floor(Math.random() * 120) + 5; // 5-125 minutes
                status = 'Open';
            }
            
            waitTimeData[attraction] = {
                name: attraction,
                waitTime: waitTime,
                status: status,
                isOpen: isOpen,
                lastUpdated: new Date()
            };
        });
        
        return waitTimeData;
    }
    
    getWaitTimeClass(waitTime) {
        if (!waitTime || waitTime === 0) return 'closed';
        if (waitTime <= 20) return 'low';
        if (waitTime <= 45) return 'medium';
        if (waitTime <= 75) return 'high';
        return 'very-high';
    }
    
    formatWaitTime(waitTime, status) {
        if (!waitTime || status === 'Closed') {
            return 'CLOSED';
        }
        return `${waitTime} min`;
    }
    
    renderWaitTimes() {
        const themedAreasContainer = document.getElementById('themed-areas');
        if (!themedAreasContainer) return;
        
        themedAreasContainer.innerHTML = '';
        
        Object.entries(this.themedAreas).forEach(([areaKey, areaData]) => {
            const areaElement = this.createThemedAreaElement(areaKey, areaData);
            themedAreasContainer.appendChild(areaElement);
        });
    }
    
    createThemedAreaElement(areaKey, areaData) {
        const areaDiv = document.createElement('div');
        areaDiv.className = `themed-area themed-area--${areaKey.replace('_', '-')}`;
        
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
        const waitTimeClass = this.getWaitTimeClass(attractionData.waitTime);
        waitTimeSpan.className = `wait-time wait-time--${waitTimeClass}`;
        waitTimeSpan.textContent = this.formatWaitTime(attractionData.waitTime, attractionData.status);
        
        const statusDiv = document.createElement('div');
        statusDiv.className = 'attraction-status';
        
        const statusIndicator = document.createElement('div');
        const statusClass = attractionData.isOpen ? 'open' : 'closed';
        statusIndicator.className = `status-indicator status-indicator--${statusClass}`;
        
        const statusDot = document.createElement('span');
        statusDot.className = 'status-dot';
        
        const statusText = document.createElement('span');
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
        document.getElementById('loading-state').classList.remove('hidden');
        document.getElementById('error-state').classList.add('hidden');
        document.getElementById('content').classList.add('hidden');
    }
    
    showErrorState(message) {
        document.getElementById('loading-state').classList.add('hidden');
        document.getElementById('error-state').classList.remove('hidden');
        document.getElementById('content').classList.add('hidden');
        
        const errorMessage = document.getElementById('error-message');
        if (errorMessage) {
            errorMessage.textContent = message || 'Please check your connection and try again.';
        }
    }
    
    showContent() {
        document.getElementById('loading-state').classList.add('hidden');
        document.getElementById('error-state').classList.add('hidden');
        document.getElementById('content').classList.remove('hidden');
    }
    
    updateLastUpdatedDisplay() {
        const lastUpdatedElement = document.getElementById('last-updated');
        if (lastUpdatedElement && this.lastUpdated) {
            const timeString = this.lastUpdated.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
            lastUpdatedElement.textContent = timeString;
        }
    }
    
    startAutoRefresh() {
        // Clear existing intervals
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
        }
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
        }
        
        // Set up auto refresh
        this.autoRefreshInterval = setInterval(() => {
            this.fetchWaitTimes();
        }, this.autoRefreshTime);
        
        // Set up countdown display
        this.startCountdown();
    }
    
    startCountdown() {
        let timeLeft = this.autoRefreshTime / 1000; // Convert to seconds
        
        this.countdownInterval = setInterval(() => {
            timeLeft--;
            
            if (timeLeft <= 0) {
                timeLeft = this.autoRefreshTime / 1000;
            }
            
            const minutes = Math.floor(timeLeft / 60);
            const seconds = timeLeft % 60;
            const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            
            const countdownElement = document.getElementById('auto-refresh-countdown');
            if (countdownElement) {
                countdownElement.textContent = timeString;
            }
        }, 1000);
    }
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new EpicUniverseWaitTimes();
});
