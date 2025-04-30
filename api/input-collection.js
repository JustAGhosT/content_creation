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