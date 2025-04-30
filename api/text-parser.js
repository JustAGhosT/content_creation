router.post('/analyze', async (req, res) => {
  const { parsedData } = req.body;

  if (
    !parsedData ||
    typeof parsedData !== 'object' ||
    Array.isArray(parsedData)
  ) {
    return res.status(400).json({ error: 'Invalid input: parsedData must be a non-empty object' });
  }

  // Example analysis: count keys and value types
  const keyCount = Object.keys(parsedData).length;
  const valueTypes = {};
  for (const [key, value] of Object.entries(parsedData)) {
    valueTypes[key] = Array.isArray(value) ? 'array' : typeof value;
  }

  res.json({
    keyCount,
    valueTypes
  });
});

router.post('/parse', async (req, res) => {
  const { rawInput } = req.body;

  if (!rawInput || typeof rawInput !== 'string') {
    return res.status(400).json({ error: 'Invalid input: rawInput must be a non-empty string' });
  }

  // Optional: Add size limit validation
  if (rawInput.length > 1000000) { // 1MB limit example
    return res.status(413).json({ error: 'Input too large' });
  }

  try {
  // Simulate parsing JSON/XML to extract structured data
  const parsedData = JSON.parse(rawInput);
  let response;
  // Reject early if the text-parser feature is disabled
  if (!featureFlags.textParser.enabled) {
    return res.status(400).json({ error: 'Text parser feature is disabled' });
  }

    // Dispatch based on the enabled implementation
    if (featureFlags.textParser.implementation === 'deepseek') {
      response = await axios.post(
        process.env.DEEPSEEK_API_ENDPOINT,
        { data: parsedData }
      );
    } else if (featureFlags.textParser.implementation === 'openai') {
      response = await axios.post(
        process.env.OPENAI_API_ENDPOINT,
        { data: parsedData }
      );
    } else if (featureFlags.textParser.implementation === 'azure') {
      response = await axios.post(
        process.env.AZURE_CONTENT_API_ENDPOINT,
        { data: parsedData }
      );
    } else {
      return res.status(400).json({ error: 'Invalid text parser feature flag' });
    }
    res.json(response.data);
  } catch (error) {
    // Improved error handling
    let status = 500;
    let message = 'Failed to analyze text';

    if (error.response) {
      // The request was made and the server responded with a status code
      status = error.response.status || 500;
      message = error.response.data?.error || error.response.statusText || message;
    } else if (error.request) {
      // The request was made but no response was received
      message = 'No response received from upstream service';
    } else if (error.message) {
      // Something happened in setting up the request
      message = error.message;
    }

    res.status(status).json({
      error: message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});
