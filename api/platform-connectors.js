const express = require('express');
const router = express.Router();
const axios = require('axios');

// Mock data for platforms
const platforms = [
  { id: 1, name: 'Facebook' },
  { id: 2, name: 'Instagram' },
  { id: 3, name: 'LinkedIn' },
  { id: 4, name: 'Twitter' },
  { id: 5, name: 'Custom Channel' }
];

// Endpoint to get available platforms
router.get('/platforms', (req, res) => {
  res.json(platforms);
});

// Endpoint to approve pre-publishing queue
router.post('/approve-queue', async (req, res) => {
  const { queue } = req.body;

  try {
    // Simulate publishing to each platform
    for (const item of queue) {
      await axios.post(`https://api.${item.platform.name.toLowerCase()}.com/publish`, {
        content: item.content
      });
    }

    res.status(200).json({ message: 'Queue approved and published successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error publishing queue', error: error.message });
  }
});

module.exports = router;
