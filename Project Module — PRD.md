# Project Module — PRD

2026-09-19 · @Someone

## 1. Overview

The Project module introduces **Projects** as a new entity scoped under an Organization in Taskflow AI. A Project is a container for work (Tasks, in a future module) that belongs to exactly one Organization and has an explicit set of assigned Members.

This module builds directly on the completed Organization module (Owner/Admin/Member roles, `organization_members`) and intentionally **does not** introduce a Teams layer — Teams is deliberately skipped. Projects attach directly to the Organization and to individual Members.

## 2. Goals & Success Criteria

- Owners and Admins can create Projects within their Organization.
- Owners and Admins can assign specific Organization Members to a Project.
- Members only ever see Projects they are explicitly assigned to.
- Only the Owner has visibility into **all** Projects in the Organization; Admins see only Projects they created or are assigned to.
- No cross-tenant or cross-organization data leakage: a user can never see or act on a Project outside their Organization membership.
- Milestone ("done" definition): an Owner or Admin can create a Project, assign Members to it, and each assigned Member can fetch exactly the Projects they belong to — nothing more.

## 3. Scope

**In scope:**

- `projects` and `project_members` tables and their Sequelize associations
- Create / read / update / delete Projects (Owner/Admin only for write ops)
- Assign / remove Project Members (Owner/Admin only)
- Role-aware fetch logic: Owner sees all org Projects; Admin/Member see only assigned Projects
- `requireProjectAccess` authorization middleware
- Multi-tenant isolation enforcement on every Project route

**Out of scope (this module):**

- Teams (explicitly skipped — Projects attach directly to Organization + Members, no Teams layer)
- Tasks (planned as a future module, will nest under Projects)
- Project-level roles (e.g. project lead vs contributor) — deferred, `project_members` has no `role` column yet
- Comments, Files, Activity/audit history, Notifications, Real-time updates — future collaboration modules
- AI integration — postponed project-wide per existing decision

## 4. User Roles & Permissions

| Action | Owner | Admin | Member |
| --- | --- | --- | --- |
| Create project | Yes | Yes | No |
| Update project | Yes | Yes | No |
| Delete project | Yes | Yes | No |
| Assign / remove project members | Yes | Yes | No |
| View ALL organization projects | Yes | No | No |
| View own assigned projects | Yes (implicit) | Yes | Yes |

Role is always resolved server-side from `organization_members` — never trusted from the client, consistent with the existing Organization module's security principle.

## 5. Data Model

**`projects`**

| Column | Type | Constraints |
| --- | --- | --- |
| id | INTEGER/UUID | PK |
| organization\_id | INTEGER/UUID | FK → organizations.id, NOT NULL, ON DELETE CASCADE |
| name | VARCHAR(255) | NOT NULL |
| description | TEXT | NULLABLE |
| status | STRING/ENUM | NOT NULL, DEFAULT 'active' |
| created\_by | INTEGER/UUID | FK → users.id, NOT NULL |
| created\_at | DATETIME | NOT NULL |
| updated\_at | DATETIME | NOT NULL |

Index on `organization_id`; optional composite index on `(organization_id, status)`.

**`project_members`**

| Column | Type | Constraints |
| --- | --- | --- |
| id | INTEGER/UUID | PK |
| project\_id | INTEGER/UUID | FK → projects.id, NOT NULL, ON DELETE CASCADE |
| user\_id | INTEGER/UUID | FK → users.id, NOT NULL, ON DELETE CASCADE |
| created\_at | DATETIME | NOT NULL |
| updated\_at | DATETIME | NOT NULL |

Unique composite constraint on `(project_id, user_id)`. Index on `user_id` for the "projects assigned to this user" fetch.

**Associations**

```
Organization.hasMany(Project)
Project.belongsTo(Organization)

Project.belongsToMany(User, { through: ProjectMember })
User.belongsToMany(Project, { through: ProjectMember })

User.belongsTo(Project, { foreignKey: "created_by", as: "createdProjects" })
```

## 6. API Endpoints

