const fs = require('fs').promises;
const path = require('path');

// Data directory
const DATA_DIR = path.join(__dirname, 'data');

// Initialize data files
async function init() {
  try {
    // Ensure data directory exists
    await fs.mkdir(DATA_DIR, { recursive: true });

    // Initialize collections if they don't exist
    const collections = ['users', 'items', 'messages', 'sessions'];
    
    for (const collection of collections) {
      const filePath = path.join(DATA_DIR, `${collection}.json`);
      try {
        await fs.access(filePath);
      } catch {
        // File doesn't exist, create it with empty array
        await fs.writeFile(filePath, JSON.stringify([], null, 2));
      }
    }

    console.log('JSON database initialized successfully');
  } catch (err) {
    console.error('Failed to initialize JSON database:', err);
    throw err;
  }
}

// Generic data access functions
async function readCollection(name) {
  const filePath = path.join(DATA_DIR, `${name}.json`);
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error(`Error reading ${name}.json:`, err);
    return [];
  }
}

async function writeCollection(name, data) {
  const filePath = path.join(DATA_DIR, `${name}.json`);
  try {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(`Error writing ${name}.json:`, err);
    throw err;
  }
}

async function appendToCollection(name, item) {
  const data = await readCollection(name);
  data.push(item);
  await writeCollection(name, data);
  return item;
}

// Export utilities
module.exports = {
  init,
  readCollection,
  writeCollection,
  appendToCollection,
  DATA_DIR,
};
