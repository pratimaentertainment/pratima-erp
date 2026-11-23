-- Rollback Migration for add_billing_and_subscription_engine
ALTER TABLE "BillingTransaction" DROP CONSTRAINT IF EXISTS "BillingTransaction_tenantId_fkey";
ALTER TABLE "TenantSubscription" DROP CONSTRAINT IF EXISTS "TenantSubscription_planId_fkey";
ALTER TABLE "TenantSubscription" DROP CONSTRAINT IF EXISTS "TenantSubscription_tenantId_fkey";

DROP TABLE IF EXISTS "BillingTransaction";
DROP TABLE IF EXISTS "TenantSubscription";
DROP TABLE IF EXISTS "SubscriptionPlan";

DROP TYPE IF EXISTS "BillingCycle";
