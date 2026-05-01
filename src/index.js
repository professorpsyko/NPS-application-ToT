// src/index.js
// Entry point for Azure Functions v4. Each require() registers HTTP handlers.

require('./functions/webhook');
require('./functions/respond');
require('./functions/thankyou');
require('./functions/logos');
require('./functions/health');
