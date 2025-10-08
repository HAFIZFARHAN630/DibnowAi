# Deployment Checklist - Plan Activation Feature

## Pre-Deployment

### 1. Code Review
- [ ] Review all modified files:
  - [ ] `src/controllers/pricingController.js`
  - [ ] `src/controllers/adminrequestController.js`
  - [ ] `view/index.ejs`
- [ ] Verify no syntax errors
- [ ] Check all console.log statements are appropriate
- [ ] Ensure error handling is comprehensive

### 2. Environment Setup
- [ ] Verify `.env` file has all required variables:
  ```
  STRIPE_SECRET_KEY=sk_...
  STRIPE_PUBLISHABLE_KEY=pk_...
  STRIPE_MODE=live
  
  PAYPAL_CLIENT_ID=...
  PAYPAL_CLIENT_SECRET=...
  PAYPAL_MODE=live
  
  PAYFAST_MERCHANT_ID=...
  PAYFAST_MERCHANT_KEY=...
  PAYFAST_PASSPHRASE=...
  
  APP_BASE_URL=https://yourdomain.com
  ```
- [ ] Test environment variables are loaded correctly
- [ ] Verify MongoDB connection string is correct

### 3. Database Backup
- [ ] Backup `payments` collection
- [ ] Backup `planrequests` collection
- [ ] Backup `users` collection
- [ ] Backup `transactions` collection
- [ ] Store backup in safe location with timestamp

### 4. Dependencies
- [ ] Run `npm install` to ensure all packages are installed
- [ ] Verify no package vulnerabilities: `npm audit`
- [ ] Check Node.js version compatibility

## Testing Phase

### 5. Local Testing
- [ ] Test Stripe payment flow
  - [ ] Select BASIC plan
  - [ ] Complete payment
  - [ ] Verify dashboard shows "Active + Paid"
  - [ ] Check database records created correctly

- [ ] Test PayPal payment flow
  - [ ] Select STANDARD plan
  - [ ] Complete payment
  - [ ] Verify dashboard shows "Active + Paid"
  - [ ] Check database records created correctly

- [ ] Test Manual payment flow
  - [ ] Select PREMIUM plan
  - [ ] Submit transfer details
  - [ ] Verify dashboard shows "Pending + Unpaid"
  - [ ] Login as admin
  - [ ] Approve payment
  - [ ] Verify dashboard shows "Active + Paid"

- [ ] Test Free Trial
  - [ ] Register new user
  - [ ] Verify Free Trial auto-assigned
  - [ ] Check 7-day expiry set correctly

### 6. Staging Environment Testing
- [ ] Deploy to staging server
- [ ] Test all payment flows on staging
- [ ] Verify email notifications work
- [ ] Test admin panel functionality
- [ ] Check mobile responsiveness
- [ ] Test with different browsers:
  - [ ] Chrome
  - [ ] Firefox
  - [ ] Safari
  - [ ] Edge

### 7. Performance Testing
- [ ] Test with multiple concurrent users
- [ ] Check database query performance
- [ ] Verify no memory leaks
- [ ] Test payment gateway response times

## Deployment

### 8. Pre-Deployment Steps
- [ ] Notify team about deployment
- [ ] Schedule deployment during low-traffic period
- [ ] Prepare rollback plan
- [ ] Have database backup ready

### 9. Deployment Steps
1. [ ] Stop application server
2. [ ] Pull latest code from repository
3. [ ] Run `npm install` (if dependencies changed)
4. [ ] Verify `.env` file is correct
5. [ ] Start application server
6. [ ] Check application logs for errors
7. [ ] Verify application is running

### 10. Post-Deployment Verification
- [ ] Test homepage loads correctly
- [ ] Test user login
- [ ] Test pricing page loads
- [ ] Make a test payment (small amount)
- [ ] Verify payment success
- [ ] Check dashboard displays correctly
- [ ] Test admin panel access
- [ ] Verify manual payment approval works

## Monitoring

### 11. Initial Monitoring (First 24 Hours)
- [ ] Monitor error logs every 2 hours
- [ ] Check payment success rate
- [ ] Monitor database performance
- [ ] Track user feedback
- [ ] Watch for any unusual activity

