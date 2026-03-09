# 🚀 Deployment Guide - Vercel & Railway

Complete guide to deploy your construction admin system to production.

---

## 📋 Pre-Deployment Checklist

Before deploying, ensure you have:
- ✅ GitHub account (for code repository)
- ✅ Vercel account (free tier available at vercel.com)
- ✅ Railway account (free tier available at railway.app)
- ✅ Git installed locally
- ✅ All changes committed

---

## Part 1: 🔄 Push to GitHub

### Step 1: Create GitHub Repository

1. Go to https://github.com/new
2. Create a new repository:
   - Name: `construccion-admin`
   - Private or Public (your choice)
   - **Don't** initialize with README (we already have one)
3. Click "Create repository"

### Step 2: Initialize Git & Push

Open terminal in your project folder and run:

```bash
# Initialize git (if not already done)
git init

# Add all files
git add .

# Create first commit
git commit -m "Initial commit - Construction Admin System"

# Add GitHub remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/construccion-admin.git

# Push to GitHub
git branch -M main
git push -u origin main
```

✅ Your code is now on GitHub!

---

## Part 2: 🚂 Deploy Backend to Railway

### Step 1: Create Railway Project

1. Go to https://railway.app
2. Click **"Start a New Project"**
3. Select **"Deploy from GitHub repo"**
4. Authorize Railway to access your GitHub
5. Select your `construccion-admin` repository

### Step 2: Configure Railway

