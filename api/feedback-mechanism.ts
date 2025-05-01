import express, { Request, Response, NextFunction } from 'express';
import { saveFeedback, getFeedback, Feedback } from './data-persistence';

const router = express.Router();

// Use the Feedback interface directly from data-persistence
type FeedbackItem = Feedback;

/**
 * Validates that a value is a non-empty string
 * @param value The value to validate
 * @param fieldName The name of the field (for error messages)
 * @returns An error message if invalid, undefined if valid
 */
function validateString(value: unknown, fieldName: string): string | undefined {
  if (value === undefined || value === null) {
    return `${fieldName} is required`;
  }
  if (typeof value !== 'string') {
    return `${fieldName} must be a string`;
  }
  if (!value.trim()) {
    return `${fieldName} cannot be empty`;
  }
  return undefined;
}

// Endpoint to submit feedback
router.post('/submit-feedback', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { reviewId, feedback } = req.body;

  // Validate input using the helper function
  const reviewIdError = validateString(reviewId, 'reviewId');
  if (reviewIdError) {
    res.status(400).json({ message: reviewIdError });
    return;
  }

  const feedbackError = validateString(feedback, 'feedback');
  if (feedbackError) {
    res.status(400).json({ message: feedbackError });
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

  // Validate reviewId if provided
  if (reviewId !== undefined) {
    const reviewIdError = validateString(reviewId, 'reviewId');
    if (reviewIdError) {
      res.status(400).json({ message: reviewIdError });
      return;
    }
  }

  try {
    // After validation, we know reviewId is a string if it exists
    const feedbackItems: FeedbackItem[] = await getFeedback(
      reviewId !== undefined ? { reviewId: reviewId as string } : {}
    );
    res.status(200).json(feedbackItems);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving feedback', error: (error as Error).message });
  }
});

export default router;