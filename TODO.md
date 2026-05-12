- [ ] Update Firestore security rules so admin can delete `users/{uid}` based on the user’s `companies/{companyId}/employees/{uid}` membership (not on `users/{uid}.companyId`)
- [ ] Align `isUserAdmin()` to accept admin role from both `users/{uid}.role` and `companies/{companyId}/employees/{uid}.role`
- [ ] Apply delete authorization logic for `users/{userId}` and verify no other rule conflicts
- [ ] (Optional) Add quick guidance to redeploy rules and test delete

