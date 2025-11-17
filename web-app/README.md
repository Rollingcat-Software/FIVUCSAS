# FIVUCSAS Admin Dashboard

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![React](https://img.shields.io/badge/React-18-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue.svg)
![Progress](https://img.shields.io/badge/progress-100%25-brightgreen.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## 🎯 Overview

Professional admin dashboard for the **FIVUCSAS** (Face and Identity Verification Using Cloud-based SaaS) platform. Built with React 18, TypeScript, Material-UI, and Redux Toolkit.

Provides comprehensive user management, biometric enrollment tracking, audit logging, and system analytics.

**Current Status:** ✅ Phase 1 - 100% COMPLETE

See [IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md) for detailed progress.

## ✨ Features

### Implemented ✅
- **Authentication System**
  - Secure login with JWT tokens
  - Auto token refresh on 401
  - Protected routes
  - Redux state management
  - Mock mode for development

- **Professional UI/UX**
  - Material-UI components
  - Responsive design
  - Custom theme
  - Form validation with Zod
  - Loading states and error handling

- **Complete Dashboard**
  - Dashboard layout with sidebar and top bar
  - 6 statistics cards with real-time data
  - System overview metrics
  - Responsive design (mobile + desktop)

- **User Management**
  - Users list with search and filter
  - CRUD operations (view, edit, delete)
  - Status and role badges
  - Sample data with 5 users

- **Navigation & Routing**
  - 6 main pages (Dashboard, Users, Tenants, Enrollments, Audit Logs, Settings)
  - Protected routes
  - Active route highlighting
  - Breadcrumb navigation

## Technology Stack

### Core
- **React 18**: Modern UI framework
- **TypeScript 5**: Type-safe development
- **Vite**: Fast build tool and dev server
- **React Router v6**: Client-side routing

### State Management
- **Redux Toolkit**: Global state management
- **RTK Query**: Data fetching and caching
- **React Query**: Server state management (alternative)

### UI Framework
- **Material-UI (MUI) v5**: Component library
- **Tailwind CSS**: Utility-first CSS
- **Framer Motion**: Animations
- **Recharts**: Data visualization

### Forms & Validation
- **React Hook Form**: Form management
- **Yup**: Schema validation
- **Zod**: TypeScript-first validation (alternative)

### Authentication & Security
- **JWT**: Token-based authentication
- **Axios**: HTTP client with interceptors
- **React-Toastify**: Notifications

## Installation

```bash
# Clone repository
git clone https://github.com/your-org/web-app.git
cd web-app

# Install dependencies
npm install
# or
yarn install
# or
pnpm install

# Set up environment variables
cp .env.example .env.local
```

### Environment Configuration

```env
VITE_API_BASE_URL=http://localhost:8080/api/v1
VITE_BIOMETRIC_API_URL=http://localhost:8001/api/v1
VITE_APP_NAME=FIVUCSAS Admin
VITE_ENVIRONMENT=development
```

## Running the Application

```bash
# Development mode
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run tests
npm run test

# Type checking
npm run type-check

# Linting
npm run lint
npm run lint:fix
```

## Project Structure

```
web-app/
├── public/
├── src/
│   ├── assets/              # Static assets
│   ├── components/
│   │   ├── common/          # Reusable components
│   │   ├── layout/          # Layout components
│   │   └── features/        # Feature-specific components
│   ├── features/
│   │   ├── auth/
│   │   ├── dashboard/
│   │   ├── users/
│   │   ├── roles/
│   │   ├── biometrics/
│   │   └── analytics/
│   ├── hooks/               # Custom React hooks
│   ├── services/            # API services
│   ├── store/               # Redux store
│   ├── types/               # TypeScript types
│   ├── utils/               # Utility functions
│   ├── App.tsx
│   └── main.tsx
├── tests/
├── .env.example
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## Key Features

### Dashboard
- Real-time statistics
- Recent authentication activities
- User growth charts
- Security alerts

### User Management
```typescript
// Example: User Management Component
const UserManagement: React.FC = () => {
  const { data: users, isLoading } = useGetUsersQuery({ page: 1, limit: 10 });

  return (
    <DataGrid
      rows={users?.data || []}
      columns={userColumns}
      onEdit={handleEdit}
      onDelete={handleDelete}
    />
  );
};
```

### Role Management
- Create custom roles
- Assign permissions
- Role hierarchy

### Analytics
- Authentication trends
- User activity heatmaps
- Biometric enrollment statistics

## API Integration

```typescript
// services/api.ts
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 30000,
});

// Request interceptor for JWT
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Handle token refresh
      await refreshToken();
    }
    return Promise.reject(error);
  }
);
```

## Building for Production

```bash
# Build
npm run build

# Preview
npm run preview

# Deploy to Vercel
vercel deploy

# Deploy to Netlify
netlify deploy --prod
```

## Testing

```bash
# Unit tests
npm run test

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# Coverage
npm run test:coverage
```

## License

Part of the FIVUCSAS platform developed at Marmara University.

Copyright © 2025 FIVUCSAS Team. Licensed under MIT License.

---

**Built with React & TypeScript** | FIVUCSAS Web Team © 2025
