# VPS Deployment - Visual Guide

## 🗺️ Deployment Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     LOCAL MACHINE                                │
│                                                                  │
│  1. Commit Code                                                  │
│     ├─ git add .                                                 │
│     ├─ git commit -m "feat: audit trail"                        │
│     └─ git push origin main                                      │
│                           │                                       │
└───────────────────────────┼───────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                        VPS SERVER                                │
│                                                                  │
│  2. SSH Connection                                               │
│     ssh username@vps-ip                                          │
│     cd /path/to/Process-Sutra-2026                              │
│                           │                                       │
│  3. Backup Phase          ▼                                      │
│     ├─ Code: cp -r . ../backup-$(date)                          │
│     └─ Database: pg_dump > backup.sql                           │
│                           │                                       │
│  4. Pull Code             ▼                                      │
│     git pull origin main                                         │
│                           │                                       │
│  5. Run Migration         ▼                                      │
│     psql -f migrations/0009_add_audit_logs.sql                  │
│                           │                                       │
│     Creates:              ▼                                      │
│     ┌──────────────────────────────────────────┐               │
│     │       audit_logs TABLE                    │               │
│     │  ├─ id (UUID)                            │               │
│     │  ├─ actor_id (FK → users)                │               │
│     │  ├─ action (VARCHAR)                     │               │
│     │  ├─ target_type (VARCHAR)                │               │
│     │  ├─ old_value (TEXT)                     │               │
│     │  ├─ new_value (TEXT)                     │               │
│     │  ├─ ip_address (VARCHAR)                 │               │
│     │  └─ created_at (TIMESTAMP)               │               │
│     │                                           │               │
│     │  Indexes:                                 │               │
│     │  ├─ idx_actor_id                         │               │
│     │  ├─ idx_action                           │               │
│     │  ├─ idx_created_at (DESC)                │               │
│     │  ├─ idx_target_type                      │               │
│     │  └─ idx_target_id                        │               │
│     └──────────────────────────────────────────┘               │
│                           │                                       │
│  6. Rebuild App           ▼                                      │
│     npm install                                                  │
│     npm run build                                                │
│                           │                                       │
│  7. Restart App           ▼                                      │
│     pm2 restart process-sutra                                    │
│                           │                                       │
│  8. Verify                ▼                                      │
│     ├─ curl /api/health                                         │
│     ├─ psql -c "\d audit_logs"                                  │
│     └─ pm2 logs                                                  │
│                           │                                       │
└───────────────────────────┼───────────────────────────────────────┘
                            ▼
                    ✅ DEPLOYMENT COMPLETE
```

---

## 📊 Data Flow - Audit Logging

```
┌─────────────────────────────────────────────────────────────────┐
│              SUPER ADMIN PERFORMS ACTION                         │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                  HTTP REQUEST                                    │
│  PUT /api/super-admin/organizations/:id/status                  │
│  Headers: Authorization: Bearer <token>                          │
│  Body: { isActive: false }                                       │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│              MIDDLEWARE CHAIN                                    │
│  1. isAuthenticated     ✓ Verify Firebase token                │
│  2. requireSuperAdmin   ✓ Check isSuperAdmin = true             │
│  3. superAdminLimiter   ✓ Check rate limit (100/15min)         │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│              ROUTE HANDLER                                       │
│  1. Get old value       → await storage.getOrganization(id)     │
│  2. Perform action      → await storage.updateOrgStatus(...)    │
│  3. Create audit log    → await storage.createAuditLog({        │
│                              actorId: req.user.id,              │
│                              action: "TOGGLE_ORG_STATUS",       │
│                              oldValue: JSON.stringify(...),     │
│                              newValue: JSON.stringify(...),     │
│                              ipAddress: req.ip,                 │
│                              userAgent: req.headers["..."]      │
│                           })                                     │
│  4. Return response     → res.json(organization)                │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│              DATABASE                                            │
│  organizations table:    UPDATE is_active = false               │
│  audit_logs table:       INSERT new log entry                   │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│              RESPONSE                                            │
│  Status: 200 OK                                                  │
│  Body: { id: "org_123", name: "...", isActive: false }         │
│  Headers:                                                        │
│    RateLimit-Limit: 100                                         │
│    RateLimit-Remaining: 99                                      │
│    RateLimit-Reset: 1703001234                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Rate Limiting Flow

