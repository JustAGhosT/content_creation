import Airtable, { FieldSet, Records } from 'airtable';

// Interface definitions
export interface Pagination {
  page: number;
  pageSize: number;
  hasMorePages: boolean;
}

export interface TrackContentResponse {
  data: Records<FieldSet>;
  pagination: Pagination;
}

export interface QueryOptions {
  maxRecords: number;
  pageSize: number;
  offset?: string;
}

export interface Feedback {
  reviewId: string;
  feedback: string;
}

export interface AirtableRecord {
  Content: string;
  createdTime?: string;
  // Add other fields that exist in your Airtable schema
}

// Airtable client class
export class AirtableClient {
  private base: Airtable.Base | undefined;
  private contentTable: Airtable.Table<AirtableRecord> | undefined;
  private feedbackTable: Airtable.Table<any> | undefined;
  private initialized: boolean = false;

  constructor() {
    this.initialize();
  }

  /**
   * Initialize Airtable connection
   * @returns Boolean indicating if initialization was successful
   */
  public initialize(): boolean {
    if (
      !process.env.AIRTABLE_API_KEY ||
      !process.env.AIRTABLE_BASE_ID ||
      !process.env.AIRTABLE_TABLE_NAME
    ) {
      console.error('Missing required Airtable environment variables');
      return false;
    }

    try {
      this.base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
        process.env.AIRTABLE_BASE_ID
      );
      this.contentTable = this.base(process.env.AIRTABLE_TABLE_NAME);
      this.feedbackTable = this.base('Feedback'); // Assuming there's a Feedback table
      this.initialized = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize Airtable:', error);
      return false;
    }
  }

  /**
   * Check if Airtable is initialized
   * @returns Boolean indicating if Airtable is initialized
   */
  public isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Store content in Airtable
   * @param content Content to store
   * @returns Created record
   */
  public async storeContent(content: string): Promise<Airtable.Record<AirtableRecord>> {
    if (!this.isInitialized()) {
      throw new Error('Airtable client not initialized');
    }

    try {
      return await this.contentTable!.create({ Content: content });
    } catch (error) {
      console.error('Error storing content in Airtable:', error);
      throw new Error('Failed to store content in Airtable');
    }
  }

  /**
   * Get content with pagination and filtering
   * @param options Query options
   * @returns Content records with pagination info
   */
  public async getContent(options: {
    pageSize?: number;
    page?: number;
    filter?: string;
    offset?: string;
  }): Promise<TrackContentResponse> {
    if (!this.isInitialized()) {
      throw new Error('Airtable client not initialized');
    }

    const pageSize = options.pageSize || 20;
    const page = options.page || 1;
    const filter = options.filter || '';
    const offset = options.offset;

    try {
      const queryOptions: QueryOptions = {
        maxRecords: pageSize + 1,
        pageSize: pageSize + 1
      };

      if (offset) {
        queryOptions.offset = offset;
      }

      let records = await this.contentTable!.select(queryOptions).all();

      // Apply filter if provided
      if (filter && filter.trim() !== '') {
        const filterLower = filter.trim().toLowerCase();
        records = records.filter(record => {
          const content = (record.fields.Content as string || '').toLowerCase();
          return content.includes(filterLower);
        });
      }

      // Check if there are more pages
      const hasMore = records.length > pageSize;
      const resultsToReturn = hasMore ? records.slice(0, pageSize) : records;

      return {
        data: resultsToReturn,
        pagination: {
          page,
          pageSize,
          hasMorePages: hasMore
        }
      };
    } catch (error) {
      console.error('Error retrieving content from Airtable:', error);
      throw new Error('Failed to retrieve content from Airtable');
    }
  }

  /**
   * Save feedback to Airtable
   * @param feedback Feedback data
   */
  public async saveFeedback(feedback: Feedback): Promise<void> {
    if (!this.isInitialized()) {
      throw new Error('Airtable client not initialized');
    }

    try {
      await this.feedbackTable!.create({
        ReviewId: feedback.reviewId,
        Feedback: feedback.feedback,
        CreatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error saving feedback to Airtable:', error);
      throw new Error('Failed to save feedback to Airtable');
    }
  }

  /**
   * Get feedback from Airtable
   * @param filter Filter criteria
   * @returns Array of feedback items
   */
  public async getFeedback(filter: Partial<Feedback>): Promise<Feedback[]> {
    if (!this.isInitialized()) {
      throw new Error('Airtable client not initialized');
    }

    try {
      let selectParams: any = {};
      
      if (filter.reviewId) {
        selectParams.filterByFormula = `{ReviewId} = '${filter.reviewId}'`;
      }

      const records = await this.feedbackTable!.select(selectParams).all();
      
      return records.map(record => ({
        reviewId: record.get('ReviewId') as string,
        feedback: record.get('Feedback') as string
      }));
    } catch (error) {
      console.error('Error retrieving feedback from Airtable:', error);
      throw new Error('Failed to retrieve feedback from Airtable');
    }
  }
}

// Export singleton instance
export const airtableClient = new AirtableClient();