import { NextResponse } from 'next/server';
import { withErrorHandling, Errors } from '../_utils/errors';
import { isAuthenticated } from '../_utils/auth';
import { createLogEntry, logToAuditTrail } from '../_utils/audit';
import { validateString } from '../_utils/validation';
import axios from 'axios';

// Import feature flags
// Note: Adjust the import path as needed for your project structure
import featureFlags from '../../../utils/featureFlags';

// Helper function to get API configuration
const getApiConfig = () => {
  return {
    summarizationUrl: process.env.SUMMARIZATION_API_URL || 'https://api.summarization.ai/summarize',
    approvalUrl: process.env.APPROVAL_API_URL || 'https://api.summarization.ai/approve'
  };
};

// Summarize text endpoint
export const POST = withErrorHandling(async (request: Request) => {
  // Check authentication
  if (!isAuthenticated()) {
    return Errors.unauthorized('Authentication required to summarize text');
  }
  
  // Check if summarization feature is enabled
  if (!featureFlags.summarization) {
    return Errors.forbidden('Summarization feature is disabled');
  }
  
  try {
    const body = await request.json();
    const { rawText } = body;
    
    // Validate input
    const textError = validateString(rawText, 'Raw text');
    if (textError) {
      return Errors.badRequest(textError);
    }
    
    // Log the summarize request
    await logToAuditTrail(createLogEntry('SUMMARIZE_TEXT', { textLength: rawText.length }));
    
    // Use the centralized API configuration
    const apiConfig = getApiConfig();
    
    // Call the summarization API
    const response = await axios.post(apiConfig.summarizationUrl, { text: rawText });
    
    // Log successful summarization
    await logToAuditTrail(createLogEntry('SUMMARIZE_TEXT_SUCCESS', { 
      originalLength: rawText.length,
      summaryLength: response.data.summary?.length || 0
    }));
    
    // Return the summary
    return NextResponse.json(response.data);
  } catch (error) {
    console.error('Summarization API error:', error);
    
    // Log summarization failure
    await logToAuditTrail(createLogEntry('SUMMARIZE_TEXT_FAILURE', { 
      error: (error as Error).message
    }));
    
    return Errors.internalServerError('Failed to generate summary', {
      details: (error as Error).message
    });
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
    const summaryError = validateString(summary, 'Summary');
    if (summaryError) {
      return Errors.badRequest(summaryError);
    }
    
    // Log the approve summary request
    await logToAuditTrail(createLogEntry('APPROVE_SUMMARY', { summaryLength: summary.length }));
    
    // Use the centralized API configuration
    const apiConfig = getApiConfig();
    
    // Call the approval API
    const response = await axios.post(apiConfig.approvalUrl, { summary });
    
    // Log successful approval
    await logToAuditTrail(createLogEntry('APPROVE_SUMMARY_SUCCESS'));
    
    // Return the approval result
    return NextResponse.json(response.data);
  } catch (error) {
    console.error('Summary approval API error:', error);
    
    // Log approval failure
    await logToAuditTrail(createLogEntry('APPROVE_SUMMARY_FAILURE', { 
      error: (error as Error).message
    }));
    
    return Errors.internalServerError('Failed to approve summary', {
      details: (error as Error).message
    });
  }
});