```
Request 1-100:  ✅ ALLOWED (Status 200)
                │
                ▼
         ┌──────────────┐
         │ Rate Limiter │  Remaining: 99, 98, 97... 1, 0
         └──────────────┘
                │
Request 101:    ▼
                ❌ BLOCKED (Status 429)
                │
                ▼
         "Too many super admin requests.
          Please wait before trying again."
                │
                ▼
         Wait 15 minutes...
                │
                ▼
         Counter resets → Back to 100 requests
```

---

## 📁 File Structure After Deployment

```
Process-Sutra-2026/
│
├── 📄 README.md
├── 📄 package.json (express-rate-limit dependency)
├── 📄 .env (no changes)
│
├── migrations/
│   ├── 0001_add_webhooks.sql
│   ├── 0002_add_task_cancellation_fields.sql
│   ├── 0003_add_notifications_table.sql
│   ├── ...
│   └── 0009_add_audit_logs.sql ✨ NEW
│
├── shared/
│   └── schema.ts ⚡ UPDATED
│       ├── auditLogs table definition
│       ├── insertAuditLogSchema validation
│       └── InsertAuditLog, AuditLog types
│
├── server/
│   ├── storage.ts ⚡ UPDATED
│   │   ├── createAuditLog() method
│   │   └── getAuditLogs() method
│   │
│   └── routes.ts ⚡ UPDATED
│       ├── superAdminLimiter middleware
│       └── Audit logging in 4 endpoints
│
├── 📚 DOCUMENTATION (NEW)
│   ├── AUDIT_TRAIL_IMPLEMENTATION.md (15 pages)
│   ├── AUDIT_TRAIL_QUICK_REFERENCE.md (4 pages)
│   ├── DEPLOYMENT_GUIDE_AUDIT_TRAIL.md (20 pages)
│   ├── DEPLOYMENT_CHECKLIST.md
│   ├── READY_TO_DEPLOY.md
│   └── DEPLOYMENT_VISUAL_GUIDE.md (this file)
│
└── 🔧 DEPLOYMENT SCRIPTS (NEW)
    ├── deploy-audit-trail.sh (Linux/Mac)
    └── deploy-audit-trail.ps1 (Windows)
```

---

## 🎯 Deployment Options Comparison

```
┌──────────────────────────────────────────────────────────────────┐
│              AUTOMATED DEPLOYMENT                                 │
│  ✅ Pros:                                                         │
│     • Faster (5-10 minutes)                                      │
│     • Automatic backup                                           │
│     • Automatic verification                                     │
│     • Less human error                                           │
│     • Consistent process                                         │
│                                                                  │
│  ⚠️ Cons:                                                         │
│     • Need to configure script first                            │
│     • Less control                                              │
│                                                                  │
│  📝 Command:                                                      │
│     ./deploy-audit-trail.sh                                      │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│              MANUAL DEPLOYMENT                                    │
│  ✅ Pros:                                                         │
│     • Full control                                               │
│     • See each step                                              │
│     • No script configuration                                    │
│     • Can pause/resume                                           │
│                                                                  │
│  ⚠️ Cons:                                                         │
│     • Slower (15-30 minutes)                                     │
│     • More steps to remember                                     │
│     • Higher chance of mistakes                                  │
│                                                                  │
│  📝 Commands:                                                     │
│     git pull                                                     │
│     pg_dump > backup.sql                                         │
│     psql -f migrations/0009_add_audit_logs.sql                  │
│     pm2 restart process-sutra                                    │
└──────────────────────────────────────────────────────────────────┘
```

