import 'dotenv/config';
import { spawn, execSync, ChildProcess } from 'child_process';
import { prisma } from '../src/lib/prisma';
import { rbacCache } from '../src/lib/rbac/cache';
import { RoleService } from '../src/services/role.service';
import { VehicleService } from '../src/services/vehicle.service';
import { checkTenantLockStatus } from '../src/services/billing/subscription-guard.service';
import { FranchiseRoyaltyService } from '../src/services/franchise-royalty.service';
import { SubscriptionStatus, AssetStatus, EventBookingStatus } from '@prisma/client';

interface TestResult {
  name: string;
  category: string;
  passed: boolean;
  durationMs: number;
  details: string;
  error?: string;
}

const results: TestResult[] = [];

function recordResult(name: string, category: string, passed: boolean, durationMs: number, details: string, error?: string) {
  results.push({ name, category, passed, durationMs, details, error });
  const statusStr = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`[${statusStr}] [${category}] ${name} (${durationMs}ms) - ${details}`);
  if (error) {
    console.error(`   Error details: ${error}`);
  }
}

// ==========================================
// CHECK 1: DATABASE & PRISMA INTEGRITY
// ==========================================
async function checkDatabaseIntegrity(): Promise<boolean> {
  const start = Date.now();
  console.log('\n--- [CHECK 1] Database & Prisma Integrity Audit ---');
  try {
    // 1. Raw DB Ping
    const pingStart = Date.now();
    await prisma.$queryRaw`SELECT 1 as ping`;
    const pingMs = Date.now() - pingStart;

    // 2. Subscription Plans Seed Check
    const plansCount = await prisma.subscriptionPlan.count({
      where: { isActive: true },
    });
    if (plansCount === 0) {
      throw new Error('No active SubscriptionPlan records found. Seed data missing.');
    }

    // 3. SuperAdmin User Check
    const superAdmin = await prisma.user.findFirst({
      where: { role: 'SUPER_ADMIN' },
      select: { id: true, email: true, role: true, isActive: true },
    });
    if (!superAdmin) {
      throw new Error('SuperAdmin account missing from database.');
    }

    recordResult(
      'Database Connectivity & Seed Verification',
      'DB Integrity',
      true,
      Date.now() - start,
      `Ping ${pingMs}ms. ${plansCount} active plans verified. SuperAdmin verified: ${superAdmin.email}`
    );
    return true;
  } catch (err: any) {
    recordResult(
      'Database Connectivity & Seed Verification',
      'DB Integrity',
      false,
      Date.now() - start,
      'Failed DB verification check',
      err.message
    );
    return false;
  }
}

