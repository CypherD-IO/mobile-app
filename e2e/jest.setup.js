const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env.test file
const envPath = path.join(__dirname, '.env.test');
dotenv.config({ path: envPath });