const featureFlags = global.featureFlags || {};

router.post('/analyze', async (req, res) => {
  try {
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
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({
      error: 'Failed to analyze text',
      details: process.env.NODE_ENV !== 'production' ? error.message : undefined,
      service: (global.featureFlags || {})?.textParser?.implementation
    });
  }
});

router.post('/parse', async (req, res) => {
  try {
    const { rawInput } = req.body;

    if (!rawInput || typeof rawInput !== 'string') {
      return res.status(400).json({ error: 'Invalid input: rawInput must be a non-empty string' });
    }

    // Optional: Add size limit validation
    if (rawInput.length > 1000000) { // 1MB limit example
      return res.status(413).json({ error: 'Input too large' });
    }

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
    console.error('Parse error:', error);
    let status = 500;
    let message = 'Failed to parse text';

    if (error.response) {
      status = error.response.status || 500;
      message = error.response.data?.error || error.response.statusText || message;
    } else if (error.request) {
      message = 'No response received from upstream service';
    } else if (error.message) {
      message = error.message;
    }

    res.status(status).json({
      error: message,
      details: process.env.NODE_ENV !== 'production' ? error.message : undefined,
      service: featureFlags?.textParser?.implementation
    });
  }
});
