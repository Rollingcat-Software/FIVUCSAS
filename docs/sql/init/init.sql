-- FIVUCSAS Database Initialization Script
-- This script runs automatically when PostgreSQL container starts for the first time

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Set timezone
SET timezone = 'UTC';

-- Create database if not exists (already created by POSTGRES_DB env var)
-- This file is for additional initialization only

\echo 'FIVUCSAS database initialized successfully!';
