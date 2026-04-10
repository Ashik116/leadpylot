# LeadPylot Admin User Manual

Prepared from the current frontend structure on March 25, 2026.

Audience: Admin users

Scope: This guide explains the admin role in plain language. Some pages only appear if your company has that module enabled.

## 1. What an Admin Can Do

An admin is responsible for the main setup and control of the system. In LeadPylot, admins typically:

- bring leads into the system
- manage users, roles, and offices
- control workflow settings such as sources, stages, banks, payment terms, and templates
- review lead, task, offer, and document activity
- manage communication tools such as mail, notifications, and Telegram bots
- monitor reporting, security, and telephony tools

## 2. First Steps After Login

- Sign in with your admin account.
- Admin users normally land on the `Leads` dashboard first.
- The left menu is divided into:
  - `Workflow`
  - `Admin Menu`
  - `Reportings`

If your company uses only part of the platform, some pages may be hidden.

## 3. How to Use Most Screens

Most admin pages work in a similar way.

- Use the search bar to find records quickly.
- Click a column header to sort.
- Use filters to narrow down results.
- Click a row to open details in a side panel or editor.
- Use checkboxes for bulk actions where available.
- Use pagination at the bottom to move between pages.
- On many screens, the right side panel is where you create or edit records.

## 4. Main Menu Overview

### Workflow

- `Import`: upload lead or offer files
- `Leads`: manage all leads, pending leads, archived leads, live leads, recycle leads, and leads bank
- `Offers`: manage offer records
- `Meetings` / `Termin`: manage appointments and meeting flow
- `Calendar`: review scheduled activity by date
- `Kanban`: move tasks visually across boards and lists
- `Mails`: work in the shared email workspace
- `Communication`: internal communication area if enabled
- `Todo`: manage todos linked to leads
- `Documents`: upload, assign, archive, and restore documents
- `Openings`: review offer progress after offer stage
- `Projects`: maintain project records
- `Reclamations`: manage complaint or reclamation records
- `Calls`: review call history, recordings, and live monitoring
- `Tickets`: manage ticket-style work items

### Admin Menu

- `Tenants`: manage organizations or environments
- `Users`: manage user accounts
- `Permissions`: manage roles and role permissions
- `Offices`: manage office locations and office members
- `Banks`: maintain bank records and restrictions
- `Sources`: maintain lead sources and source pricing
- `Mail Servers`: maintain email server connections
- `VOIP Servers`: maintain telephony server connections
- `Payment Terms`: maintain payment term options
- `Bonus Amount`: maintain reusable bonus settings
- `Stages`: maintain lead workflow stages
- `Predefined Tasks`: maintain reusable task and checklist templates
- `Email Templates`: maintain reusable email content
- `PDF Templates`: upload and map PDF templates
- `Security`: monitor login and blocking activity
- `Table Settings`: control default columns, layouts, grouping, and filters
- `Bot Setting`: manage Telegram bot setup
- `Notification Rules`: control who receives what notifications
- `Form Leads`: review website form submissions before sending them into Leads
- `Form Lead Config`: whitelist allowed websites for form intake
- `Form Lead Test`: test form submission format
- `Push Notification Test`: technical push notification utility

### Reportings

- `Reportings`: analyze performance by agent, project, and other groupings

## 5. Daily Admin Workflows

### A. Import leads from a file

Use this when you receive a spreadsheet or partner export.

1. Open `Workflow > Import`.
2. Choose `Import Leads` or `Import Offers`.
3. If you are importing leads, select a `Source`.
4. Review the source price. You can use the default price or set a custom price for this import.
5. Upload the file.
6. Start the import.
7. Wait for the result or progress dialog to finish.
8. Review:
   - imported records
   - failed records
   - duplicates
9. If needed, use `Download Failed Records`.
10. Open `Pending Leads`, `Offers`, or the linked result page to review the import.

Important:

- Lead import requires a source.
- Offer import does not use the same source step.
- Do not close or leave the page while an import is running.

### B. Receive website leads safely

Use this when your website or WordPress form sends leads into the platform.

1. Open `Admin Menu > Form Lead Config`.
2. Add the website URL to the allowed site list.
3. Optionally use `Form Lead Test` to simulate a submission.
4. Open `Admin Menu > Form Leads`.
5. Review incoming form submissions.
6. Select the records you want to move into the main CRM.
7. Click `Send to leads`.

This flow helps you check website leads before they enter the main lead list.

### C. Work and review leads

The leads area is the main operating workspace.

- `All Leads`: full working list
- `Pending Leads`: newly imported or review-needed leads
- `Archived Leads`: older or closed-out records
- `Live Leads`: active live source leads
- `Recycle Leads`: recycled or returned leads
- `Leads Bank`: reserve-style lead storage, if your team uses it

Common admin actions:

- search and filter leads
- group leads by project, source, user, or other fields
- open a lead to view details
- assign or transfer leads
- run bulk updates
- log notes or follow-up items
- move between list view and detail view

### D. Manage todos and tickets

There are three task-related areas:

- `Todo`: lead-linked todo work
- `Tickets`: ticket-style work tracking
- `Admin Todos`: admin-only operational todo management, if enabled by direct link

