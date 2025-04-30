const { storeRecord } = require('./airtable-integration');

// Ensure the featureFlags object exists
const featureFlags = global.featureFlags || {};

// Ensure the inputCollection flag is defined
if (featureFlags.inputCollection === undefined) {
  console.warn('`inputCollection` feature flag is not defined; defaulting to false.');
  featureFlags.inputCollection = false;
}
async function storeContent(content) {
  const record = await storeRecord('ContentTable', {
    title: content.title,
    body: content.body,
    createdAt: new Date().toISOString()
  });
  return record.id;
}

const axios = require('axios');

const fetchRSSFeed = async () => {
  const rssFeedUrl = process.env.RSS_FEED_URL || 'https://example.com/rss-feed';
  try {
    const response = await axios.get(rssFeedUrl);
    return response.data;
  } catch (error) {
    console.error(`Failed to fetch RSS feed from ${rssFeedUrl}:`, error);
    throw new Error(`Failed to fetch RSS feed: ${error.message}`);
  }
};
