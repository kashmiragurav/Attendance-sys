import { FEATURES, PLAN_DEFAULTS } from '../constants/Plans';

/**
 * Checks if a specific feature is enabled for a company
 * 
 * Logic:
 * 1. Check if the company has explicit feature overrides.
 * 2. If no override, check the default features for the company's plan.
 * 3. Check if the subscription is still active.
 * 
 * @param {Object} company - The company document data
 * @param {string} featureKey - The feature key from FEATURES constant
 * @returns {boolean}
 */
export const isFeatureEnabled = (company, featureKey) => {
    if (!company) return false;

    // 1. Check Subscription Expiry
    const now = new Date();
    let expiry = company.subscription?.expiryDate ? new Date(company.subscription.expiryDate) : null;

    // Set expiry to end of day if it's just a date string (YYYY-MM-DD)
    if (expiry) {
        expiry.setHours(23, 59, 59, 999);
    }

    const isExpired = expiry && now > expiry;

    // If expired, only allow core "Free" features regardless of plan (unless it's already FREE)
    const effectivePlan = (isExpired && company.plan !== 'Free') ? 'Free' : (company.plan || 'Free');

    // 2. Check Overrides First
    // Overrides are stored as { [featureKey]: true/false } in company.featureOverrides
    if (company.featureOverrides && company.featureOverrides[featureKey] !== undefined) {
        return company.featureOverrides[featureKey];
    }

    // 3. Check Plan Defaults
    const planData = PLAN_DEFAULTS[effectivePlan] || PLAN_DEFAULTS.Free;
    return planData.features.includes(featureKey);
};

/**
 * Gets the user limit for a company
 */
export const getUserLimit = (company) => {
    // Check for Unlimited Users Feature (Plan based or Overridden)
    if (isFeatureEnabled(company, FEATURES.UNLIMITED_USERS)) {
        return 999999; // Effectively unlimited
    }

    if (!company) return 10;

    const plan = company.plan || 'Free';
    const planData = PLAN_DEFAULTS[plan] || PLAN_DEFAULTS.Free;

    return planData.maxUsers;
};
