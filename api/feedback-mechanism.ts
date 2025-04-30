import express, { Request, Response, NextFunction } from 'express';
const router = express.Router();

interface Feedback {
  reviewId: string;
  feedback: string;
}

// Use the Feedback interface directly, or create a type alias if needed
type FeedbackItem = Feedback;

interface SaveFeedback {
  (feedback: Feedback): Promise<void>;
}

interface GetFeedback {
  (filter: Partial<Feedback>): Promise<FeedbackItem[]>;
}

// Endpoint to submit feedback
router.post('/submit-feedback', async (req: Request, res: Response, next: NextFunction) => {
  const { reviewId, feedback }: Feedback = req.body;

  // Validate input
  if (!reviewId || !feedback) {
    return res.status(400).json({ message: 'reviewId and feedback are required' });
  }

  try {
    const { saveFeedback }: { saveFeedback: SaveFeedback } = require('./data-persistence');
    await saveFeedback({ reviewId, feedback });
    res.status(200).json({ message: 'Feedback submitted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error submitting feedback', error: (error as Error).message });
  }
});

// Endpoint to get feedback
router.get('/feedback', async (req: Request, res: Response, next: NextFunction) => {
  const { reviewId } = req.query;

  try {
    const { getFeedback }: { getFeedback: GetFeedback } = require('./data-persistence');
    const feedbackItems: FeedbackItem[] = await getFeedback(reviewId ? { reviewId: reviewId as string } : {});
    res.status(200).json(feedbackItems);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving feedback', error: (error as Error).message });
  }
});

export default router;
