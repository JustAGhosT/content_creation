import express, { Request, Response, NextFunction } from 'express';
import axios, { AxiosResponse } from 'axios';

const router = express.Router();
const featureFlags: { [key: string]: any } = global.featureFlags || {};

interface ParsedData {
  [key: string]: any;
}

interface AnalyzeRequest extends Request {
  body: {
    parsedData: ParsedData;
  };
}

interface ParseRequest extends Request {
  body: {
    rawInput: string;
  };
}

router.post('/analyze', async (req: AnalyzeRequest, res: Response) => {
  try {
    const { parsedData } = req.body;

    if (
      !parsedData ||
      typeof parsedData !== 'object' ||
      Array.isArray(parsedData)
    ) {
      return res.status(400).json({ error: 'Invalid input: parsedData must be a non-empty object' });
    }

    const keyCount = Object.keys(parsedData).length;
    const valueTypes: { [key: string]: string } = {};
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
      details: process.env.NODE_ENV !== 'production' ? (error as Error).message : undefined,
      service: featureFlags?.textParser?.implementation
    });
  }
});

router.post('/parse', async (req: ParseRequest, res: Response) => {
  try {
    const { rawInput } = req.body;

    if (!rawInput || typeof rawInput !== 'string') {
      return res.status(400).json({ error: 'Invalid input: rawInput must be a non-empty string' });
    }

    if (rawInput.length > 1000000) {
      return res.status(413).json({ error: 'Input too large' });
    }

    const parsedData = JSON.parse(rawInput);
    let response: AxiosResponse;

    if (!featureFlags?.textParser?.enabled) {
      return res.status(400).json({ error: 'Text parser feature is disabled' });
    }

    if (featureFlags.textParser.implementation === 'deepseek') {
      response = await axios.post(
        process.env.DEEPSEEK_API_ENDPOINT!,
        { data: parsedData }
      );
    } else if (featureFlags.textParser.implementation === 'openai') {
      response = await axios.post(
        process.env.OPENAI_API_ENDPOINT!,
        { data: parsedData }
      );
    } else if (featureFlags.textParser.implementation === 'azure') {
      response = await axios.post(
        process.env.AZURE_CONTENT_API_ENDPOINT!,
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

    if (axios.isAxiosError(error) && error.response) {
      status = error.response.status || 500;
      message = error.response.data?.error || error.response.statusText || message;
    } else if (axios.isAxiosError(error) && error.request) {
      message = 'No response received from upstream service';
    } else if (error instanceof Error) {
      message = error.message;
    }

    res.status(status).json({
      error: message,
      details: process.env.NODE_ENV !== 'production' ? error.message : undefined,
      service: featureFlags?.textParser?.implementation
    });
  }
});

export default router;
