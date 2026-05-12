- [ ] Fix firestore.rules: remove invalid references added during last attempt
- [ ] Implement correct company-scoped delete for users/{userId} by using a two-step approach:
  - keep strict delete only for users when the adminUid is admin in the target user's company.
- [ ] Ensure rules_version is correct and file parses.

