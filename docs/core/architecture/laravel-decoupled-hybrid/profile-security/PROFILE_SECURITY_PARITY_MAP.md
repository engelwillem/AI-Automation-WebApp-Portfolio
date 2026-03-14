# Profile & Security Domain Parity Map

**Status:** Ready for Batch 1 Execution  
**Source of Truth:** `/docs/archive/TCT-Laravel-Legacy/resources/js/Pages/Profile.tsx`  
**Target:** `src/app/profile/page.tsx`

---

## 1. Core Flows & Pages

| Flow Name | Legacy Logic | Next.js Implementation | Status | Gap Key |
|---|---|---|---|---|
| **Profile Read** | Unified API Fetch | `ProfilePage.tsx` | **DONE** | Data sync via Sanctum active |
| **Avatar Update** | Multipart + PHP Mirror | `handleAvatarUpload` | **PARTIAL** | FormData proxy hardening needed |
| **Identity Update**| PATCH (Name/Email) | `handleProfileSave` | **DONE** | Persistent in MySQL |
| **Password Update**| PUT via PasswordCtrl | `handlePasswordUpdate` | **DONE** | Error handling parity needed |
| **2FA Lifecycle** | Multi-step (Setup/Verify) | `handleTwoFactorToggle` | **BLOCKER** | Uses `window.prompt` instead of UI |
| **Account Delete** | DELETE + Password Check | `handleDeleteAccount` | **PARTIAL** | Confirmation modal vs prompt |
| **Admin Gateway** | System Risk Logic | `opsGateway` object | **PARTIAL** | Risk score calculation parity |

---

## 2. Route & API Mapping

| Legacy Route | Next Route | API Proxy | Laravel Backend Endpoint |
|---|---|---|---|
| `GET /profile` | `GET /profile` | `/api/profile` | `GET /api/v1/profile` |
| `PATCH /profile` | `PATCH /api/profile` | `/api/profile` | `PATCH /api/v1/profile` |
| `PUT /password` | `PUT /api/profile/pass...`| `/api/profile/password`| `PUT /api/v1/profile/password` |
| `POST /2fa/setup` | `POST /api/profile/2fa/s..`| `/api/profile/two-factor/setup`| `POST /api/v1/profile/two-factor/setup`|
| `DELETE /2fa` | `DELETE /api/profile/2fa`| `/api/profile/two-factor`| `DELETE /api/v1/profile/two-factor`|
| `DELETE /profile` | `DELETE /api/profile` | `/api/profile` | `DELETE /api/v1/profile` |

---

## 3. Component Parity Audit

### A. Settings UI (`ProfilePage.tsx`)
- **Visual**: Card shadows and backdrop-blur density must match the new Community/Today standard (Batch 1 Style).
- **Hierarchy**: "Gateway Operasional" must be the top-most card for Admin users (Legacy parity).
- **Feedback**: Success/Error Toasts must be specific (e.g., "Sandi diperbarui" vs generic "Success").

### B. 2FA Management (Security Flow)
- **Visual**: Must render the QR Code SVG/Image inline within the accordion.
- **Interaction**: Must show "Recovery Codes" in a distinct 2-column grid with a "Copy All" feature.
- **Logic**: Ensure `current_password` is re-validated before any 2FA state change.

### C. Admin Gateway (Operational Visibility)
- **Data**: Must sync `riskScore` and `status` label with the backend `SettingsVisibilityController` logic.
- **Links**: Deep-links to `/admintalk` should be clearly identified as "Non-Inertia" (Full Page Reload).

---

## 4. Residual Gaps (Profile Specific)

1.  **Avatar Mirroring**: Ensure that when a user updates an avatar in Next.js, the backend's `syncPublicAvatarMirror` logic is triggered correctly so legacy Blade pages (VerseHub) see the same image.
2.  **Session Invalidation**: Global logout (Revoking all tokens) needs to be tested to ensure multi-device security parity.
3.  **Spiritual Badge**: The "Journey Badge" count (Favorites/Notes) needs to be accurately pulled from the unified `VersehubActionController`.

---

## 5. Profile Batch 1 Execution Scope

To reach `PARITY DONE`, this batch will:

1.  **Build Real 2FA UI**: Replace all `window.prompt` calls with inline forms, QR code displays, and recovery code grids.
2.  **Harden Avatar Upload**: Test and refine the `multipart/form-data` proxying to ensure file integrity.
3.  **Sync Admin Gateway**: Fully wire the Gateway card to the real risk metrics from the backend.
4.  **Refine Error States**: Ensure validation errors from Laravel (e.g., "Password mismatch") are displayed clearly under the respective fields.

**Verdict: READY FOR BATCH 1 EXECUTION**
*The security foundations are stable; the focus now is on moving from "API Utility" to "Premium UX".*
