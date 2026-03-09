# SC-Nexus — Patch Notes

> **Discord message format** — Copy the content below to post in Discord.

---

```
📢 **SC-NEXUS UPDATE** — Quality & Security Patch

Hey everyone! We've rolled out a significant update focused on stability, security, and performance. Here's what changed:

━━━━━━━━━━━━━━━━━━━━━━━━━━
🔒 **SECURITY**
━━━━━━━━━━━━━━━━━━━━━━━━━━
• **Login security** — Login errors now show a generic "Invalid username or password" message instead of revealing whether a username exists. This prevents account enumeration attacks.
• **Input validation** — All API endpoints now validate request data with strict schemas. Invalid or malformed requests are rejected with clear error messages.
• **JSON handling** — Malformed JSON in API requests no longer crashes the server; you'll get a proper 400 error instead.

━━━━━━━━━━━━━━━━━━━━━━━━━━
⚡ **PERFORMANCE**
━━━━━━━━━━━━━━━━━━━━━━━━━━
• **Ledger loading** — The Ledger page now loads faster. We've optimized database queries to batch-fetch history and request items instead of making separate queries for each entry.
• **Delete operations** — Deleting a ledger entry no longer refetches the entire list unnecessarily.

━━━━━━━━━━━━━━━━━━━━━━━━━━
🐛 **BUG FIXES**
━━━━━━━━━━━━━━━━━━━━━━━━━━
• **Error boundaries** — Unhandled errors now show a friendly "Something went wrong" screen with a retry option instead of a blank page.
• **Ledger errors** — Failed fetches (e.g. network issues) are now displayed on the Ledger page so you know when something went wrong.
• **Delete confirmation** — Deleting a ledger entry now only refreshes the list if the delete actually succeeded.
• **CSV export** — Exported CSV files now properly escape commas, quotes, and newlines in values so they open correctly in Excel/Sheets.
• **Quantity inputs** — Fixed edge cases when entering quantity in the Ledger add/take forms (empty input, invalid numbers).

━━━━━━━━━━━━━━━━━━━━━━━━━━
♿ **ACCESSIBILITY**
━━━━━━━━━━━━━━━━━━━━━━━━━━
• **Screen readers** — Icon-only buttons (list/grid toggle, delete, dismiss error) now have proper labels for screen readers.
• **Error dismissal** — The error banner on the Ledger page has an accessible "Dismiss" button.

━━━━━━━━━━━━━━━━━━━━━━━━━━
🛠️ **UNDER THE HOOD**
━━━━━━━━━━━━━━━━━━━━━━━━━━
• **Consistent API errors** — All API routes now return errors in a standard format.
• **Shared form styles** — Input fields across the app now use a single, consistent style definition.
• **Auth helpers** — Role checks (admin, logistics, ops, etc.) are now centralized for cleaner code.

━━━━━━━━━━━━━━━━━━━━━━━━━━

If you notice any issues, please report them. Thanks for using SC-Nexus! 🚀
```