What you can do:

- review pending and completed work
- filter by ownership, status, or source
- switch between table and card-style views where available
- open work items and update them
- manage automatic todo templates for offer-related work

### E. Use Kanban for visual task control

The Kanban page is for drag-and-drop task management.

Typical use:

1. Open `Workflow > Kanban`.
2. Select the board you want to work in.
3. Use the left side inbox to add or review tasks.
4. Create lists on the board if needed.
5. Drag a task from inbox to a list, or between lists.
6. Click a card to open full details.

Inside a card, users can typically work with:

- title and description
- assigned members
- due dates
- checklists
- comments
- attachments

### F. Manage offers, openings, and follow-through

The system separates work into stages after a lead becomes active.

- `Offers`: proposal or offer management
- `Openings`: next operational stage after offers
- `Documents`: supporting document library and assignment
- `Reclamations`: complaint or issue handling

For documents:

1. Open `Workflow > Documents`.
2. Upload files into the library.
3. Assign them to a lead or an offer.
4. Filter by `Library`, `Assigned`, or `Archived`.
5. Open assignment history to see where a document has been used.
6. Restore archived documents when needed.

## 6. User and Access Management

### Users

Open `Admin Menu > Users`.

Admins can:

- create a new user
- edit user details
- assign a role
- assign one or more offices
- set a primary office
- change a user password
- activate or deactivate a user
- manage Telegram notification linking
- control the `unmask` setting

Important:

- In this system, deleting a user usually means setting the user to `Inactive`, not removing them forever.
- You can switch between active and inactive user views.

### Roles and Permissions

Open `Admin Menu > Permissions`.

Admins can:

- create a role from scratch
- create a role from a template
- edit role name, display name, description, and color
- clone a role
- open the permission matrix and turn permissions on or off
- review audit logs for role changes
- sync or refresh role cache

Important:

- The built-in `Admin` system role is protected and cannot be freely modified.
- Use cloning when you want a safe copy of an existing role.

### Offices

Open `Admin Menu > Offices`.

Admins can:

- create office locations
- edit office details
- assign members to an office
- manage office capacity and contact details

Use offices when your team works across branches, countries, or departments.

### Tenants

Open `Admin Menu > Tenants`.

This is an advanced admin area for multi-organization setups.

Admins can:

- create a new tenant
- choose tenant type: `Agent`, `Manager`, or `Admin`
- set the tenant domain
- activate or suspend a tenant
- adjust request limits
- rotate the API key

Important:

- Tenant type and domain cannot be changed after creation.
- The tenant API key is sensitive. Save it securely when it is first shown.
- Rotating the key immediately invalidates the old one.

## 7. Business Setup and Master Data

### Sources

Open `Admin Menu > Sources`.

Use this page to manage where leads come from.

Typical admin tasks:

- create a new source
- set or update source price
- connect a source to a provider
- keep names consistent for reporting and imports

### Banks

Open `Admin Menu > Banks`.

Use this page to maintain banking and financial partner records.

Available fields include:

- bank name and nickname
- country and address
- contact details
- IBAN, SWIFT, account, and code details
- limits
- project assignments
- allowed or restricted agent access
- commission settings

### Payment Terms

Open `Admin Menu > Payment Terms`.

Use this page to keep standardized payment term options available across the system.

### Bonus Amount

Open `Admin Menu > Bonus Amount`.

Use this page to maintain reusable bonus settings such as names, codes, and amounts.

### Stages

Open `Admin Menu > Stages`.

Use this page to manage lead workflow stages.

Admins can:

- add or rename stages
- mark whether a stage is a winning stage
- define allowed statuses inside a stage

### Predefined Tasks

Open `Admin Menu > Predefined Tasks`.

Use this page to create reusable task structures.

Admins can define:

- task title
- description
- priority
- category
- tags
- checklist or todo items
- active or inactive status

This helps standardize repeated work.

## 8. Communication and Notification Setup

### Mail Servers

Open `Admin Menu > Mail Servers`.

Use this page to manage email server connections used by the platform.

### VOIP Servers

Open `Admin Menu > VOIP Servers`.

Use this page to manage telephony server connections.

### Mails

Open `Workflow > Mails`.

This is the shared email workspace. It uses a multi-column layout and supports team email work.

Depending on setup, users may work with:

- inbox
- sent
- archived mail
- pending mail
- conversation view
- compose window
- sync progress

### Email Templates

Open `Admin Menu > Email Templates`.

Use this page to create reusable email content.

Templates can include:

- template name
- content
- variables
- optional signature

### Notification Rules

Open `Admin Menu > Notification Rules`.

Use this page to control who receives notifications for events such as:

- leads
- offers
- email
- authentication
- projects
- tasks and tickets
- documents
- system events

Admins can:

- search for a rule
- filter by category
- enable or disable a rule
- edit who receives it
- test a rule
- reset a rule to default

### Bot Setting

Open `Admin Menu > Bot Setting`.

Use this page to manage Telegram bots used by the system.

Admins can:

