# Deployment Guide

Deploy your Lost2Found application to the cloud for free or low cost.

## Quick Start - Free Hosting Options

### Option 1: Vercel (Recommended - Free)

**Vercel is the easiest and free for static + serverless.**

1. **Create Vercel Account**
   - Go to https://vercel.com
   - Sign up with GitHub account

2. **Deploy**
   - Click "New Project"
   - Select your GitHub repository
   - Click "Deploy"
   - Wait for build to complete

3. **Your app is live!**
   - Vercel gives you a free URL like: `https://lost2found.vercel.app`

4. **Configure Environment Variables**
   - Go to Project Settings → Environment Variables
   - Add your `.env` variables

**Note:** Vercel is optimized for Next.js. For Express apps, consider other options.

---

### Option 2: Heroku (Free Alternative)

**Heroku offers free tier with limitations.**

1. **Create Heroku Account**
   - Go to https://www.heroku.com
   - Sign up for free

2. **Install Heroku CLI**
   ```bash
   # Windows: Download from https://devcenter.heroku.com/articles/heroku-cli
   # Mac: brew tap heroku/brew && brew install heroku
   # Linux: curl https://cli-assets.heroku.com/install.sh | sh
   ```

3. **Login to Heroku**
   ```bash
   heroku login
   ```

4. **Create & Deploy**
   ```bash
   # Create app
   heroku create lost2found-app

   # Set environment variables
   heroku config:set SESSION_SECRET=your-secret
   heroku config:set CLOUDINARY_CLOUD_NAME=your-name

   # Deploy
   git push heroku main
   ```

5. **View your app**
   ```bash
   heroku open
   ```

---

### Option 3: Replit (Free - Best for Learning)

**Replit is easy and free for learning/testing.**

1. Go to https://replit.com
2. Click "Create" → "Import from GitHub"
3. Enter your repo URL
4. Click "Import"
5. Click "Run" to start
6. Replit gives you a free URL to share

---

### Option 4: Railway (Free Credits)

**Railway offers $5/month free credit**

1. Go to https://railway.app
2. Login with GitHub
3. Create New Project → Deploy from GitHub
4. Select your repository
5. Railway auto-deploys on every push

---

## Local to Production Checklist

Before deploying, ensure:

- [ ] `.env` variables are correct
- [ ] `package.json` has all dependencies listed
- [ ] Server runs locally: `npm start`
- [ ] No hardcoded passwords or secrets
- [ ] Error handling is in place
- [ ] `NODE_ENV=production` in `.env`

---

## Deployment Steps (Universal)

### 1. Prepare Your Code

```bash
# Make sure everything works locally
npm install
npm start

# Test all features before pushing
```

### 2. Push to GitHub

```bash
# Create repository on GitHub
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/your-username/Lost2Found.git
git push -u origin main
```

### 3. Choose Hosting & Connect GitHub

Most platforms auto-detect `npm start` and deploy automatically.

### 4. Set Environment Variables

In your hosting platform dashboard:
- `CLOUDINARY_CLOUD_NAME=your_cloud_name`
- `CLOUDINARY_API_KEY=your_api_key`
- `CLOUDINARY_API_SECRET=your_api_secret`
- `SESSION_SECRET=your-long-random-string`
- `NODE_ENV=production`
- `PORT=` (auto-set by platform)

### 5. Deploy

Click "Deploy" button - Done! 🎉

---

## Upgrading to Production Database

### From lowdb to MongoDB (Recommended for Production)

1. **Get MongoDB Atlas (Free Tier)**
   - Go to https://www.mongodb.com/cloud/atlas
   - Create account
   - Create free cluster
   - Get connection string

2. **Update Code**

   Replace `db.js`:
   ```javascript
   const mongoose = require('mongoose');

   async function init() {
     const uri = process.env.MONGODB_URI;
     if (!uri) throw new Error('MONGODB_URI not set');
     
     await mongoose.connect(uri);
     console.log('Connected to MongoDB');
   }

   module.exports = { mongoose, init };
   ```

3. **Add to package.json dependencies**
   ```json
   "mongoose": "^8.0.0",
   "connect-mongo": "^5.1.0"
   ```

4. **Set environment variable**
   - In hosting dashboard: `MONGODB_URI=your_connection_string`

5. **Redeploy**
   - Platform auto-detects and redeploysDone! 

---

## Performance Tips for Production

1. **Enable GZIP Compression**
   ```javascript
   const compression = require('compression');
   app.use(compression());
   ```

2. **Add MongoDB for Scaling**
   - lowdb: Good for <1000 users
   - MongoDB: Good for 1000+ users

3. **Add Redis for Sessions**
   - Keep sessions out of memory
   - Share sessions across servers

4. **Enable HTTPS**
   - All hosting platforms provide free SSL
   - Ensure SESSION_SECRET is strong

5. **Rate Limiting**
   ```bash
   npm install express-rate-limit
   ```

---

## Troubleshooting Deployment

### App crashes after deploy
- Check logs: `heroku logs --tail`
- Verify environment variables are set
- Make sure all dependencies in `package.json`

### Database connection errors
- Check `MONGODB_URI` format
- Verify IP whitelist in MongoDB Atlas
- Test connection locally first

### Port issues
- Platform auto-sets PORT env variable
- Don't hardcode port, use: `process.env.PORT || 3000`

### Image uploads not working
- Verify Cloudinary credentials
- Check CLOUDINARY_CLOUD_NAME is set
- Test locally first

### Session issues
- Generate strong `SESSION_SECRET`
- Use MongoDB store for multi-server deployment
- Set `secure: true` for HTTPS only

---

## Cost Breakdown

| Hosting | Database | Cost/Month |
|---------|----------|-----------|
| Vercel Free | MongoDB Free | $0 |
| Heroku Free | PostgreSQL Free | $0 |
| Railway | PostgreSQL Free | $0 |
| Replit | SQLite | $0 |
| Production | MongoDB Paid | $9-57+ |

---

## Recommended Setup

### For Learning/Testing:
- **Hosting:** Replit or Railway
- **Database:** Built-in lowdb
- **Cost:** $0

### For Small Scale (100-1000 users):
- **Hosting:** Vercel or Railway
- **Database:** MongoDB Atlas Free
- **Cost:** $0

### For Large Scale (1000+ users):
- **Hosting:** AWS/Google Cloud
- **Database:** MongoDB Atlas Paid
- **Cost:** $100-500+/month

---

## Post-Deployment

1. **Monitor**
   - Check logs regularly
   - Monitor uptime
   - Track errors

2. **Update**
   - Keep dependencies updated
   - Push fixes quickly
   - Use auto-deploy on git push

3. **Backup**
   - Export MongoDB data regularly
   - Keep GitHub repo updated
   - Document changes

---

## Need Help?

1. Check platform documentation
2. Review deployment logs
3. Test locally before pushing
4. Ask in community forums
5. Consult platform support

---

## Next Steps

After deployment:
1. ✅ Visit your live URL
2. ✅ Test registration & login
3. ✅ Report a test item
4. ✅ Share URL with others
5. ✅ Collect feedback

Congratulations on deploying Lost2Found! 🎉
