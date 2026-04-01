// netlify/functions/rsvp-forwarder.js
const fetch = require('node-fetch');

const N8N_WEBHOOK_SECRET = process.env.N8N_WEBHOOK_SECRET;
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;
const N8N_AUTH_HEADER_NAME = 'X-API-KEY';

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ message: 'Method Not Allowed' }) };
    }

    if (!N8N_WEBHOOK_SECRET) {
        console.error('N8N_WEBHOOK_SECRET environment variable is not set!');
        return { statusCode: 500, body: JSON.stringify({ message: 'Server configuration error.' }) };
    }

    let requestBody;
    try {
        requestBody = JSON.parse(event.body);
    } catch (error) {
        console.error('Failed to parse request body:', error);
        return { statusCode: 400, body: JSON.stringify({ message: 'Bad Request - Invalid JSON' }) };
    }

    if (!requestBody.guestName || requestBody.guestName.trim() === '') {
        return { statusCode: 400, body: JSON.stringify({ message: 'Guest name is required.' }) };
    }
    if (!requestBody.starter || requestBody.starter.trim() === '') {
        return { statusCode: 400, body: JSON.stringify({ message: 'A starter choice is required.' }) };
    }
    if (!requestBody.main || requestBody.main.trim() === '') {
        return { statusCode: 400, body: JSON.stringify({ message: 'A main course choice is required.' }) };
    }
    if (!requestBody.dessert || requestBody.dessert.trim() === '') {
        return { statusCode: 400, body: JSON.stringify({ message: 'A dessert choice is required.' }) };
    }

    const payloadToSend = JSON.stringify(requestBody);

    try {
        const headers = {
            'Content-Type': 'application/json',
            [N8N_AUTH_HEADER_NAME]: N8N_WEBHOOK_SECRET,
        };

        const response = await fetch(N8N_WEBHOOK_URL, {
            method: 'POST',
            headers: headers,
            body: payloadToSend,
        });

        if (!response.ok) {
            console.error(`Error forwarding to n8n: ${response.status} ${response.statusText}`);
            const errorBody = await response.text();
            console.error('n8n error response:', errorBody);
            return { statusCode: 500, body: JSON.stringify({ message: 'Internal server error while processing submission (n8n issue).' }) };
        }

        const n8nResponse = await response.json();
        console.log('Successfully forwarded to n8n:', n8nResponse);
        return { statusCode: 200, body: JSON.stringify({ message: 'Meal choices submitted successfully!' }) };

    } catch (error) {
        console.error('Network or forwarding error:', error);
        return { statusCode: 500, body: JSON.stringify({ message: 'Internal server error (network/function issue).' }) };
    }
};
