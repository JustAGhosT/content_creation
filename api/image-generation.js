import { Router } from 'express';
const router = Router();
import { imageGeneration } from './feature-flags';
import HuggingFaceClient from './huggingface-client';

const huggingFaceClient = new HuggingFaceClient();

// Endpoint to generate image
router.post('/generate-image', async (req, res) => {
  if (!req.body || !req.body.context) {
    return res.status(400).json({ error: 'Context is required' });
  }
  const { context } = req.body;

  try {
    if (!imageGeneration) {
      return res
        .status(400)
        .json({ error: 'Image generation is not enabled' });
    }

    const response = await huggingFaceClient.generateImage(context);
    res.json(response);
  } catch (error) {
    console.error('Error generating image:', error);
    res.status(500).json({ error: 'Failed to generate image' });
  }
});

// Endpoint to approve image
router.post('/approve-image', async (req, res) => {
  const { image } = req.body;

  if (!image || typeof image !== 'object') {
    return res.status(400).json({ error: 'Invalid image data provided' });
  }

  try {
    const response = await huggingFaceClient.approveImage(image);
    res.json(response);
  } catch (error) {
    console.error('Error approving image:', error);
    const statusCode = error.response?.status || 500;
    const errorMessage = error.response?.data?.error || 'Failed to approve image';
    res.status(statusCode).json({ error: errorMessage });
  }
});

// Endpoint to reject image
router.post('/reject-image', async (req, res) => {
  const { image } = req.body;

  try {
    const response = await huggingFaceClient.rejectImage(image);
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: 'Failed to reject image' });
  }
});

// Endpoint to regenerate image
router.post('/regenerate-image', async (req, res) => {
  const { context } = req.body;

  try {
    const response = await huggingFaceClient.regenerateImage(context);
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: 'Failed to regenerate image' });
  }
});

// Endpoint to upload image
router.post('/upload-image', async (req, res) => {
  const { file } = req.body;

  try {
    const response = await huggingFaceClient.uploadImage(file);
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

// Endpoint to review image
router.post('/review-image', async (req, res) => {
  const { image, action } = req.body;

  try {
    let response;
    if (action === 'approve') {
      response = await huggingFaceClient.approveImage(image);
    } else if (action === 'reject') {
      response = await huggingFaceClient.rejectImage(image);
    } else if (action === 'regenerate') {
      response = await huggingFaceClient.regenerateImage(image.context);
    } else {
      return res.status(400).json({ error: 'Invalid action' });
    }
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: 'Failed to review image' });
  }
});

export default router;
