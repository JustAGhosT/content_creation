import { NextResponse } from 'next/server';
import { Errors } from '../_utils/errors';
import { isAuthenticated } from '../_utils/auth';
import { createLogEntry, logToAuditTrail } from '../_utils/audit';
import { validateString } from '../_utils/validation';

// Import feature flags
import featureFlags from '../../../utils/featureFlags';

// Interface for feedback data
interface Feedback {
  reviewId: string;
  feedback: string;
}

// Type guard for Error objects
function isError(error: unknown): error is Error {
  return error instanceof Error || (typeof error === 'object' && 
         error !== null && 'message' in error);
}
// Mock functions for feedback storage
// In a real implementation, these would interact with your database
async function saveFeedback({ reviewId, feedback }: Feedback): Promise<void> {
  console.log('Saving feedback:', { reviewId, feedback });
  // In a real implementation, you would save to a database
  // For example: await db.collection('feedback').insertOne({ reviewId, feedback, createdAt: new Date() });
}

async function getFeedback(filter: Partial<Feedback>): Promise<Feedback[]> {
  console.log('Getting feedback with filter:', filter);
  // In a real implementation, you would query your database
  // For now, return mock data
  return [
    { reviewId: '123', feedback: 'Great content!' },
    { reviewId: '456', feedback: 'Could use improvement.' }
  ].filter(item => 
    (!filter.reviewId || item.reviewId === filter.reviewId) &&
    (!filter.feedback || item.feedback.includes(filter.feedback))
  );
}

/**
 * Validates feedback submission data
 * @param reviewId The review ID to validate
 * @param feedback The feedback text to validate
 * @returns Error response if validation fails, null otherwise
 */
function validateFeedbackData(reviewId: unknown, feedback: unknown): NextResponse | null {
  const reviewIdError = validateString(reviewId, 'Review ID');
  if (reviewIdError) {
    return Errors.badRequest(reviewIdError) as NextResponse;
  }
    
  const feedbackError = validateString(feedback, 'Feedback');
  if (feedbackError) {
    return Errors.badRequest(feedbackError) as NextResponse;
  }
    
  return null;
}

/**
 * Processes feedback submission
 * @param reviewId The review ID
 * @param feedback The feedback text
 * @returns Response object with the result
 */
async function processFeedbackSubmission(reviewId: string, feedback: string): Promise<NextResponse> {
  try {
    // Log the feedback submission
    await logToAuditTrail(await createLogEntry('SUBMIT_FEEDBACK', { 
      reviewId,
      feedbackLength: feedback.length
    }));
    
    // Save the feedback
    await saveFeedback({ reviewId, feedback });
    
    // Return success response
    return NextResponse.json({ 
      message: 'Feedback submitted successfully',
      reviewId
    });
  } catch (error) {
    console.error('Error submitting feedback:', error);
    
    // Log feedback submission failure
    const errorMessage = isError(error) ? error.message : 'Unknown error';
    await logToAuditTrail(await createLogEntry('SUBMIT_FEEDBACK_FAILURE', { 
      error: error instanceof Error ? error.message : String(error)
    }));
    
    return Errors.internalServerError('Failed to submit feedback') as NextResponse;
  }
}

/**
 * Retrieves feedback based on filter criteria
 * @param url URL object containing query parameters
 * @returns Response object with the feedback data
 */
async function retrieveFeedback(url: URL): Promise<NextResponse> {
  try {
    // Get query parameters
    const reviewId = url.searchParams.get('reviewId');
    
    // Create filter based on query parameters
    const filter: Partial<Feedback> = {};
    if (reviewId) {
      filter.reviewId = reviewId;
    }
    
    // Log the feedback retrieval request
    await logToAuditTrail(await createLogEntry('GET_FEEDBACK', { filter }));
    
    // Get the feedback
    const feedbackItems = await getFeedback(filter);
    
    // Return the feedback items
    return NextResponse.json(feedbackItems);
  } catch (error) {
    console.error('Error retrieving feedback:', error);
    
    // Log feedback retrieval failure
    const errorMessage = isError(error) ? error.message : 'Unknown error';
    await logToAuditTrail(await createLogEntry('GET_FEEDBACK_FAILURE', { 
      error: errorMessage
    }));
    
    return Errors.internalServerError('Failed to retrieve feedback') as NextResponse;
  }
}

/**
 * Check if the feedback mechanism feature is enabled
 * @returns Error response if feature is disabled, null otherwise
 */
function checkFeedbackFeatureEnabled(): NextResponse | null {
  if (!featureFlags.feedbackMechanism) {
    return Errors.forbidden('Feedback mechanism feature is disabled') as NextResponse;
  }
  return null;
}

// Submit feedback endpoint
export async function POST(request: Request) {
  try {
    // Check if feedback mechanism feature is enabled
    const featureCheckError = checkFeedbackFeatureEnabled();
    if (featureCheckError) return featureCheckError;
  
    // Parse and validate request body
    const body = await request.json();
    const { reviewId, feedback } = body;
  
    // Validate input
    const validationError = validateFeedbackData(reviewId, feedback);
    if (validationError) return validationError;
  
    // Process the feedback submission
    return processFeedbackSubmission(reviewId, feedback);
  } catch (error) {
    console.error('Error in POST feedback:', error);
    return Errors.internalServerError('Failed to process feedback submission');
  }
}
// Get feedback endpoint
export async function GET(request: Request) {
  try {
    // Check authentication for retrieving feedback
    if (!(await isAuthenticated())) {
      return Errors.unauthorized('Authentication required to retrieve feedback') as NextResponse;
    }
  
    // Check if feedback mechanism feature is enabled
    const featureCheckError = checkFeedbackFeatureEnabled();
    if (featureCheckError) return featureCheckError;
  
    // Get the URL for query parameters
    const url = new URL(request.url);
  
    // Retrieve feedback based on query parameters
    return retrieveFeedback(url);
  } catch (error) {
    console.error('Error in GET feedback:', error);
    return Errors.internalServerError('Failed to retrieve feedback');
  }
}