### 12. Metrics to Track
- [ ] Total payments processed
- [ ] Payment success rate by gateway:
  - [ ] Stripe success rate
  - [ ] PayPal success rate
  - [ ] PayFast success rate
- [ ] Manual payment approval time
- [ ] Plan activation time
- [ ] User complaints/issues

### 13. Error Monitoring
- [ ] Set up alerts for:
  - [ ] Payment failures
  - [ ] Database errors
  - [ ] API timeouts
  - [ ] 500 errors
- [ ] Monitor console logs for warnings
- [ ] Track failed payment attempts

## Documentation

### 14. User Documentation
- [ ] Update user guide with new payment flow
- [ ] Create FAQ for common payment issues
- [ ] Document manual payment process
- [ ] Add screenshots of new dashboard

### 15. Admin Documentation
- [ ] Update admin guide with approval process
- [ ] Document how to handle payment disputes
- [ ] Create troubleshooting guide
- [ ] Add common admin tasks

### 16. Developer Documentation
- [ ] Update API documentation
- [ ] Document database schema changes
- [ ] Add code comments where needed
- [ ] Update README.md

## Support

### 17. Support Team Preparation
- [ ] Train support team on new features
- [ ] Provide troubleshooting guide
- [ ] Set up support ticket categories
- [ ] Create response templates

### 18. User Communication
- [ ] Send email to existing users about new features
- [ ] Update website with new payment options
- [ ] Post announcement on social media
- [ ] Update help center articles

## Rollback Plan

### 19. If Issues Occur
- [ ] Have previous version code ready
- [ ] Know how to restore database backup
- [ ] Document rollback steps:
  1. Stop application
  2. Restore previous code version
  3. Restore database backup (if needed)
  4. Restart application
  5. Verify old version works
- [ ] Notify users of temporary issues

## Post-Deployment

### 20. Week 1 Review
- [ ] Review all error logs
- [ ] Analyze payment success rates
- [ ] Gather user feedback
- [ ] Identify any issues
- [ ] Plan fixes for issues found

### 21. Week 2-4 Monitoring
- [ ] Continue monitoring metrics
- [ ] Optimize slow queries
- [ ] Improve error messages
- [ ] Enhance user experience based on feedback

### 22. Monthly Review
- [ ] Review overall performance
- [ ] Analyze payment trends
- [ ] Plan feature improvements
- [ ] Update documentation

## Success Criteria

### 23. Deployment is Successful If:
- [ ] Payment success rate > 95%
- [ ] No critical errors in logs
- [ ] Dashboard displays correctly for all users
- [ ] Admin panel works smoothly
- [ ] Manual payment approval < 24 hours
- [ ] User satisfaction > 90%
- [ ] No data loss or corruption

## Emergency Contacts

### 24. Key Contacts
- [ ] Lead Developer: _______________
- [ ] Database Admin: _______________
- [ ] DevOps Engineer: _______________
- [ ] Support Lead: _______________
- [ ] Product Manager: _______________

## Sign-Off

### 25. Approval
- [ ] Code reviewed by: _______________ Date: ___________
- [ ] Testing completed by: _______________ Date: ___________
- [ ] Deployment approved by: _______________ Date: ___________
- [ ] Production deployment by: _______________ Date: ___________

---

## Quick Reference

### Important URLs
- Production: https://yourdomain.com
- Staging: https://staging.yourdomain.com
- Admin Panel: https://yourdomain.com/package-request
- Pricing Page: https://yourdomain.com/pricing

### Important Files
- Main Controller: `src/controllers/pricingController.js`
- Admin Controller: `src/controllers/adminrequestController.js`
- Dashboard View: `view/index.ejs`
- Admin View: `view/PlanRequest/request.ejs`

### Database Collections
- `payments` - Active paid plans
- `planrequests` - All plan requests
- `users` - User information
- `transactions` - Transaction history

### Support Commands
```bash
# View application logs
pm2 logs

# Restart application
pm2 restart app

# Check database connection
mongo --eval "db.adminCommand('ping')"

# View recent payments
mongo yourdb --eval "db.payments.find().sort({createdAt:-1}).limit(10)"
```

---

**Last Updated**: January 2025
**Version**: 1.0
**Status**: Ready for Deployment