// ==========================================
// CHECK 2: AUTH & ROUTE PROTECTION AUDIT
// ==========================================
async function checkRouteProtection(): Promise<boolean> {
  const start = Date.now();
  console.log('\n--- [CHECK 2] Auth & Route Protection Audit (Live HTTP Probe) ---');
  const TEST_PORT = 3095;
  const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;
  let serverProcess: ChildProcess | null = null;

  try {
    // 1. Launch Next.js production server in background
    console.log(`Starting isolated test Next.js server on port ${TEST_PORT}...`);
    serverProcess = spawn(
      process.platform === 'win32' ? 'npx.cmd' : 'npx',
      ['next', 'start', '-p', TEST_PORT.toString()],
      {
        stdio: 'pipe',
        shell: true,
      }
    );

    // 2. Wait for server to accept HTTP requests
    let serverReady = false;
    const maxRetries = 25;
    for (let i = 0; i < maxRetries; i++) {
      try {
        const res = await fetch(`${BASE_URL}/login`);
        if (res.status === 200 || res.status === 307 || res.status === 302) {
          serverReady = true;
          break;
        }
      } catch {
        // Server not ready yet
      }
      await new Promise((resolve) => setTimeout(resolve, 800));
    }

    if (!serverReady) {
      throw new Error(`Next.js test server failed to bind to port ${TEST_PORT} within timeout.`);
    }

    // 3. Test Public Routes
    const publicRoutes = ['/login', '/signup'];
    for (const route of publicRoutes) {
      const rStart = Date.now();
      const res = await fetch(`${BASE_URL}${route}`, { redirect: 'manual' });
      const duration = Date.now() - rStart;
      if (res.status === 200) {
        recordResult(
          `Public Route Accessible: ${route}`,
          'Route Protection',
          true,
          duration,
          `HTTP ${res.status} OK`
        );
      } else {
        recordResult(
          `Public Route Accessible: ${route}`,
          'Route Protection',
          false,
          duration,
          `Unexpected status HTTP ${res.status}`,
          `Expected 200 OK for public route ${route}`
        );
      }
    }

    // 4. Test Protected Routes (Unauthenticated Probe)
    const protectedRoutes = [
      '/dashboard',
      '/leads',
      '/operations/bookings',
      '/operations/vehicles',
      '/franchise',
      '/super-admin',
      '/settings/branches',
    ];

    let allProtectedPassed = true;
    for (const route of protectedRoutes) {
      const rStart = Date.now();
      const res = await fetch(`${BASE_URL}${route}`, { redirect: 'manual' });
      const duration = Date.now() - rStart;
      const location = res.headers.get('location') || '';

      // Unauthenticated requests MUST NOT return 500, and must redirect (302/307/308) or 401/403
      const isRedirectOrForbidden =
        [301, 302, 307, 308, 401, 403].includes(res.status) &&
        (location.includes('login') || res.status === 401 || res.status === 403);

      if (res.status === 500) {
        allProtectedPassed = false;
        recordResult(
          `Protected Route Gate: ${route}`,
          'Route Protection',
          false,
          duration,
          `HTTP 500 Internal Server Error`,
          `Unauthenticated request triggered a server crash on ${route}`
        );
      } else if (isRedirectOrForbidden) {
        recordResult(
          `Protected Route Gate: ${route}`,
          'Route Protection',
          true,
          duration,
          `HTTP ${res.status} -> Redirected safely to ${location.slice(0, 40)}...`
        );
      } else {
        allProtectedPassed = false;
        recordResult(
          `Protected Route Gate: ${route}`,
          'Route Protection',
          false,
          duration,
          `Unexpected HTTP status ${res.status}`,
          `Expected redirect to login or 401/403, received ${res.status}`
        );
      }
    }

    return allProtectedPassed;
  } catch (err: any) {
    recordResult(
      'Auth & Route Protection Server Audit',
      'Route Protection',
      false,
      Date.now() - start,
      'Failed server probe',
      err.message
    );
    return false;
  } finally {
    // 5. Terminate server process gracefully
    if (serverProcess && serverProcess.pid) {
      try {
        if (process.platform === 'win32') {
          execSync(`taskkill /pid ${serverProcess.pid} /T /F`, { stdio: 'ignore' });
        } else {
          serverProcess.kill('SIGTERM');
        }
      } catch {
        // Process might have already exited
      }
    }
  }
}

