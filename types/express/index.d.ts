declare namespace Express {
    export interface Request {
      user?: {
        isAdmin?: boolean;
        [key: string]: any;
      };
    }
  }