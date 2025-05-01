const express = require('express');
const router = express.Router();

// Endpoint to submit feedback
router.post('/submit-feedback', async (req, res) => {
  const { reviewId, feedback } = req.body;

  // Validate input
  if (!reviewId || !feedback) {
    return res.status(400).json({ message: 'reviewId and feedback are required' });
  }

  try {
    const { saveFeedback } = require('./data-persistence');
const { getFeedback } = require('./data-persistence');
    await saveFeedback({ reviewId, feedback });
    res.status(200).json({ message: 'Feedback submitted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error submitting feedback', error: error.message });
  }
});

// Endpoint to get feedback
router.get('/feedback', async (req, res) => {
  const { reviewId } = req.query;

  try {
    const feedbackItems: FeedbackItem[] = await getFeedback(reviewId ? { reviewId: reviewId as string } : {});
    res.status(200).json(feedbackItems);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving feedback', error: error.message });
  }
});

module.exports = router;
