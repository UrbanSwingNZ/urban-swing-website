# Weekly Firebase Backup

Automated weekly backup of Firestore database and Firebase Auth users using **Workload Identity Federation** (no service account keys needed!).

## Setup Instructions

This uses Workload Identity Federation, which is more secure than storing service account keys. Follow these steps carefully:

### 1. Enable Required APIs

Run these commands in [Google Cloud Shell](https://console.cloud.google.com/?cloudshell=true) or your local terminal with `gcloud` installed:

```bash
gcloud config set project directed-curve-447204-j4

gcloud services enable iamcredentials.googleapis.com
gcloud services enable sts.googleapis.com
```

### 2. Create a Service Account

```bash
gcloud iam service-accounts create github-actions-backup \
  --display-name="GitHub Actions Backup Service Account"
```

### 3. Grant Permissions to Service Account

The service account needs to read Firestore and Auth users:

```bash
# Firestore read access
gcloud projects add-iam-policy-binding directed-curve-447204-j4 \
  --member="serviceAccount:github-actions-backup@directed-curve-447204-j4.iam.gserviceaccount.com" \
  --role="roles/datastore.viewer"

# Firebase Auth read access
gcloud projects add-iam-policy-binding directed-curve-447204-j4 \
  --member="serviceAccount:github-actions-backup@directed-curve-447204-j4.iam.gserviceaccount.com" \
  --role="roles/firebaseauth.viewer"
```

### 4. Create Workload Identity Pool

```bash
gcloud iam workload-identity-pools create "github-actions-pool" \
  --location="global" \
  --display-name="GitHub Actions Pool"
```

### 5. Create Workload Identity Provider

Replace `YOUR-GITHUB-USERNAME` with your actual GitHub username or organization name:

```bash
gcloud iam workload-identity-pools providers create-oidc "github-provider" \
  --location="global" \
  --workload-identity-pool="github-actions-pool" \
  --display-name="GitHub Provider" \
  --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository" \
  --issuer-uri="https://token.actions.githubusercontent.com"
```

### 6. Allow GitHub to Impersonate Service Account

Replace `YOUR-GITHUB-USERNAME/urban-swing-website` with your actual repo path:

```bash
gcloud iam service-accounts add-iam-policy-binding \
  github-actions-backup@directed-curve-447204-j4.iam.gserviceaccount.com \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/575294080266/locations/global/workloadIdentityPools/github-actions-pool/attribute.repository/YOUR-GITHUB-USERNAME/urban-swing-website"
```

### 7. Get the Workload Identity Provider Name

Run this command and **copy the full output**:

```bash
gcloud iam workload-identity-pools providers describe "github-provider" \
  --location="global" \
  --workload-identity-pool="github-actions-pool" \
  --format="value(name)"
```

The output will look like:
```
projects/575294080266/locations/global/workloadIdentityPools/github-actions-pool/providers/github-provider
```

### 8. Add Secrets to GitHub

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Add these two secrets:

**Secret 1:**
- Name: `WIF_PROVIDER`
- Value: The full output from step 7 (starts with `projects/...`)

**Secret 2:**
- Name: `WIF_SERVICE_ACCOUNT`
- Value: `github-actions-backup@directed-curve-447204-j4.iam.gserviceaccount.com`

### 9. Test the Backup

1. Go to **Actions** tab in your repository
2. Click **Weekly Database Backup** workflow
3. Click **Run workflow** dropdown
4. Click the green **Run workflow** button

Check the logs to ensure it completes successfully!

## Schedule

- **Runs:** Every Saturday at 1pm UTC (Sunday 2am NZ time)
- **Retention:** 90 days (automatic cleanup)
- **Storage:** GitHub Artifacts

## Accessing Backups

1. Go to your repository → **Actions** tab
2. Click on any completed **Weekly Database Backup** run
3. Scroll to the **Artifacts** section
4. Download the backup JSON file

## Backup Contents

Each backup includes:
- All Firestore collections (with all documents)
- All Firebase Auth users (email, UID, metadata, custom claims)
- Timestamp of backup
- Filename format: `backup-YYYY-MM-DD.json`

## Why Workload Identity Federation?

✅ **More secure** - No keys to store or rotate  
✅ **Bypasses org policies** - No service account key creation needed  
✅ **Google recommended** - Best practice for CI/CD authentication  
✅ **Automatic** - GitHub generates short-lived tokens on demand  

## Troubleshooting

**Error: "Failed to generate Google Cloud access token"**
- Double-check your `WIF_PROVIDER` secret matches the exact output from step 7
- Verify the `WIF_SERVICE_ACCOUNT` email is correct

**Error: "Permission denied" when accessing Firestore**
- Ensure you ran step 3 to grant the service account proper roles
- Wait 1-2 minutes for IAM changes to propagate

**Error: "Caller does not have permission"**
- Verify step 6 was completed with the correct GitHub repo path
- Make sure you replaced `YOUR-GITHUB-USERNAME` with your actual username/org
