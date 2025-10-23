// backend/server.js (à héberger sur Heroku, Railway, etc.)
const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const DISCORD_CONFIG = {
    clientId: '1295800610397880392',
    clientSecret: 'aOuDz8OoSxUq22tcpE-KYi4spFoZthbw', // ✅ Sécurisé côté serveur
    redirectUri: 'https://louisoff84.github.io/craftpick.fr/login-register.html'
};

// Endpoint pour échanger le code contre un token
app.post('/auth/discord', async (req, res) => {
    const { code } = req.body;

    try {
        // Échanger le code contre un access_token
        const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: DISCORD_CONFIG.clientId,
                client_secret: DISCORD_CONFIG.clientSecret,
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: DISCORD_CONFIG.redirectUri
            })
        });

        const { access_token } = await tokenResponse.json();

        // Récupérer les infos utilisateur
        const userResponse = await fetch('https://discord.com/api/users/@me', {
            headers: { Authorization: `Bearer ${access_token}` }
        });

        const userData = await userResponse.json();

        res.json({
            success: true,
            user: {
                id: userData.id,
                username: userData.username,
                discriminator: userData.discriminator,
                avatar: userData.avatar,
                email: userData.email
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.listen(3000, () => console.log('Backend running on port 3000'));
