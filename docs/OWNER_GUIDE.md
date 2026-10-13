# Owner Guide - Shamba Books

As the Owner, you have full access to all features of Shamba Books. This guide covers your responsibilities and workflows.

## Getting Started

1. **First Sign-In**: Sign in with your Google account (the email set in `VITE_OWNER_EMAIL`)
2. **Initial Setup**: Go to Settings to configure products, invite team members, and set preferences
3. **Seed Data**: Optionally run the seed script to create sample products and customers

## Daily Tasks

### 1. Monitor Dashboard
- Check today's sales totals
- Review cash and M-Pesa totals
- Monitor total debt owed to the shop
- Check for low stock alerts

### 2. Invite Team Members
1. Go to Settings > Team
2. Enter the team member's email address
3. Select their role (Attendant or Manager)
4. Click "Send Invite"
5. The team member can now sign in with Google

### 3. Manage Products
1. Go to Settings > Products
2. Add new products with name, category, unit, sell price, cost price, and reorder level
3. Edit existing products to update prices or costs
4. Cost prices are hidden from Attendants for security

### 4. Review and Void Transactions
- View all transactions in Analytics
- Void any sale if needed (requires reason)
- Voided transactions reverse stock and balance changes automatically
- All voids are logged in the audit trail

### 5. Close the Day
1. Go to Day Close
2. Select today's date
3. Review opening balances (auto-filled from previous close)
4. Review today's activity (sales, payments, expenses)
5. Enter counted cash and M-Pesa amounts
6. Add notes about the day
7. Click "Close Day"
8. Review variance (cash vs expected)

### 6. Reopen a Day (if needed)
- If a mistake was made in a closed day, you can reopen it
- Go to Day Close, select the date, and use the reopen option
- Make corrections and close again

## Weekly Tasks

### 1. Review Analytics
- Go to Analytics screen
- Select "This week" or "Last week"
- Review sales trends
- Check payment method breakdown
- Analyze expenses by category
- Identify top products and customers

### 2. Stock Management
- Review stock levels for low stock alerts
- Plan stock orders based on reorder levels
- Review wastage reports
- Check for expiring items

### 3. Debt Collection
- View customers with overdue debts
- Review debt aging buckets (0-7, 8-14, 15-30, 30+ days)
- Follow up with customers for payment
- Monitor collection rate

## Monthly Tasks

### 1. Financial Review
- Review monthly profit and loss
- Compare with previous months
- Analyze expense trends
- Review gross margins by product

### 2. Staff Performance
- Review sales count and value per user
- Check void rates per staff member
- Review cash variances by closing user
- Identify training needs

### 3. Stock Audit
- Conduct a full stocktake
- Compare counted vs system quantities
- Investigate significant variances
- Update stock if needed

## Settings Management

### General Settings
- Configure stock settings (allow negative stock, expiry alerts)
- Set debt thresholds and credit limits
- Configure auto-lock timeout

### Product Management
- Add new products
- Update prices and costs
- Set reorder levels
- Mark products as perishable with shelf life

### Team Management
- Invite new team members
- Change user roles
- Deactivate users who left
- Review last login times

### Data Export
- Export all data as JSON for backup
- Use exported data for external analysis
- Keep regular backups

## Security Best Practices

1. **Only invite trusted team members** with appropriate roles
2. **Review audit log regularly** for suspicious activity
3. **Monitor debt collection** to prevent bad debts
4. **Keep cost prices confidential** - only Managers and Owners can see them
5. **Revoke access immediately** when staff leave

## Troubleshooting

### User can't sign in
- Check if their email is in the users collection
- Verify their role is set correctly
- Ensure they're using the correct Google account

### Stock doesn't match physical count
- Run a stocktake to adjust
- Review stock movements for errors
- Check for unrecorded wastage or theft

### Cash variance at day close
- Review transactions for the day
- Check for unrecorded expenses
- Verify payment methods were recorded correctly
- Investigate any voids or edits

### High debt levels
- Review debt aging report
- Contact overdue customers
- Consider adjusting credit limits
- Improve collection procedures

## Analytics Insights

### Key Metrics to Track
- **Total Sales**: Daily, weekly, monthly trends
- **Gross Profit**: Revenue minus cost of goods
- **Net Profit**: Gross profit minus expenses
- **Debt Aging**: How long customers take to pay
- **Stock Turnover**: How fast stock sells
- **Collection Rate**: Percentage of debts collected

### Improving Business Performance
- **Increase Sales**: Analyze peak hours, promote slow-moving products
- **Reduce Waste**: Track wastage reasons, improve storage
- **Improve Collection**: Follow up on debts, offer prepayment incentives
- **Optimize Stock**: Use reorder alerts, adjust based on sales patterns
- **Control Expenses**: Review expense categories, find cost savings

## Support

For technical issues or questions:
- Check the main README.md
- Review other user guides
- Contact your development team
