# Inbox & Messaging Domain Parity Map

**Status:** Ready for Batch 1 Execution  
**Source of Truth:** `/docs/archive/TCT-Laravel-Legacy/resources/js/Pages/Inbox/*`  
**Target:** `src/app/inbox/**`

---

## 1. Core Flows & Pages

| Flow Name | Legacy Logic | Next.js Implementation | Status | Gap Key |
|---|---|---|---|---|
| **Thread List** | 3-Tab System (Primary/Gen/Req) | `inbox/page.tsx` | **PARTIAL** | Mismatch in follow-based tab sorting |
| **Message Thread** | Chronological Bubbles | `inbox/[id]/page.tsx` | **PARTIAL** | Sync gap in "read_at" updates |
| **Message Send** | Persistent via MySQL | `DirectMessageController` | **DONE** | Hardened in Batch 0 residual |
| **Approval Flow** | Request Gating (Strangers) | `inbox/page.tsx` | **NOT STARTED** | UI for "Approve/Reject" missing |
| **Read/Unread** | Visual Bold/Pill State | Component Logic | **PARTIAL** | Cross-tab sync (Popover vs Page) |
| **Polling/Sync** | 7s interval refresh | `useAuthPing` / `ChatPopover` | **PARTIAL** | Thread-specific polling missing |

---

## 2. Route & API Mapping

| Legacy Route | Next Route | API Proxy | Laravel Backend Endpoint |
|---|---|---|---|
| `GET /inbox` | `GET /inbox` | `/api/inbox` | `GET /api/v1/inbox` |
| `GET /inbox/{user}` | `GET /inbox/[id]` | `/api/inbox/[id]` | `GET /api/v1/inbox/{id}` |
| `POST /inbox/messages`| `POST /api/inbox/mes...`| `/api/inbox/messages` | `POST /api/v1/inbox/messages` |
| `POST /.../approve` | `POST /api/.../approve`| `/api/inbox/messages/{id}/approve` | `POST /api/v1/inbox/messages/{id}/approve` |
| `POST /inbox/read-all`| `POST /api/inbox/re...` | `/api/inbox/read-all` | `POST /api/v1/inbox/read-all` |

---

## 3. Component Parity Audit

### A. Conversation List (`inbox/page.tsx`)
- **Visual**: Unread items must have a `ring-1 ring-brand/30` border (Legacy parity).
- **Tab Logic**: 
    - **Primary**: Mutual follows.
    - **General**: Followed by user, or stranger but approved.
    - **Requests**: Unapproved messages from strangers.
- **Data**: Must fetch real partner "last_seen_at" to show Online status accurately.

### B. Chat Thread (`inbox/[id]/page.tsx`)
- **Visual**: Bubbles must use `rounded-br-none` (Mine) vs `rounded-bl-none` (Theirs) at 28px radius.
- **Interaction**: Auto-scroll to bottom only on first load or new message (avoiding scroll-jacking).
- **State**: Sending state must show a "..." indicator or subtle opacity until the server confirms the ID.

### C. Popover Bridge (`ChatPopover.tsx`)
- **Visual**: Must match the dashboard "Today" glassmorphism density.
- **Logic**: Marking all as read in the Popover must instantly reflect in the main Inbox page if open (cross-component sync).

---

## 4. Residual Gaps (Inbox Specific)

1.  **Follow State Awareness**: The "Follow" button inside chat threads must be wired to the new `/api/users/[id]/follow` proxy.
2.  **Infinite Scroll**: Chat threads with >50 messages currently don't handle "Load More" smoothly. **Tindakan**: Implement intersection observer for `paging.next_before_id`.
3.  **Media Previews**: Next.js currently ignores attachments. Legacy allows image paths. **Tindakan**: Re-enable image rendering in bubbles.
4.  **Desktop Split-Pane**: Legacy is mobile-first but stable on wide screens. Next.js must ensure the `max-w-2xl` container doesn't look "lost" on ultra-wide monitors.

---

## 5. Inbox Batch 1 Execution Scope

To reach `PARITY DONE`, this batch will:

1.  **Un-mock Thread List**: Replace the `inbox` state with a real fetch from `/api/inbox`.
2.  **Implement Request Flow**: Add the "Approve Request" UI for the `requests` tab.
3.  **Harden Thread Polling**: Add a `setInterval` inside `[id]/page.tsx` that stops when the tab is hidden.
4.  **Sync Read State**: Ensure visiting `/inbox/[id]` triggers the `read_at` update in MySQL.

**Verdict: READY FOR BATCH 1 EXECUTION**
*The follow logic and message sending plumbing are already active from the Batch 0 residual hardening.*
