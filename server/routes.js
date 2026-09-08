const express = require('express');
const router = express.Router();
const { authMiddleware, authorize, validateTenant } = require('./middleware/auth');

/**
 * SUPER ADMIN ROUTES
 */
router.post('/super/companies',
    authMiddleware,
    authorize(['SUPER_ADMIN']),
    async (req, res) => {
        // Logic to create a new company
    }
);

router.get('/super/companies',
    authMiddleware,
    authorize(['SUPER_ADMIN']),
    async (req, res) => {
        // Logic to get all companies summary
    }
);

router.post('/super/companies/:companyId/admin',
    authMiddleware,
    authorize(['SUPER_ADMIN']),
    async (req, res) => {
        // Logic to create an admin user for a specific company
    }
);

/**
 * COMPANY ADMIN ROUTES
 */
router.get('/admin/users',
    authMiddleware,
    authorize(['COMPANY_ADMIN']),
    validateTenant,
    async (req, res) => {
        // Logic to get users for the company
        // Database query MUST use req.companyId
        // Example: db.collection('users').where('company_id', '==', req.companyId)
    }
);

router.post('/admin/users',
    authMiddleware,
    authorize(['COMPANY_ADMIN']),
    validateTenant,
    async (req, res) => {
        // Logic to create a user within own company
        const newUser = { ...req.body, company_id: req.companyId };
        await db.collection('users').add(newUser);
    }
);

/**
 * SHARED DATA ACCESS
 */
router.get('/records',
    authMiddleware,
    validateTenant,
    async (req, res) => {
        // Both ADMIN and EMPLOYEE can access this, but only for their company
        // The validateTenant middleware ensures req.companyId is correct
    }
);

module.exports = router;
