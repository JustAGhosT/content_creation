import express, { Request, Response, NextFunction } from 'express';
import { saveFeedback, getFeedback, Feedback } from './data-persistence';

const router = express.Router();

// Use the Feedback interface directly from data-persistence
type FeedbackItem = Feedback;

// Endpoint to submit feedback
router.post('/submit-feedback', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { reviewId, feedback }: Feedback = req.body;

  // Validate input
  if (!reviewId || !feedback) {
    res.status(400).json({ message: 'reviewId and feedback are required' });
    return;
  }

  try {
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
    const feedbackItems: FeedbackItem[] = await getFeedback(reviewId ? { reviewId: reviewId as string } : {});
    res.status(200).json(feedbackItems);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving feedback', error: (error as Error).message });
  }
});

export default router;