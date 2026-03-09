# 🚀 Quick Start - Deploy in 15 Minutes

**Goal:** Get your construction admin system live on the internet!

---

## 📍 What You're Deploying

- **Frontend (React)** → Vercel (free)
- **Backend (API)** → Railway (free $5/month credit)

---

## 🎯 3 Simple Steps

### 1️⃣ Push to GitHub (3 min)

```bash
git init
git add .
git commit -m "Ready for deployment"
git remote add origin https://github.com/YOUR_USERNAME/construccion-admin.git
git push -u origin main
```

### 2️⃣ Deploy Backend to Railway (6 min)

1. Go to https://railway.app → "New Project"
2. Select your GitHub repo
3. Add environment variables:
   ```
   NODE_ENV=production
   PORT=5000
   CORS_ORIGIN=https://your-app.vercel.app
   ```
   (You'll update CORS_ORIGIN in step 3)
4. Copy the Railway URL

### 3️⃣ Deploy Frontend to Vercel (6 min)

1. Go to https://vercel.com → "New Project"
2. Import your GitHub repo
3. Add environment variable:
   ```
   VITE_API_URL=YOUR_RAILWAY_URL_FROM_STEP_2
   ```
4. Deploy!
5. Go back to Railway and update `CORS_ORIGIN` with your Vercel URL

---

## ✅ Done!

Visit your Vercel URL and your app is live! 🎉

---

## 📚 Need More Details?

See `DEPLOYMENT.md` for step-by-step instructions with screenshots.

See `DEPLOY-CHECKLIST.md` for a detailed checklist to follow.

---

**Time:** ~15 minutes  
**Cost:** $0 (both have free tiers)  
**Difficulty:** Easy