---

## 🧪 Testing Flow

```
1. Health Check
   curl /api/health
   ├─ ✅ Server responds
   └─ ✅ Status 200
          │
          ▼
2. Database Check
   psql -c "\d audit_logs"
   ├─ ✅ Table exists
   ├─ ✅ 14 columns
   └─ ✅ 6 indexes
          │
          ▼
3. Super Admin Endpoint
   curl -H "Auth: ..." /api/super-admin/organizations
   ├─ ✅ Status 200
   └─ ✅ Rate limit headers present
          │
          ▼
4. Audit Log Creation
   Toggle org status → Check database
   ├─ ✅ Audit log entry created
   ├─ ✅ Actor captured
   ├─ ✅ Old/new values logged
   └─ ✅ IP address captured
          │
          ▼
5. Rate Limiting
   Make 101 requests
   ├─ ✅ First 100 succeed (200)
   └─ ✅ 101st fails (429)
          │
          ▼
   ✅ ALL TESTS PASSED
```

---

## 🔍 Monitoring Dashboard

```
┌─────────────────────────────────────────────────────────────────┐
│                    PM2 MONITORING                                │
│                                                                  │
│  process-sutra              │ online │ 0h │ 0% │ 150 MB │       │
│                                                                  │
│  Recent Logs:                                                    │
│  ✅ [routes] registerRoutes invoked                             │
│  ✅ Successfully connected to PostgreSQL database               │
│  ✅ Firebase Auth ready                                         │
│  ✅ serving on 127.0.0.1:5000                                   │
│                                                                  │
│  Audit Logs (Last 24h):                                         │
│  ├─ TOGGLE_ORG_STATUS: 5                                        │
│  ├─ CHANGE_USER_STATUS: 3                                       │
│  ├─ UPDATE_ORGANIZATION: 2                                      │
│  └─ PROMOTE_SUPER_ADMIN: 1                                      │
│                                                                  │
│  Rate Limiting:                                                  │
│  └─ No 429 responses (all within limits)                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## ⚡ Quick Commands Reference

### Before Deployment
```bash
# Local: Commit and push
git add . && git commit -m "feat: audit trail" && git push

# VPS: Backup
ssh user@vps "cd /app && cp -r . ../backup-$(date +%Y%m%d)"
```

### During Deployment
```bash
# Pull and migrate
git pull origin main
psql -d processsutra -f migrations/0009_add_audit_logs.sql

# Restart
pm2 restart process-sutra
```

### After Deployment
```bash
# Verify
curl http://localhost:5000/api/health
psql -d processsutra -c "SELECT COUNT(*) FROM audit_logs;"
pm2 logs --lines 50
```

---

## 🎉 Success Indicators

```
✅ Server Status
   └─ Green light in PM2/systemd
   └─ No error logs
   └─ Health endpoint responds

✅ Database
   └─ audit_logs table exists
   └─ 14 columns present
   └─ 6 indexes active

✅ Functionality
   └─ Super admin actions work
   └─ Audit logs being created
   └─ Rate limiting active

✅ Performance
   └─ Response time < 200ms
   └─ No memory leaks
   └─ CPU usage normal
```

---

## 📞 Emergency Contacts

```
Issue Type              Action
────────────────────────────────────────────
Migration fails         Check TROUBLESHOOTING section
Server won't start      Check logs, rollback code
Database errors         Restore backup
Rate limiting issues    Check middleware applied
Audit logs not created  Check storage methods
```

---

## 🚀 Final Go/No-Go Checklist

```
✅ Documentation reviewed
✅ Deployment window scheduled
✅ Team notified
✅ Backups ready
✅ Rollback plan prepared
✅ Verification commands ready
✅ Monitoring setup
✅ All tests passed locally

🎯 READY FOR DEPLOYMENT
```

---

**Last Updated**: December 2024  
**Version**: 1.0  
**Status**: Production Ready  
**Next Action**: Choose deployment method and execute
