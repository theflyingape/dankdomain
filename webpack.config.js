const path = require('path');

module.exports = {
  mode: 'production',
  entry: './game/portal/client.js', // The starting point for the bundle
  output: {
    path: path.resolve(__dirname, 'game/portal/static'), // The output directory (creates a 'dist' folder)
    filename: 'bundle.js', // The name of the bundled file
  },
};
