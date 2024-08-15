const express = require('express');
const axios = require('axios');  // Use axios for HTTP requests
const app = express();
const cors = require('cors');  // Make sure to install the cors package

const PORT = 3000;

// Environment-specific Chrome extension IDs
const dev_veraExtensionId = "bfkfhikdfdbnnipjihchlakomcknjcfc"
const prod_veraExtensionId = "bambbpbjdmhjpkmbkgnhkeabeplgnjoa"

// Set up CORS to allow your Chrome extension to interact with the server

app.use(cors({
    origin: function (origin, callback) {
        const allowedOrigins = [`chrome-extension://${dev_veraExtensionId}`, `chrome-extension://${prod_veraExtensionId}`];
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    }
}));

app.use(express.json());

app.get('/api/search', async (req, res) => {
    const { quote } = req.query;
    const baseUrl = 'https://serpapi.com/search.json';
    const params = new URLSearchParams({
        q: quote,
        tbm: "nws",
        api_key: '650fff0e2d9fa913680d78b803940d8ad3a1465260e0ab540a016fd7d9ae0155',  // Use environment variable for the API key
        location: "United States"
    });

    try {
        const response = await axios.get(`${baseUrl}?${params}`);
        console.log(`Sending response for -- ${baseUrl}?${params}`);

        res.send(response.data);
    } catch (error) {
        console.error('Failed to fetch data:', error);
        res.status(500).send('Server error');
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://52.15.34.155:${PORT}`);
});
