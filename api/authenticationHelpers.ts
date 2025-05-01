import { Request, Response, NextFunction } from 'express';

function authenticateUser(req: Request, res: Response, next: NextFunction): void {  
    if (!req.user) {  
        return res.status(401).json({ message: 'Authentication required' });  
    }  
    next();  
}  

function authorizeAdmin(req: Request, res: Response, next: NextFunction): void {
    if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
    }
    if (!req.user.isAdmin) {
        return res.status(403).json({ message: 'Admin access required' });
    }
    next();
}

export {
    authenticateUser,
    authorizeAdmin,
};