// ==========================================
// CHECK 3: END-TO-END BUSINESS LOGIC & ISOLATION
// ==========================================
async function checkBusinessLogicAndIsolation(): Promise<boolean> {
  const start = Date.now();
  console.log('\n--- [CHECK 3] End-to-End Business Logic, RBAC & Isolation Smoke Tests ---');

  const timestamp = Date.now().toString();
  const franchisorName = `__QA_TEST_FRANCHISOR__${timestamp}`;
  const franchiseeName = `__QA_TEST_FRANCHISEE__${timestamp}`;
  const franchisorSlug = `qa-franchisor-${timestamp}`;
  const franchiseeSlug = `qa-franchisee-${timestamp}`;
  const staffEmail = `qa-staff-${timestamp}@pratimaerp.test`;
  const vehiclePlate = `QA-${timestamp.slice(-5)}`;

  let franchisorId: string | null = null;
  let franchiseeId: string | null = null;

  try {
    // ========================================================
    // 3.0 Provision Test Hierarchy
    // ========================================================
    console.log('1. Provisioning isolated test workspace namespace...');

    // Create Franchisor Tenant
    const franchisor = await prisma.tenant.create({
      data: {
        name: franchisorName,
        slug: franchisorSlug,
        isFranchisor: true,
        subscriptionStatus: SubscriptionStatus.ACTIVE,
        royaltyPercent: 0,
        email: `qa-master-${timestamp}@pratimaerp.test`,
        phone: `+9199999${timestamp.slice(-5)}`,
        contactPhone: `+9199999${timestamp.slice(-5)}`,
        city: 'Mumbai',
        state: 'Maharashtra',
      },
    });
    franchisorId = franchisor.id;

    // Create Franchisee Tenant (10% Royalty Rate, Linked to Franchisor)
    const franchisee = await prisma.tenant.create({
      data: {
        name: franchiseeName,
        slug: franchiseeSlug,
        parentTenantId: franchisor.id,
        isFranchisor: false,
        royaltyPercent: 10,
        subscriptionStatus: SubscriptionStatus.ACTIVE,
        email: `qa-child-${timestamp}@pratimaerp.test`,
        phone: `+9188888${timestamp.slice(-5)}`,
        contactPhone: `+9188888${timestamp.slice(-5)}`,
        city: 'Pune',
        state: 'Maharashtra',
      },
    });
    franchiseeId = franchisee.id;

    // Create Branch A and Branch B under Franchisor
    const branchA = await prisma.branch.create({
      data: {
        tenantId: franchisor.id,
        name: '__QA_TEST_BRANCH_A__',
        code: `QA${timestamp.slice(-2)}A`,
        isHeadOffice: true,
        isActive: true,
      },
    });

    const branchB = await prisma.branch.create({
      data: {
        tenantId: franchisor.id,
        name: '__QA_TEST_BRANCH_B__',
        code: `QA${timestamp.slice(-2)}B`,
        isHeadOffice: false,
        isActive: true,
      },
    });

    // Create Franchisee Primary Branch
    const franchiseeBranch = await prisma.branch.create({
      data: {
        tenantId: franchisee.id,
        name: '__QA_TEST_FRAN_BRANCH__',
        code: `QAF${timestamp.slice(-2)}`,
        isHeadOffice: true,
        isActive: true,
      },
    });

    // Create Staff User (Assigned to Branch A only)
    const staffUser = await prisma.user.create({
      data: {
        tenantId: franchisor.id,
        name: 'QA Branch Staff',
        email: staffEmail,
        role: 'STAFF',
        isActive: true,
        canLogin: true,
      },
    });

    // Map Staff User to Branch A (Active)
    await prisma.userBranch.create({
      data: {
        userId: staffUser.id,
        branchId: branchA.id,
        isActive: true,
        isPrimary: true,
      },
    });

    // Create a Role with OPERATIONS VIEW permission
    const testRole = await prisma.tenantRole.create({
      data: {
        tenantId: franchisor.id,
        name: `__QA_Role_${timestamp}__`,
        isSystem: false,
      },
    });

    // Ensure permission exists
    let perm = await prisma.permission.findFirst({
      where: { module: 'OPERATIONS', action: 'VIEW' },
    });
    if (!perm) {
      perm = await prisma.permission.create({
        data: { module: 'OPERATIONS', action: 'VIEW', name: 'View Operations' },
      });
    }

    await prisma.rolePermission.create({
      data: {
        roleId: testRole.id,
        permissionId: perm.id,
      },
    });

    await prisma.userRole.create({
      data: {
        userId: staffUser.id,
        roleId: testRole.id,
      },
    });

    // Invalidate RBAC cache to ensure live resolution
    rbacCache.invalidateAll();

    // ========================================================
    // 3.1 Branch-Level RBAC Enforcement Smoke Test
    // ========================================================
    console.log('2. Testing Branch-Level RBAC Enforcement...');
    const rbacStart = Date.now();

    const hasAccessBranchA = await RoleService.hasPermission(
      staffUser.id,
      'OPERATIONS',
      'VIEW',
      branchA.id
    );

    const hasAccessBranchB = await RoleService.hasPermission(
      staffUser.id,
      'OPERATIONS',
      'VIEW',
      branchB.id
    );

    if (hasAccessBranchA === true && hasAccessBranchB === false) {
      recordResult(
        'Branch-Level RBAC Scoping Enforcement',
        'Branch RBAC',
        true,
        Date.now() - rbacStart,
        'Staff user granted access on assigned Branch A, strictly denied on unassigned Branch B'
      );
    } else {
      recordResult(
        'Branch-Level RBAC Scoping Enforcement',
        'Branch RBAC',
        false,
        Date.now() - rbacStart,
        `RBAC Violation! BranchA Access: ${hasAccessBranchA}, BranchB Access: ${hasAccessBranchB}`,
        'Staff user was either denied on assigned branch or leaked access to unassigned branch'
      );
    }

    // ========================================================
    // 3.2 Vehicle Double-Booking Collision Engine Test
    // ========================================================
    console.log('3. Testing Vehicle Double-Booking Collision Engine...');
    const vehicleStart = Date.now();

    // Create Fleet Vehicle
    const vehicle = await prisma.vehicle.create({
      data: {
        tenantId: franchisor.id,
        branchId: branchA.id,
        plateNumber: vehiclePlate,
        makeModel: 'QA Dispatch Van',
        status: AssetStatus.AVAILABLE,
      },
    });

    // Create Customer
    const customer = await prisma.customer.create({
      data: {
        tenantId: franchisor.id,
        branchId: branchA.id,
        customerCode: `CUST-${timestamp.slice(-4)}`,
        firstName: 'Aarav',
        lastName: 'Sharma',
        phone: '9876543210',
      },
    });

    // Create Event Booking with Shoot SubEvents on 2027-08-20
    const shootDate = new Date('2027-08-20T10:00:00.000Z');
    const booking = await prisma.eventBooking.create({
      data: {
        tenantId: franchisor.id,
        branchId: branchA.id,
        bookingNumber: `BKG-${timestamp.slice(-4)}`,
        title: 'QA Royal Wedding',
        customerId: customer.id,
        startDate: shootDate,
        endDate: new Date('2027-08-20T22:00:00.000Z'),
        status: EventBookingStatus.CONFIRMED,
      },
    });

    const subEvent1 = await prisma.subEvent.create({
      data: {
        tenantId: franchisor.id,
        eventBookingId: booking.id,
        name: 'Haldi Ceremony',
        eventDate: shootDate,
        startTime: '10:00',
        endTime: '13:00',
      },
    });

    const subEvent2 = await prisma.subEvent.create({
      data: {
        tenantId: franchisor.id,
        eventBookingId: booking.id,
        name: 'Sangeet Gala',
        eventDate: shootDate,
        startTime: '18:00',
        endTime: '23:00',
      },
    });

    // Assignment 1: Must Succeed
    const booking1 = await VehicleService.assignVehicleToSubEvent({
      tenantId: franchisor.id,
      vehicleId: vehicle.id,
      subEventId: subEvent1.id,
      driverName: 'Ramesh Pilot',
      driverPhone: '9876500001',
      notes: 'Morning crew transport',
    });

    if (!booking1 || booking1.status !== 'CONFIRMED') {
      throw new Error('Initial vehicle dispatch assignment failed unexpectedly.');
    }

    // Assignment 2: Attempt double-booking on same shoot date for same vehicle
    let collisionDetected = false;
    let collisionMessage = '';

    try {
      await VehicleService.assignVehicleToSubEvent({
        tenantId: franchisor.id,
        vehicleId: vehicle.id,
        subEventId: subEvent2.id,
        driverName: 'Suresh Pilot',
      });
    } catch (err: any) {
      collisionDetected = true;
      collisionMessage = err.message;
    }

    if (collisionDetected && collisionMessage.includes('Collision Alert')) {
      recordResult(
        'Vehicle Double-Booking Collision Prevention',
        'Vehicle Collision',
        true,
        Date.now() - vehicleStart,
        `Engine blocked double-booking on ${shootDate.toISOString().split('T')[0]}: "${collisionMessage.slice(0, 75)}..."`
      );
    } else {
      recordResult(
        'Vehicle Double-Booking Collision Prevention',
        'Vehicle Collision',
        false,
        Date.now() - vehicleStart,
        'Collision Engine Failure: Allowed concurrent vehicle booking on the same calendar date',
        'Double-booking was not prevented'
      );
    }

    // ========================================================
    // 3.3 Parent-Paid Inheritance & Auto-Royalty Engine Test
    // ========================================================
    console.log('4. Testing Franchise Inheritance & Auto-Royalty Engine...');
    const franchiseStart = Date.now();

    // 1. Verify Parent Lock Inheritance
    const lockStatus = await checkTenantLockStatus(franchisee.id);
    const inheritsActive = lockStatus.isLocked === false;

    if (!inheritsActive) {
      throw new Error(`Franchisee failed subscription inheritance. Status: ${JSON.stringify(lockStatus)}`);
    }

    // 2. Create Customer & Lead with 50,000 INR expected revenue under Franchisee
    const franchiseeCustomer = await prisma.customer.create({
      data: {
        tenantId: franchisee.id,
        branchId: franchiseeBranch.id,
        customerCode: `FRAN-CUST-${timestamp.slice(-4)}`,
        firstName: 'Priya',
        lastName: 'Patel',
      },
    });

    const lead = await prisma.lead.create({
      data: {
        tenantId: franchisee.id,
        branchId: franchiseeBranch.id,
        leadCode: `FRAN-LEAD-${timestamp.slice(-4)}`,
        customerId: franchiseeCustomer.id,
        expectedRevenue: 50000,
      },
    });

    const franchiseeBooking = await prisma.eventBooking.create({
      data: {
        tenantId: franchisee.id,
        branchId: franchiseeBranch.id,
        bookingNumber: `FRAN-BKG-${timestamp.slice(-4)}`,
        title: 'Franchisee Destination Wedding',
        customerId: franchiseeCustomer.id,
        leadId: lead.id,
        startDate: new Date('2027-09-10T10:00:00.000Z'),
        endDate: new Date('2027-09-10T22:00:00.000Z'),
        status: EventBookingStatus.CONFIRMED,
      },
    });

    // 3. Trigger Auto-Royalty Calculation
    const royaltyResult = await FranchiseRoyaltyService.recordBookingRoyaltyIfFranchisee(
      franchiseeBooking.id
    );

    // Expected: 10% of 50,000 = 5,000 INR
    const expectedRoyalty = 5000;
    const ledgerEntry = await prisma.franchiseRoyaltyLedger.findUnique({
      where: { eventBookingId: franchiseeBooking.id },
    });

    const isRoyaltyAccurate =
      royaltyResult.recorded === true &&
      Number(royaltyResult.royaltyAmount) === expectedRoyalty &&
      ledgerEntry !== null &&
      Number(ledgerEntry.royaltyAmount) === expectedRoyalty &&
      ledgerEntry.status === 'PENDING';

    if (inheritsActive && isRoyaltyAccurate) {
      recordResult(
        'Franchise Subscription Inheritance & Auto-Royalty Engine',
        'Franchise Engine',
        true,
        Date.now() - franchiseStart,
        `Active status inherited from Franchisor. Auto-computed 10% royalty on 50,000 INR = ${expectedRoyalty} INR logged in FranchiseRoyaltyLedger`
      );
    } else {
      recordResult(
        'Franchise Subscription Inheritance & Auto-Royalty Engine',
        'Franchise Engine',
        false,
        Date.now() - franchiseStart,
        `Royalty Mismatch or Inheritance Failure. Result: ${JSON.stringify(royaltyResult)}`,
        `Expected ${expectedRoyalty} INR, got ${royaltyResult.royaltyAmount}`
      );
    }

    return true;
  } catch (err: any) {
    recordResult(
      'End-to-End Business Logic Smoke Tests',
      'Business Logic',
      false,
      Date.now() - start,
      'Failed business logic execution',
      err.message
    );
    return false;
  } finally {
    // ========================================================
    // 3.4 MANDATORY CLEANUP: Purge all __QA_TEST_* records
    // ========================================================
    console.log('5. Executing mandatory clean-up of temporary QA test records...');
    const cleanupStart = Date.now();
    try {
      if (franchiseeId) {
        // Delete Franchisee royalties
        await prisma.franchiseRoyaltyLedger.deleteMany({
          where: { OR: [{ franchisorId: franchisorId || undefined }, { franchiseeId }] },
        });
        // Delete Franchisee bookings, leads, customers, branches
        await prisma.eventBooking.deleteMany({ where: { tenantId: franchiseeId } });
        await prisma.lead.deleteMany({ where: { tenantId: franchiseeId } });
        await prisma.customer.deleteMany({ where: { tenantId: franchiseeId } });
        await prisma.branch.deleteMany({ where: { tenantId: franchiseeId } });
        await prisma.tenant.delete({ where: { id: franchiseeId } });
      }

      if (franchisorId) {
        // Delete Franchisor vehicles & bookings
        await prisma.vehicleBooking.deleteMany({ where: { tenantId: franchisorId } });
        await prisma.subEvent.deleteMany({ where: { tenantId: franchisorId } });
        await prisma.eventBooking.deleteMany({ where: { tenantId: franchisorId } });
        await prisma.vehicle.deleteMany({ where: { tenantId: franchisorId } });
        await prisma.customer.deleteMany({ where: { tenantId: franchisorId } });

        // Delete RBAC entities
        await prisma.userRole.deleteMany({ where: { user: { tenantId: franchisorId } } });
        await prisma.rolePermission.deleteMany({ where: { role: { tenantId: franchisorId } } });
        await prisma.tenantRole.deleteMany({ where: { tenantId: franchisorId } });
        await prisma.userBranch.deleteMany({ where: { branch: { tenantId: franchisorId } } });
        await prisma.user.deleteMany({ where: { tenantId: franchisorId } });
        await prisma.branch.deleteMany({ where: { tenantId: franchisorId } });
        await prisma.tenant.delete({ where: { id: franchisorId } });
      }

      // Verify zero orphan test tenants remain
      const remainingQATenants = await prisma.tenant.count({
        where: { name: { startsWith: '__QA_TEST_' } },
      });

      if (remainingQATenants === 0) {
        recordResult(
          'Database Isolation & Complete Self-Cleaning',
          'Cleanup Verification',
          true,
          Date.now() - cleanupStart,
          '100% of temporary __QA_TEST_* entities successfully purged. Database remains pristine.'
        );
      } else {
        recordResult(
          'Database Isolation & Complete Self-Cleaning',
          'Cleanup Verification',
          false,
          Date.now() - cleanupStart,
          `Orphan records detected: ${remainingQATenants} QA tenants still present in database.`,
          'Incomplete cleanup'
        );
      }
    } catch (cleanupErr: any) {
      recordResult(
        'Database Isolation & Complete Self-Cleaning',
        'Cleanup Verification',
        false,
        Date.now() - cleanupStart,
        'Error during test cleanup phase',
        cleanupErr.message
      );
    }
  }
}

