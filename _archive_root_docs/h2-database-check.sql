-- H2 Database Diagnostic and Fix Script for FIVUCSAS
-- Run this in H2 Console: http://localhost:8080/h2-console
-- JDBC URL: jdbc:h2:mem:fivucsas_db
-- Username: sa
-- Password: (empty)

-- ============================================
-- PART 1: CHECK CURRENT DATABASE STATE
-- ============================================

-- List all tables
SELECT 'CHECKING TABLES...' AS STATUS;
SHOW TABLES;

-- Check if TENANTS table exists and has data
SELECT 'CHECKING TENANTS TABLE...' AS STATUS;
SELECT COUNT(*) AS TENANT_COUNT FROM TENANTS;
SELECT * FROM TENANTS;

-- Check if USERS table exists and has data
SELECT 'CHECKING USERS TABLE...' AS STATUS;
SELECT COUNT(*) AS USER_COUNT FROM USERS;
SELECT ID, FIRST_NAME, LAST_NAME, EMAIL, STATUS, TENANT_ID FROM USERS;

-- Check if BIOMETRIC_DATA table exists
SELECT 'CHECKING BIOMETRIC_DATA TABLE...' AS STATUS;
SELECT COUNT(*) AS BIOMETRIC_COUNT FROM BIOMETRIC_DATA;

-- Check if AUDIT_LOGS table exists
SELECT 'CHECKING AUDIT_LOGS TABLE...' AS STATUS;
SELECT COUNT(*) AS AUDIT_LOG_COUNT FROM AUDIT_LOGS;

-- ============================================
-- PART 2: FIX COMMON ISSUES
-- ============================================

-- FIX 1: Create default tenant if missing
-- (Run this if TENANT_COUNT above shows 0)
SELECT 'CREATING DEFAULT TENANT...' AS STATUS;

INSERT INTO TENANTS (ID, NAME, STATUS, MAX_USERS, CREATED_AT, UPDATED_AT)
SELECT 1, 'Default Tenant', 'ACTIVE', 1000, CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP()
WHERE NOT EXISTS (SELECT 1 FROM TENANTS WHERE ID = 1);

-- Verify tenant was created
SELECT 'VERIFYING DEFAULT TENANT...' AS STATUS;
SELECT * FROM TENANTS WHERE ID = 1;

-- ============================================
-- PART 3: CREATE TEST DATA (OPTIONAL)
-- ============================================

-- Create a test user (OPTIONAL - only if you want sample data)
-- Uncomment the lines below to create a test user

/*
INSERT INTO USERS (
    ID, TENANT_ID, FIRST_NAME, LAST_NAME, EMAIL,
    ID_NUMBER, PHONE_NUMBER, ADDRESS, PASSWORD_HASH,
    STATUS, CREATED_AT, UPDATED_AT
) VALUES (
    1000,
    1,
    'Test',
    'User',
    'testuser@fivucsas.com',
    '12345678901',
    '+905551234567',
    '123 Test Street, Istanbul',
    '$2a$10$dummyHashForTestingPurposes',
    'ACTIVE',
    CURRENT_TIMESTAMP(),
    CURRENT_TIMESTAMP()
);
*/

-- ============================================
-- PART 4: USEFUL QUERIES FOR DEBUGGING
-- ============================================

-- Count records in each table
SELECT 'SUMMARY OF ALL TABLES' AS STATUS;
SELECT 'TENANTS' AS TABLE_NAME, COUNT(*) AS RECORD_COUNT FROM TENANTS
UNION ALL
SELECT 'USERS', COUNT(*) FROM USERS
UNION ALL
SELECT 'BIOMETRIC_DATA', COUNT(*) FROM BIOMETRIC_DATA
UNION ALL
SELECT 'AUDIT_LOGS', COUNT(*) FROM AUDIT_LOGS;

-- Check recent users
SELECT 'RECENT USERS (LAST 10)' AS STATUS;
SELECT ID, FIRST_NAME, LAST_NAME, EMAIL, STATUS, CREATED_AT
FROM USERS
ORDER BY CREATED_AT DESC
LIMIT 10;

-- Check user status distribution
SELECT 'USER STATUS DISTRIBUTION' AS STATUS;
SELECT STATUS, COUNT(*) AS COUNT
FROM USERS
GROUP BY STATUS;

-- ============================================
-- DONE!
-- ============================================
SELECT 'DATABASE CHECK COMPLETE!' AS STATUS;
