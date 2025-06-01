document.addEventListener('DOMContentLoaded', () => {
    // ... (other variables remain the same) ...
    const parksDropdown = document.getElementById('parksDropdown');
    const loadTimesButton = document.getElementById('loadTimesButton');
    const timesContainer = document.getElementById('timesContainer');
    const parkNameHeader = document.getElementById('parkNameHeader');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const errorDisplay = document.getElementById('errorDisplay');

    const API_BASE_URL = 'https://queue-times.com/en-US';
    const PROXY_URL = 'https://corsproxy.io/?url='; // Define the proxy URL

    // Function to show loading state
    function showLoading(isLoading) {
        loadingIndicator.style.display = isLoading ? 'block' : 'none';
        errorDisplay.style.display = 'none'; // Hide error when loading
    }

    // Function to display errors
    function displayError(message) {
        errorDisplay.textContent = message;
        errorDisplay.style.display = 'block';
        timesContainer.innerHTML = ''; // Clear previous times
        parkNameHeader.textContent = '';
    }

    // Fetch and populate parks
    async function fetchParks() {
        showLoading(true);
        try {
            // Prepend the PROXY_URL to your API endpoint
            const response = await fetch(`${PROXY_URL}${API_BASE_URL}/parks.json`);
            if (!response.ok) {
                // Try to get more specific error info if possible
                let errorText = `HTTP error! Status: ${response.status}`;
                try {
                    const errorData = await response.json(); // Or .text() if not JSON
                    errorText += ` - ${errorData.message || JSON.stringify(errorData)}`;
                } catch (e) { /* Ignore if response body can't be parsed */ }
                throw new Error(errorText + ` - Could not fetch parks via proxy.`);
            }
            const parks = await response.json();

            parksDropdown.innerHTML = '<option value="">-- Select a Park --</option>'; // Reset
            parks.forEach(park => {
                const option = document.createElement('option');
                option.value = park.id;
                option.textContent = `${park.name} (${park.country})`;
                parksDropdown.appendChild(option);
            });
            loadTimesButton.disabled = true; // Disabled until a park is selected
        } catch (error) {
            console.error('Error fetching parks:', error);
            displayError(`Failed to load parks: ${error.message}`);
            parksDropdown.innerHTML = '<option value="">Error loading parks</option>';
        } finally {
            showLoading(false);
        }
    }

    // Fetch and display queue times for a selected park
    async function fetchQueueTimes(parkId, parkName) {
        if (!parkId) return;

        showLoading(true);
        timesContainer.innerHTML = '<p>Loading wait times...</p>';
        parkNameHeader.textContent = `Wait Times for ${parkName}`;

        try {
            // Prepend the PROXY_URL to your API endpoint
            const response = await fetch(`${PROXY_URL}${API_BASE_URL}/parks/${parkId}/queue_times.json`);
            if (!response.ok) {
                let errorText = `HTTP error! Status: ${response.status}`;
                try {
                    const errorData = await response.json(); // Or .text() if not JSON
                    errorText += ` - ${errorData.message || JSON.stringify(errorData)}`;
                } catch (e) { /* Ignore if response body can't be parsed */ }
                throw new Error(errorText + ` - Could not fetch queue times via proxy.`);
            }
            const data = await response.json();

            // ... (the rest of your fetchQueueTimes function remains the same to display data) ...
            timesContainer.innerHTML = ''; // Clear previous content

            if (data.lands && data.lands.length > 0) {
                data.lands.forEach(land => {
                    const landDiv = document.createElement('div');
                    landDiv.classList.add('land');

                    const landTitle = document.createElement('h3');
                    landTitle.textContent = land.name || 'Unnamed Land';
                    landDiv.appendChild(landTitle);

                    if (land.rides && land.rides.length > 0) {
                        land.rides.forEach(ride => {
                            const rideDiv = document.createElement('div');
                            rideDiv.classList.add('ride');

                            const rideName = document.createElement('span');
                            rideName.classList.add('ride-name');
                            rideName.textContent = ride.name || 'Unnamed Ride';

                            const rideWaitTime = document.createElement('span');
                            rideWaitTime.textContent = `: ${ride.wait_time} minutes - `;

                            const rideStatus = document.createElement('span');
                            rideStatus.textContent = ride.is_open ? 'Open' : 'Closed';
                            rideStatus.classList.add(ride.is_open ? 'ride-status-open' : 'ride-status-closed');

                            rideDiv.appendChild(rideName);
                            rideDiv.appendChild(rideWaitTime);
                            rideDiv.appendChild(rideStatus);
                            landDiv.appendChild(rideDiv);
                        });
                    } else {
                        const noRidesP = document.createElement('p');
                        noRidesP.textContent = 'No ride information available for this land.';
                        landDiv.appendChild(noRidesP);
                    }
                    timesContainer.appendChild(landDiv);
                });
            } else if (data.rides && data.rides.length > 0) {
                // Fallback if lands structure isn't present but flat rides list is
                const ridesTitle = document.createElement('h3');
                ridesTitle.textContent = 'All Rides';
                timesContainer.appendChild(ridesTitle);

                data.rides.forEach(ride => {
                     const rideDiv = document.createElement('div');
                    rideDiv.classList.add('ride');

                    const rideName = document.createElement('span');
                    rideName.classList.add('ride-name');
                    rideName.textContent = ride.name || 'Unnamed Ride';

                    const rideWaitTime = document.createElement('span');
                    rideWaitTime.textContent = `: ${ride.wait_time} minutes - `;

                    const rideStatus = document.createElement('span');
                    rideStatus.textContent = ride.is_open ? 'Open' : 'Closed';
                    rideStatus.classList.add(ride.is_open ? 'ride-status-open' : 'ride-status-closed');

                    rideDiv.appendChild(rideName);
                    rideDiv.appendChild(rideWaitTime);
                    rideDiv.appendChild(rideStatus);
                    timesContainer.appendChild(rideDiv);
                });
            } else {
                timesContainer.innerHTML = '<p>No queue time information available for this park currently.</p>';
            }

        } catch (error) {
            console.error('Error fetching queue times:', error);
            displayError(`Failed to load queue times: ${error.message}`);
            parkNameHeader.textContent = `Could not load times for ${parkName}`;
        } finally {
            showLoading(false);
        }
    }

    // Event Listeners (remain the same)
    parksDropdown.addEventListener('change', () => {
        if (parksDropdown.value) {
            loadTimesButton.disabled = false;
        } else {
            loadTimesButton.disabled = true;
            timesContainer.innerHTML = '<p>Please select a park and click "Load Wait Times".</p>';
            parkNameHeader.textContent = '';
            errorDisplay.style.display = 'none';
        }
    });

    loadTimesButton.addEventListener('click', () => {
        const selectedParkId = parksDropdown.value;
        const selectedParkName = parksDropdown.options[parksDropdown.selectedIndex].text;
        if (selectedParkId) {
            fetchQueueTimes(selectedParkId, selectedParkName);
        }
    });

    // Initial load of parks
    fetchParks();
});
