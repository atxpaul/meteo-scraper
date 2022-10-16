import dotenv from 'dotenv';
dotenv.config();
const config = {
    url: process.env.WEATHER_URL,
    headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
    },
};

export default config;