```
POST   /api/v1/organizations/:organizationId/projects
       requireOrganizationRole(["owner","admin"])
       -> creates project + auto-adds creator to project_members (one transaction)

GET    /api/v1/organizations/:organizationId/projects
       requireOrganizationRole(["owner","admin","member"])
       -> Owner: all org projects. Admin/Member: only assigned projects.

GET    /api/v1/organizations/:organizationId/projects/:projectId
       requireOrganizationRole(["owner","admin","member"]) + requireProjectAccess()

PATCH  /api/v1/organizations/:organizationId/projects/:projectId
       requireOrganizationRole(["owner","admin"])

DELETE /api/v1/organizations/:organizationId/projects/:projectId
       requireOrganizationRole(["owner","admin"])

POST   /api/v1/organizations/:organizationId/projects/:projectId/members
       requireOrganizationRole(["owner","admin"])
       body: { userId }
       -> userId must already exist in organization_members for this org

DELETE /api/v1/organizations/:organizationId/projects/:projectId/members/:userId
       requireOrganizationRole(["owner","admin"])

GET    /api/v1/organizations/:organizationId/projects/:projectId/members
       requireOrganizationRole(["owner","admin","member"]) + requireProjectAccess()
```

## 7. Business Rules & Edge Cases

- A Project always belongs to exactly one Organization — never nullable, never reassignable to a different org.
- The creator (Owner or Admin) is auto-added to `project_members` at creation time in the same transaction, so an Admin who creates a Project can still see it afterward without needing Owner-level visibility.
- A user can only be assigned to a Project if they are already a member of that Project's Organization (validated against `organization_members`) — prevents cross-org assignment.
- `(project_id, user_id)` uniqueness prevents duplicate assignment.
- Removing a Member from the Organization should be considered against their existing Project assignments (decide: cascade-remove from projects, or leave orphaned — flagged in Open Questions).
- A Member with no Project assignments simply gets an empty list from `GET /projects` — not an error.
- requireProjectAccess: Owner bypasses the assignment check entirely; Admin and Member both require an explicit `project_members` row.

## 8. Security & Multi-tenancy Considerations

- Every Project route must resolve `organizationId` from the URL and verify the requester's membership/role via `organization_members` before touching the Project — never fetch a Project by ID alone and return it.
- `req.user.id` is always the source of truth for "who is acting" — never accept a `userId` from the request body for the actor.
- The `userId` being assigned to a Project (a *different* user) is legitimately in the body, but must be cross-checked against `organization_members` for that org before insertion.
- `requireProjectAccess` must verify the Project itself belongs to the `organizationId` in the URL, not just that the Project exists — otherwise a user could probe a `projectId` from a different org.
- No route should leak the existence of a Project the requester has no access to (return 403/404 consistently, not information that distinguishes "doesn't exist" from "exists but you can't see it" — align with existing forgot-password-style generic-response philosophy if desired).

## 9. Non-Functional Requirements

- Controllers stay thin; business logic (role branching, access checks) lives in helpers, mirroring the existing codebase philosophy.
- Reuse the existing `validation.js` / Zod pattern for request validation on Project create/update payloads.
- Reuse the existing authentication middleware pattern (`req.user`) — no new auth mechanism introduced.
- Project creation + creator-membership insert must be atomic (single DB transaction), matching the Organization-creation precedent.
- Indexing on `organization_id` and `user_id` (via `project_members`) to keep list queries performant as data grows.

## 10. Open Questions / Decisions Deferred

- ID strategy for `projects`/`project_members`: integer auto-increment vs UUID — should match whatever convention is already used across `organizations`/`users`.
- `status` field: plain string vs proper ENUM, and what the actual lifecycle values are.
- What happens to a Member's Project assignments when they're removed from the Organization entirely (cascade-remove vs leave orphaned)?
- Should Project deletion be hard or soft delete (ties into the same unresolved question for Organizations)?
- Project-level roles (e.g. project lead) — deferred, not part of this version.
- Should there be a cap on how many Projects a single Organization can create (relevant later for billing/plans, not now)?
