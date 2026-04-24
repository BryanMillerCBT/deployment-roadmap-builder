# Automated Testing

## Initial Tests

### Test 1 — Auth, RLS, and Realtime (PR #1)

**Scope:** Sign-in flow, roadmap persistence, row-level security, save error handling, and realtime sync.

**Steps:**

1. Open the app and click **Sign in**. Enter your email address and check your inbox for the magic link. Click the link and confirm you are returned to the app as an authenticated user, your email is shown in the auth bar, and the roadmap dropdown appears.

2. Enter a name in the roadmap name field and click **Save**. Confirm the roadmap appears in the dropdown selector.

3. Sign in with a second user account. Confirm that the first user's roadmaps are not visible in the dropdown and cannot be accessed or modified.

4. With a roadmap open, disable your network connection and click **Save**. Confirm an error alert is displayed with a meaningful message.

5. Open the same roadmap in two browser tabs. Make a change in one tab (add or move a feature) and save. Confirm the change appears in the second tab without a page refresh.

**Expected result:** All five steps pass without errors.
