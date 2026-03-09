# ✅ Deployment Checklist

Quick checklist before deploying to Vercel & Railway.

---

## Before You Start

- [ ] All changes are saved
- [ ] Tested locally with `npm run dev`
- [ ] No console errors
- [ ] GitHub account ready
- [ ] Vercel account created (vercel.com)
- [ ] Railway account created (railway.app)

---

## Step 1: GitHub (5 minutes)

- [ ] Created GitHub repository
- [ ] Ran `git init`
- [ ] Ran `git add .`
- [ ] Ran `git commit -m "Initial commit"`
- [ ] Added remote with `git remote add origin`
- [ ] Pushed with `git push -u origin main`
- [ ] Verified code is on GitHub

---

## Step 2: Railway - Backend (5 minutes)

- [ ] Created new Railway project
- [ ] Connected GitHub repository
- [ ] Added environment variables:
  - [ ] `NODE_ENV=production`
  - [ ] `PORT=5000`
  - [ ] `CORS_ORIGIN=` (will update later)
- [ ] Deployment succeeded
- [ ] Copied Railway URL: `https://__________________.up.railway.app`
- [ ] Tested Railway URL in browser (shows API message)

---

## Step 3: Vercel - Frontend (5 minutes)

- [ ] Created new Vercel project
- [ ] Imported GitHub repository
- [ ] Framework detected: Vite ✓
- [ ] Added environment variable:
  - [ ] `VITE_API_URL=` (your Railway URL)
- [ ] Deployment succeeded
- [ ] Copied Vercel URL: `https://__________________.vercel.app`
- [ ] Opened Vercel URL in browser

---

## Step 4: Connect Frontend & Backend (2 minutes)

- [ ] Went back to Railway
- [ ] Updated `CORS_ORIGIN` to Vercel URL
- [ ] Waited for Railway to redeploy
- [ ] Tested Vercel app - data loads correctly

---

## Final Verification

- [ ] Dashboard loads
- [ ] Can view Proyectos
- [ ] Can view Presupuestos
- [ ] Can view Usuarios
- [ ] Can create new item
- [ ] No errors in console (F12)
- [ ] Works on mobile (test responsive)

---

## Your URLs

Write them here for reference:

```
Frontend: https://________________________________.vercel.app
Backend:  https://________________________________.up.railway.app
GitHub:   https://github.com/____________________/construccion-admin
```

---

## 🎉 Deployment Complete!

Your construction admin system is now live and accessible from anywhere!

### Share with your team:
1. Send them the Vercel URL
2. System is ready to use
3. Updates deploy automatically when you push to GitHub

---

## Need Help?

See `DEPLOYMENT.md` for detailed instructions and troubleshooting.
