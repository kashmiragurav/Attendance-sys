const jwt = require('jsonwebtoken');

/**
 * Auth Middleware to verify JWT and attach user to request
 */
const authMiddleware = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'No token provided' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // Contains uid, role, company_id
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Invalid or expired token' });
    }
};

/**
 * Role-Based Access Control (RBAC) Middleware
 * @param {Array} roles - Allowed roles for this route
 */
const authorize = (roles = []) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ message: 'Forbidden: Insufficient permissions' });
        }
        next();
    };
};

/**
 * Tenant Isolation Middleware
 * Ensures the user only accesses data belonging to their company.
 */
const validateTenant = (req, res, next) => {
    // If Super Admin, bypass tenant check
    if (req.user.role === 'SUPER_ADMIN') {
        return next();
    }

    const requestedCompanyId = req.params.companyId || req.body.company_id || req.query.company_id;

    // If a company ID is provided in the request, it MUST match the user's company ID
    if (requestedCompanyId && requestedCompanyId !== req.user.company_id) {
        return res.status(403).json({ message: 'Forbidden: You cannot access data from another company' });
    }

    // Inject user's company_id into the request object to ensure all database queries use it
    req.companyId = req.user.company_id;
    next();
};

module.exports = {
    authMiddleware,
    authorize,
    validateTenant
};
