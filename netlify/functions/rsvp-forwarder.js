// netlify/functions/rsvp-forwarder.js
// No crypto module needed for Header Auth
// const crypto = require('crypto');
const fetch = require('node-fetch');

// IMPORTANT: This secret MUST match the secret configured in your n8n Webhook trigger!
// It's securely pulled from Netlify's environment variables at runtime.
const N8N_WEBHOOK_SECRET = process.env.N8N_WEBHOOK_SECRET;

// IMPORTANT: This is the EXACT URL of your n8n Webhook trigger.
// Ensure it is HTTPS and the full URL including the unique ID.
const N8N_WEBHOOK_URL = 'https://myn8n.brightonhovedrumlessons.uk/webhook/059e80f4-f0b6-4e1e-ae86-5d67195bbbf4'; // <--- **REPLACE WITH YOUR ACTUAL N8N WEBHOOK URL**

// IMPORTANT: This header name MUST match the "Header Name" configured in your n8n Webhook trigger's Header Auth settings.
const N8N_AUTH_HEADER_NAME = 'X-API-KEY'; // <--- **REPLACE IF YOUR N8N HEADER NAME IS DIFFERENT**

exports.handler = async (event, context) => {
    // Ensure it's a POST request
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ message: 'Method Not Allowed' }),
        };
    }

    // Ensure the N8N_WEBHOOK_SECRET is set
    if (!N8N_WEBHOOK_SECRET) {
        console.error('N8N_WEBHOOK_SECRET environment variable is not set!');
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Server configuration error.' }),
        };
    }
    
    let requestBody;
    try {
        // Parse the incoming JSON body from the frontend form
        requestBody = JSON.parse(event.body);
    } catch (error) {
        console.error('Failed to parse request body:', error);
        return {
            statusCode: 400,
            body: JSON.stringify({ message: 'Bad Request - Invalid JSON' }),
        };
    }

    // --- Server-Side Validation (Optional but Recommended) ---
    // Still good to have basic validation here before forwarding
    if (requestBody.attendance === 'yes' && (!requestBody.attendees || requestBody.attendees.trim() === '')) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: 'Names of attending guests are required if attending.' }),
        };
    }
    if (requestBody.attendance === 'yes' && (!requestBody.address || requestBody.address.trim() === '')) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: 'Mailing address is required if attending.' }),
        };
    }
    // Add more validation as needed

    // Re-stringify the body to send it as JSON to n8n
    const payloadToSend = JSON.stringify(requestBody);

    // Forward the request to n8n with the Secret Key directly in a header
    try {
        const headers = {
            'Content-Type': 'application/json',
            // Add the authentication header with the secret value
            [N8N_AUTH_HEADER_NAME]: N8N_WEBHOOK_SECRET, 
        };

        const response = await fetch(N8N_WEBHOOK_URL, {
            method: 'POST',
            headers: headers,
            body: payloadToSend,
        });

        // Check if n8n responded with an OK status (2xx)
        if (!response.ok) {
            console.error(`Error forwarding to n8n: ${response.status} ${response.statusText}`);
            const errorBody = await response.text();
            console.error('n8n error response:', errorBody);

            // Return a generic error to the client
            return {
                statusCode: 500,
                body: JSON.stringify({ message: 'Internal server error while processing RSVP (n8n issue).' }),
            };
        }

        const n8nResponse = await response.json(); 
        console.log('Successfully forwarded to n8n:', n8nResponse);

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'RSVP submitted successfully!' }),
        };

    } catch (error) {
        console.error('Network or forwarding error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Internal server error (network/function issue).' }),
        };
    }
};