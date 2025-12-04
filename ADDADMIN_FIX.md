# Fix for /addadmin Not Working on Live Server

## Problem
The `/addadmin` route works on localhost but fails on the live server.

## Common Causes & Solutions

### 1. **Environment Variables Not Set**
**Issue**: JWT secret and session secret are hardcoded
**Fix**: Update your `.env` file on live server:

```env
JWT_SECRET=your_secure_jwt_secret_here
SESSION_SECRET=your_secure_session_secret_here
PORT=3000
NODE_ENV=production
```

Then update `authMiddleware.js` line 13:
```javascript
jwt.verify(token, process.env.JWT_SECRET || "your_jwt_secret", (err, decoded) => {
```

And update `index.js` session config (around line 95):
```javascript
app.use(
  session({
    secret: process.env.SESSION_SECRET || "your-secret-key",
    resave: false,
    saveUninitialized: true,
    cookie: {
      secure: process.env.NODE_ENV === 'production', // HTTPS only in production
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  })
);
```

### 2. **Cookie Issues on Live Server**
**Issue**: Cookies not being set/read properly due to domain/HTTPS
**Fix**: Add cookie configuration in `index.js`:

```javascript
app.use(cookieParser());
app.use(
  session({
    secret: process.env.SESSION_SECRET || "your-secret-key",
    resave: false,
    saveUninitialized: true,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'lax',
      domain: process.env.COOKIE_DOMAIN || undefined
    }
  })
);
```

### 3. **Database Connection Issues**
**Issue**: MongoDB connection string different on live
**Check**: Verify your live database connection in `.env`:

```env
MONGODB_URI=mongodb://localhost:27017/your_database
# OR for cloud MongoDB
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database
```

### 4. **Missing Flash Messages**
**Issue**: Flash messages not displaying errors
**Fix**: Check if flash messages are being rendered in `addAdmin.ejs`:

```ejs
<% if (typeof error_msg !== 'undefined' && error_msg) { %>
  <div class="alert alert-danger">
    <%= error_msg %>
  </div>
<% } %>
```

### 5. **Route Not Registered**
**Issue**: Routes might not be loading in correct order
**Check**: Verify in `index.js` that adminRoutes is loaded:

```javascript
app.use("/", adminRoutes); // Line 213 in your index.js
```

### 6. **Permission Issues (Linux Servers)**
**Issue**: File permissions on live server
**Fix**: SSH into your server and run:

```bash
chmod -R 755 /path/to/your/app
chmod -R 777 /path/to/your/app/uploads
```

### 7. **PM2 or Process Manager Issues**
**Issue**: App not restarting after changes
**Fix**: Restart your app:

```bash
pm2 restart all
# OR
pm2 restart app-name
# OR
npm start
```

### 8. **CORS or Proxy Issues**
**Issue**: If behind a proxy (nginx, apache)
**Fix**: Add trust proxy in `index.js`:

```javascript
app.set('trust proxy', 1);
```

## Debugging Steps

### Step 1: Check Server Logs
```bash
# If using PM2
pm2 logs

# If using direct node
node index.js
```

### Step 2: Test Route Directly
Visit: `https://yourdomain.com/addadmin` and check:
- Does it redirect to `/sign_in`? → Authentication issue
- Does it show 404? → Route not registered
- Does it show blank page? → Check server logs

### Step 3: Check Database Connection
Add this test route temporarily in `index.js`:

```javascript
app.get('/test-db', async (req, res) => {
  try {
    const User = require('./src/models/user');
    const count = await User.countDocuments();
    res.json({ success: true, userCount: count });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});
```

### Step 4: Check Authentication
Add console logs in `authMiddleware.js`:

```javascript
function isAuthenticated(req, res, next) {
  const token = req.cookies.auth_token;
  console.log('Auth token:', token ? 'exists' : 'missing');
  
  if (!token) {
    console.log('No token, redirecting to sign_in');
    return res.redirect("/sign_in");
  }
  // ... rest of code
}
```

### Step 5: Check Admin Role
Add console logs in `isAdmin` middleware:

```javascript
async function isAdmin(req, res, next) {
  try {
    const userId = req.userId;
    console.log('Checking admin for userId:', userId);
    
    const user = await User.findById(userId).select("role");
    console.log('User role:', user ? user.role : 'user not found');
    
    if (!user || user.role !== "admin") {
      console.log('Not admin, redirecting to index');
      return res.redirect("/index");
    }
    next();
  } catch (error) {
    console.error("Admin check error:", error.message);
    return res.redirect("/index");
  }
}
```

## Quick Test

1. **Login as admin on live server**
2. **Open browser console (F12)**
3. **Check cookies**: Look for `auth_token`
4. **Try accessing**: `https://yourdomain.com/addadmin`
5. **Check network tab**: See what response you get

## Most Likely Solution

Based on the code, the most common issue is **cookie/session not persisting** on live server.

**Quick Fix**:
1. Make sure you're logged in as admin
2. Check if cookies are being set (F12 → Application → Cookies)
3. If no cookies, check your login route is setting them properly
4. Ensure your domain allows cookies (not blocked by browser)

## Need More Help?

Check these files for errors:
- Server logs (PM2 logs or console output)
- Browser console (F12)
- Network tab (F12 → Network)

Common error messages:
- "Cannot GET /addadmin" → Route not registered
- Redirects to /sign_in → Authentication failed
- Redirects to /index → Not admin or session lost
- 500 error → Check server logs for database/code errors
