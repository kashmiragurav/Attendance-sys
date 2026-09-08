// Google Maps Geocoding Service
// Provides detailed address information from coordinates

const GOOGLE_MAPS_API_KEY = 'YOUR_API_KEY_HERE'; // Replace with your actual API key

/**
 * Get detailed address from coordinates using Google Maps Geocoding API
 * @param {number} latitude - Latitude coordinate
 * @param {number} longitude - Longitude coordinate
 * @returns {Promise<Object>} Detailed address information
 */
export const getDetailedAddress = async (latitude, longitude) => {
    try {
        const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}&language=en`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.status === 'OK' && data.results && data.results.length > 0) {
            const result = data.results[0];

            // Extract detailed address components
            const addressComponents = {};
            result.address_components.forEach(component => {
                const types = component.types;
                if (types.includes('premise') || types.includes('establishment')) {
                    addressComponents.buildingName = component.long_name;
                }
                if (types.includes('subpremise')) {
                    addressComponents.floor = component.long_name;
                }
                if (types.includes('street_number')) {
                    addressComponents.streetNumber = component.long_name;
                }
                if (types.includes('route')) {
                    addressComponents.street = component.long_name;
                }
                if (types.includes('sublocality_level_2') || types.includes('sublocality_level_1')) {
                    addressComponents.locality = component.long_name;
                }
                if (types.includes('locality')) {
                    addressComponents.city = component.long_name;
                }
                if (types.includes('administrative_area_level_1')) {
                    addressComponents.state = component.long_name;
                }
                if (types.includes('postal_code')) {
                    addressComponents.postalCode = component.long_name;
                }
                if (types.includes('country')) {
                    addressComponents.country = component.long_name;
                }
            });

            // Build formatted address
            const formattedParts = [];

            // Building/Establishment name (most important for identification)
            if (addressComponents.buildingName) {
                formattedParts.push(addressComponents.buildingName);
            }

            // Floor/Unit
            if (addressComponents.floor) {
                formattedParts.push(addressComponents.floor);
            }

            // Street number and name
            if (addressComponents.streetNumber && addressComponents.street) {
                formattedParts.push(`${addressComponents.streetNumber} ${addressComponents.street}`);
            } else if (addressComponents.street) {
                formattedParts.push(addressComponents.street);
            }

            // Locality/Neighborhood
            if (addressComponents.locality) {
                formattedParts.push(addressComponents.locality);
            }

            // City
            if (addressComponents.city) {
                formattedParts.push(addressComponents.city);
            }

            // State
            if (addressComponents.state) {
                formattedParts.push(addressComponents.state);
            }

            // Postal Code
            if (addressComponents.postalCode) {
                formattedParts.push(addressComponents.postalCode);
            }

            const formattedAddress = formattedParts.length > 0
                ? formattedParts.join(', ')
                : result.formatted_address;

            return {
                success: true,
                formattedAddress: formattedAddress,
                fullAddress: result.formatted_address, // Google's complete formatted address
                components: addressComponents,
                placeId: result.place_id,
                raw: result,
            };
        } else {
            console.log('Geocoding API error:', data.status);
            return {
                success: false,
                error: data.status,
                formattedAddress: null,
            };
        }
    } catch (error) {
        console.error('Error fetching detailed address:', error);
        return {
            success: false,
            error: error.message,
            formattedAddress: null,
        };
    }
};

/**
 * Get nearby places/landmarks from coordinates
 * @param {number} latitude - Latitude coordinate
 * @param {number} longitude - Longitude coordinate
 * @returns {Promise<Array>} Nearby places
 */
export const getNearbyPlaces = async (latitude, longitude) => {
    try {
        const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&radius=50&key=${GOOGLE_MAPS_API_KEY}`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.status === 'OK' && data.results && data.results.length > 0) {
            return {
                success: true,
                places: data.results.slice(0, 3).map(place => ({
                    name: place.name,
                    vicinity: place.vicinity,
                    types: place.types,
                })),
            };
        }

        return { success: false, places: [] };
    } catch (error) {
        console.error('Error fetching nearby places:', error);
        return { success: false, places: [] };
    }
};
