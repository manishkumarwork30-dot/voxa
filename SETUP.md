# Role-Based Authentication System Setup Guide

## Overview
This is a complete role-based authentication system with three user roles:
- **Super Admin** (1 only) - Can create admins, has full access
- **Admin** (multiple, created by super admin) - Can manage users
- **User** (regular users who sign up) - Basic access

## Prerequisites
- Node.js installed
- MongoDB Atlas account (or local MongoDB)
- MongoDB connection string

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Update the `.env` file with your MongoDB connection string and desired super admin credentials:

```env
MONGODB_URI = "your-mongodb-connection-string"
JWT_SECRET = "your-secret-key-change-this"

# Super Admin Setup
SUPER_ADMIN_NAME = "Super Admin"
SUPER_ADMIN_EMAIL = "superadmin@example.com"
SUPER_ADMIN_PASSWORD = "change-this-password"
```

### 3. Whitelist Your IP in MongoDB Atlas (IMPORTANT!)
**This step is critical - without it, you'll get connection errors.**

1. Go to MongoDB Atlas dashboard
2. Navigate to Network Access (in the left sidebar)
3. Click "Add IP Address"
4. Either:
   - Click "Allow Access from Anywhere" (0.0.0.0/0) for development
   - Or add your specific IP address
5. Click "Confirm"

> ⚠️ **Note**: If you get a "Could not connect to any servers" error, your IP is likely not whitelisted.

### 4. Create Initial Super Admin
Run the script to create the first super admin:

```bash
npm run create-super-admin
```

Alternatively, you can manually create a super admin in MongoDB:
1. Connect to your MongoDB database
2. Insert a user document with `role: "super_admin"`
3. Make sure to hash the password using bcrypt

### 5. Start Development Server
```bash
npm run dev
```

The app will be available at `http://localhost:3000`

## Usage

### User Signup
- Visit `/signup` to create a new user account
- Only regular users can sign up (role will always be "user")

### Login
- Visit `/login` to sign in
- Users are automatically redirected to their role-specific dashboard:
  - Super Admin → `/dashboard/super-admin`
  - Admin → `/dashboard/admin`
  - User → `/dashboard/user`

### Super Admin Features
- Create new admins via the dashboard
- Access all admin features
- Manage system settings

### Admin Features
- View user analytics
- Access admin-only features
- (Super admin only) Create new admins

### User Features
- View personal profile
- Access user-only features

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Register new user (creates "user" role)
- `POST /api/auth/login` - User login

### Admin (Protected)
- `POST /api/admin/create-admin` - Create new admin (super admin only)
- `GET /api/admin/users` - List users (admin/super admin only)

## Project Structure

```
app/
├── api/
│   ├── auth/
│   │   ├── login/route.ts
│   │   └── signup/route.ts
│   └── admin/
│       ├── create-admin/route.ts
│       └── users/route.ts
├── dashboard/
│   ├── super-admin/page.tsx
│   ├── admin/page.tsx
│   └── user/page.tsx
├── login/page.tsx
├── signup/page.tsx
└── page.tsx
lib/
└── db.ts
model/
└── user.model.ts
proxy.ts (previously middleware.ts)
scripts/
└── create-super-admin.ts
```

## Security Notes

1. **Change Default Credentials**: Always change the default super admin password after setup
2. **JWT Secret**: Use a strong, unique JWT secret in production
3. **Environment Variables**: Never commit `.env` files to version control
4. **HTTPS**: Use HTTPS in production for secure token transmission
5. **Password Policy**: Enforce strong password requirements

## Troubleshooting

### MongoDB Connection Error
- Check your MongoDB URI is correct
- Ensure your IP is whitelisted in MongoDB Atlas
- Verify your MongoDB cluster is running

### Port Already in Use
If port 3000 is already in use, Next.js will automatically use port 3001.

### Proxy/Middleware Issues
If you're having issues with proxy (middleware), clear the `.next` folder:
```bash
rm -rf .next
npm run dev
```

## Default Credentials (After Running Setup Script)
- **Email**: superadmin@example.com
- **Password**: SuperAdmin@123

**Important**: Change these credentials immediately after first login!