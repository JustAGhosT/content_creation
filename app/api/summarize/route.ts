import axios from 'axios';
import { NextResponse } from 'next/server';
import { createLogEntry, logToAuditTrail } from '../_utils/audit';
import { isAuthenticated } from '../_utils/auth';
import { Errors, withErrorHandling } from '../_utils/errors';
import { validateString } from '../_utils/validation';

// Import feature flags from utils
import featureFlags from '../../../utils/featureFlags';

// Helper function to get API configuration
const getApiConfig = () => {
  return {
    summarizationUrl: process.env.SUMMARIZATION_API_URL || 'https://api.summarization.ai/summarize',
    approvalUrl: process.env.APPROVAL_API_URL || 'https://api.summarization.ai/approve'
  } as const;
};

/**
 * Validates authentication and feature flag
 */
function validateAuthAndFeature() {
  if (!isAuthenticated()) {
    return Errors.unauthorized('Authentication required to summarize text');
  }
  
  if (!featureFlags.summarization) {
    return Errors.forbidden('Summarization feature is disabled');
  }
  
  return null;
}

/**
 * Validates the input text
 */
function validateInput(text: unknown, fieldName: string) {
  const textError = validateString(text, fieldName);
  if (textError) {
    return Errors.badRequest(textError);
  }
  return null;
}

/**
 * Logs an error and returns an error response
 */
async function handleError(error: unknown, action: string, message: string) {
  console.error(`${action} error:`, error);
  
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  
  // Log failure
  const logEntry = await createLogEntry(`${action}_FAILURE`, { 
    error: errorMessage
  });
  await logToAuditTrail(logEntry);
  
  return Errors.internalServerError(`Failed to ${message}`, {
    details: errorMessage
  });
}

/**
 * Calls the summarization API
 */
async function callSummarizationApi(rawText: string) {
  try {
    const apiConfig = getApiConfig();
    return await axios.post(apiConfig.summarizationUrl, { text: rawText });
  } catch (error) {
    throw error; // Re-throw to be handled by the caller
  }
}

/**
 * Calls the approval API
 */
async function callApprovalApi(summary: string) {
  try {
    const apiConfig = getApiConfig();
    return await axios.post(apiConfig.approvalUrl, { summary });
  } catch (error) {
    throw error; // Re-throw to be handled by the caller
  }
}

// Summarize text endpoint
export const POST = withErrorHandling(async (request: Request) => {
  // Check authentication and feature flag
  const authError = validateAuthAndFeature();
  if (authError) return authError;
  
  try {
    const body = await request.json();
    const { rawText } = body;
    
    // Validate input
    const inputError = validateInput(rawText, 'Raw text');
    if (inputError) return inputError;
    
    // Log the summarize request
    const requestLogEntry = await createLogEntry('SUMMARIZE_TEXT', { textLength: rawText.length });
    await logToAuditTrail(requestLogEntry);
    
    // Call the summarization API
    const response = await callSummarizationApi(rawText);
    
    // Log successful summarization
    const successLogEntry = await createLogEntry('SUMMARIZE_TEXT_SUCCESS', { 
      originalLength: rawText.length,
      summaryLength: response.data.summary?.length || 0
    });
    await logToAuditTrail(successLogEntry);
    
    // Return the summary
    return NextResponse.json(response.data);
  } catch (error) {
    return handleError(error, 'SUMMARIZE_TEXT', 'generate summary');
  }
});

// Approve summary endpoint
export const PUT = withErrorHandling(async (request: Request) => {
  // Check authentication
  if (!isAuthenticated()) {
    return Errors.unauthorized('Authentication required to approve summary');
  }
  
  try {
    const body = await request.json();
    const { summary } = body;
    
    // Validate input
    const inputError = validateInput(summary, 'Summary');
    if (inputError) return inputError;
    
    // Log the approve summary request
    const requestLogEntry = await createLogEntry('APPROVE_SUMMARY', { summaryLength: summary.length });
    await logToAuditTrail(requestLogEntry);
    
    // Call the approval API
    const response = await callApprovalApi(summary);
    
    // Log successful approval
    const successLogEntry = await createLogEntry('APPROVE_SUMMARY_SUCCESS');
    await logToAuditTrail(successLogEntry);
    
    // Return the approval result
    return NextResponse.json(response.data);
  } catch (error) {
    return handleError(error, 'APPROVE_SUMMARY', 'approve summary');
  }
});