1. Railway will auto-detect your project
2. Click on the deployment
3. Go to **"Settings"** tab
4. Set **Root Directory**: Leave empty (we'll use nixpacks.toml)

### Step 3: Add Environment Variables

In Railway settings, go to **"Variables"** tab and add:

```
NODE_ENV=production
PORT=5000
CORS_ORIGIN=https://your-app-name.vercel.app
```

**Note:** You'll update `CORS_ORIGIN` after deploying to Vercel (Step 3 below)

### Step 4: Deploy

1. Click **"Deploy"**
2. Wait for deployment to complete (2-3 minutes)
3. Railway will provide a URL like: `https://construccion-admin-production.up.railway.app`
4. **Copy this URL** - you'll need it for Vercel!

### Step 5: Test Backend

Visit your Railway URL in browser:
```
https://your-backend.up.railway.app/
```

You should see:
```json
{
  "mensaje": "API Sistema Administrativo Constructora",
  "version": "1.0.0"
}
```

✅ Backend is live!

---

## Part 3: ▲ Deploy Frontend to Vercel

### Step 1: Create Vercel Project

1. Go to https://vercel.com
2. Click **"Add New" → "Project"**
3. Import your `construccion-admin` repository
4. Vercel will auto-detect Vite

### Step 2: Configure Build Settings

Vercel should auto-configure, but verify:

```
Framework Preset: Vite
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```

### Step 3: Add Environment Variables

In Vercel project settings, go to **"Environment Variables"** and add:

```
VITE_API_URL=https://your-backend.up.railway.app
```

Replace `your-backend.up.railway.app` with your Railway URL from Part 2!

### Step 4: Deploy

1. Click **"Deploy"**
2. Wait for deployment (2-3 minutes)
3. Vercel will provide a URL like: `https://construccion-admin.vercel.app`

✅ Frontend is live!

---

## Part 4: 🔗 Connect Frontend & Backend

### Update Railway CORS

1. Go back to Railway dashboard
2. Open your backend project
3. Go to **"Variables"** tab
4. Update `CORS_ORIGIN` to your Vercel URL:
   ```
   CORS_ORIGIN=https://your-app.vercel.app
   ```
5. Railway will auto-redeploy

### Test the Connection

1. Visit your Vercel URL
2. Try navigating to different pages
3. Check if data loads (projects, clients, etc.)
4. Test creating a new item

✅ Everything should work!

---

## 🎯 Custom Domains (Optional)

### For Vercel (Frontend)

1. Go to Vercel project → Settings → Domains
2. Add your custom domain (e.g., `admin.tuconstruccion.com`)
3. Follow DNS configuration instructions
4. Wait for SSL certificate (automatic)

### For Railway (Backend)

1. Go to Railway project → Settings → Networking
2. Add custom domain (e.g., `api.tuconstruccion.com`)
3. Update DNS with provided CNAME
4. Update Vercel's `VITE_API_URL` to new domain

---

## 🔒 Environment Variables Reference

### Frontend (Vercel)

| Variable | Value | Description |
|----------|-------|-------------|
| `VITE_API_URL` | Railway URL | Backend API endpoint |

### Backend (Railway)

| Variable | Value | Description |
|----------|-------|-------------|
| `NODE_ENV` | production | Environment mode |
| `PORT` | 5000 | Server port |
| `CORS_ORIGIN` | Vercel URL | Allowed frontend origin |

---

## 🐛 Troubleshooting

### Frontend shows "Failed to fetch"
- ✅ Check `VITE_API_URL` in Vercel env vars
- ✅ Verify Railway backend is running
- ✅ Check browser console for errors

### CORS Errors
- ✅ Update `CORS_ORIGIN` in Railway to match Vercel URL
- ✅ Include `https://` in the URL
- ✅ Don't include trailing slash

### Backend not starting on Railway
- ✅ Check Railway logs for errors
- ✅ Verify `server/package.json` exists
- ✅ Check `nixpacks.toml` configuration

### Changes not showing
- ✅ Push to GitHub first
- ✅ Vercel/Railway auto-deploys from main branch
- ✅ Check deployment logs
- ✅ Clear browser cache (Cmd+Shift+R or Ctrl+Shift+R)

---

## 🔄 Making Updates

### To Update Your App

1. Make changes locally
2. Test locally first:
   ```bash
   npm run dev
   ```
3. Commit changes:
   ```bash
   git add .
   git commit -m "Description of changes"
   git push origin main
   ```
4. Vercel & Railway auto-deploy from GitHub!
5. Wait 2-3 minutes for deployment

---

## 💰 Pricing (Free Tier Limits)

### Vercel (Free Tier)
- ✅ Unlimited deployments
- ✅ 100 GB bandwidth/month
- ✅ Automatic HTTPS
- ✅ Perfect for this project!

### Railway (Free Tier)
- ✅ $5 credit/month (enough for this backend)
- ✅ 500 hours execution time
- ✅ 1 GB RAM
- ✅ Perfect for this project!

**Note:** Both free tiers are sufficient for this admin system!

---

## 📊 Monitoring

### View Logs

**Railway:**
- Dashboard → Your Project → Deployments → View Logs

**Vercel:**
- Dashboard → Your Project → Deployments → Function Logs

### Analytics

**Vercel:**
- Provides built-in analytics
- See visitor stats, performance metrics

---

## 🎉 Success Checklist

After deployment, verify:
- ✅ Frontend loads at Vercel URL
- ✅ Backend responds at Railway URL
- ✅ Dashboard shows data
- ✅ Can navigate all pages
- ✅ Can create new items (projects, users, etc.)
- ✅ No console errors
- ✅ Mobile responsive (test on phone)

---

## 🔮 Next Steps (Optional)

1. **Custom Domain**
   - Buy domain (e.g., Namecheap, GoDaddy)
   - Point to Vercel/Railway

2. **Database Integration**
   - Add PostgreSQL (Railway provides free database)
   - Migrate from in-memory data

3. **Authentication**
   - Add login system
   - JWT tokens
   - User sessions

4. **Monitoring**
   - Sentry for error tracking
   - Uptime monitoring
   - Performance metrics

---

## 📞 Support

### Vercel Docs
https://vercel.com/docs

### Railway Docs
https://docs.railway.app

### This Project Issues
Create an issue on GitHub if you encounter problems

---

## 🎯 Quick Reference

### Your URLs (Fill these in after deployment)

```
Frontend (Vercel): https://_________________________.vercel.app
Backend (Railway):  https://_________________________.up.railway.app
GitHub Repo:        https://github.com/____________/construccion-admin
```

---

**Status:** 📝 Ready to Deploy  
**Estimated Time:** 15-20 minutes  
**Difficulty:** Easy  
**Cost:** Free (both platforms have generous free tiers)

---

🚀 **You're ready to deploy to production!**

Follow the steps above and your construction admin system will be live in less than 20 minutes!