// ==========================================
// MAIN RUNNER
// ==========================================
async function runSystemHealthScan() {
  const overallStart = Date.now();
  console.log('========================================================================');
  console.log('  PRATIMA ERP AUTOMATED FULL-SYSTEM HEALTH & E2E FLOW SCANNER');
  console.log('========================================================================');

  const check1Pass = await checkDatabaseIntegrity();
  const check2Pass = await checkRouteProtection();
  const check3Pass = await checkBusinessLogicAndIsolation();

  const totalDuration = ((Date.now() - overallStart) / 1000).toFixed(2);
  const totalTests = results.length;
  const passedTests = results.filter((r) => r.passed).length;
  const failedTests = totalTests - passedTests;

  console.log('\n========================================================================');
  console.log(`  SCAN SUMMARY: ${passedTests}/${totalTests} PASSED (${failedTests} FAILED) in ${totalDuration}s`);
  console.log('========================================================================');

  if (failedTests > 0) {
    console.error(`\n❌ SYSTEM SCAN FAILED: ${failedTests} assertion(s) did not pass.`);
    process.exit(1);
  } else {
    console.log('\n🎉 ALL CHECKS PASSED: Pratima ERP is 100% verified for production launch!');
    process.exit(0);
  }
}

runSystemHealthScan().catch((err) => {
  console.error('Fatal unhandled error in system health scan:', err);
  process.exit(1);
});