- create a bot
- choose bot type
- assign allowed roles
- set notification types
- test the connection
- activate or deactivate the bot
- edit or delete the bot

### User Telegram Management

From `Users`, admins can also manage Telegram per user.

You can:

- see whether a user linked their Telegram account
- enable or disable Telegram notifications
- unlink a Telegram account
- guide the user through the linking process

## 9. PDF and Document Setup

### PDF Templates

Open `Admin Menu > PDF Templates`.

Use this page to manage PDF forms and document templates.

Admins can:

- upload a template
- review template status: `Draft`, `Mapping`, `Active`, or `Archived`
- open field mapping
- download the original template
- delete old templates

A mapped PDF template is used when the system fills data into a PDF automatically.

### Fonts

If your installation uses custom fonts for PDFs, a separate `Fonts` page may also be available by direct link.

## 10. Reporting

Open `Reportings`.

This page is used to review performance and drill into results.

Admins can:

- switch between `Live`, `Recycle`, or `All`
- group reports by agents or projects
- apply a date range
- sort report tables
- open drill-down views
- export reporting data to Excel

The reporting area can show totals such as:

- leads
- offers
- openings
- confirmations
- payments
- netto stages
- conversion rates
- investment totals

## 11. Security and Monitoring

### Security

Open `Admin Menu > Security`.

This page helps admins monitor access and suspicious activity.

Tabs include:

- dashboard
- failed logins
- login history
- active sessions / agent board
- blocked IPs
- blocked devices

Use this area when you need to investigate access issues or secure the system.

### Calls

Open `Workflow > Calls`.

Admins can use this page to:

- review call history
- listen to call recordings
- download recordings
- use live monitoring tools
- review supervisor action history

## 12. Table Settings

Open `Admin Menu > Table Settings`.

Use this page when you want to standardize what users see in major tables.

Admins can control:

- default visible columns
- column order
- user-specific layouts
- shared default layouts
- grouping settings
- default filters

This is useful when you want all users to see the same operational layout.

## 13. Telephony and Advanced Utilities

Depending on your installation, you may also have direct-link admin pages for:

- `FreePBX Extensions`
- `FreePBX Trunks`
- `Inbound Routes`
- `Outbound Routes`
- `Email System`
- `Admin Todos`
- `Recent Imports`
- `Push Notification Test`

These are usually advanced setup or support tools.

Examples:

- `FreePBX Extensions`: create extensions, assign extension role, edit voicemail and related settings
- `FreePBX Trunks`: create or edit telephony trunks and reload FreePBX configuration
- `Email System`: review incoming emails by mail server, approve pending emails, and refresh sync data
- `Admin Todos`: review grouped admin todos and configure automatic todo templates
- `Push Notification Test`: check permission, token, and browser push behavior

## 14. Recommended Admin Routines

### Start of day

- check `Pending Leads`
- check `Todo` and `Tickets`
- review `Mails`
- review urgent `Notifications`
- review `Calls` or `Security` if your team uses them heavily

### When onboarding a new staff member

1. Create the user.
2. Assign the correct role.
3. Assign office and primary office if needed.
4. Set the initial password.
5. Confirm Telegram setup if your company uses it.
6. Confirm the user can access the correct dashboards.

### When adding a new lead source

1. Create the source.
2. Set price and provider.
3. If website-based, add the site in `Form Lead Config`.
4. Test intake with `Form Lead Test` if needed.
5. Run a small import before using it at full scale.

### When changing workflow logic

Review these pages together:

- `Stages`
- `Predefined Tasks`
- `Notification Rules`
- `Table Settings`
- `Email Templates`
- `PDF Templates`

## 15. Troubleshooting Guide

### A user cannot log in

- check `Security`
- confirm the user is active
- confirm the correct role is assigned
- reset the password if needed

### Imported records did not fully load

- open the import result summary
- download failed records
- review duplicates
- verify source selection and file format

### Website form leads are not appearing

- confirm the site is listed in `Form Lead Config`
- test using `Form Lead Test`
- check `Form Leads`

### A user cannot see a menu or page

- review the user role
- review the role permissions
- confirm the feature is enabled in your organization

### Notifications are not being received

- check `Notification Rules`
- check user Telegram linking if Telegram is used
- test the bot connection in `Bot Setting`
- use `Push Notification Test` for browser notification issues

### Documents are missing

- check the `Documents` filter: `Library`, `Assigned`, or `Archived`
- review assignment history
- restore archived documents if needed

## 16. Glossary

- `Lead`: a contact or opportunity entering the system
- `Source`: where the lead came from
- `Pending Lead`: a lead waiting for review after intake or import
- `Offer`: a proposal or commercial offer connected to a lead
- `Opening`: a later workflow stage after offer handling
- `Todo`: a work item attached to a lead or workflow
- `Ticket`: a structured service or operational work item
- `Stage`: a major step in the workflow
- `Tenant`: an organization or environment inside a multi-tenant setup

## 17. Final Notes

- This manual reflects the current frontend structure, not every possible backend customization.
- Your company may not use every module listed here.
- If you want a client-facing manual, team SOP, or screenshot-based version next, this document can be expanded into that format.
