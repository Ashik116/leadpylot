# Agent and Team Auto-Assignment Guide for Lead Import

## 📋 Overview

When you provide **Agent** and **Project/Team** information in your Excel file during lead import, the system will automatically assign leads to the specified agents in their respective projects/teams.

---

## 📊 Excel Column Names

### Required Columns for Auto-Assignment

You need to include these columns in your Excel file:

| Excel Column Name | Alternative Names | Description |
|-------------------|-------------------|-------------|
| **`Salesperson / Agent`** | `salesperson_agent` | The name of the agent to assign the lead to |
| **`Project`** | `project` | The name of the project/team where the agent belongs |

### Optional Columns (Bonus Features)

| Excel Column Name | Alternative Names | Description |
|-------------------|-------------------|-------------|
| **`Stage Name`** | `Stage`, `stage_name` | Stage to assign the lead to (e.g., "Qualification", "Proposal") |
| **`Status`** | `Status Name`, `status_name` | Status within the stage (e.g., "In Progress", "Pending") |

---

## 📝 Excel File Format Example

Here's how your Excel file should look:

| Contact Name | Email | Phone | Partner ID | Lead Date | Expected Revenue | **Salesperson / Agent** | **Project** | Stage Name | Status |
|--------------|-------|-------|------------|-----------|------------------|------------------------|-------------|------------|--------|
| John Doe | john@example.com | 1234567890 | P001 | 2025-11-26 | 50000 | **John Smith** | **Project Alpha** | Qualification | In Progress |
| Jane Smith | jane@example.com | 0987654321 | P002 | 2025-11-27 | 75000 | **Sarah Johnson** | **Project Beta** | Proposal | Pending |
| Bob Wilson | bob@example.com | 5555555555 | P003 | 2025-11-28 | 60000 | **Mike Davis** | **Project Alpha** | | |

**Note:** 
- Both **Salesperson / Agent** and **Project** must be provided for auto-assignment to work
- If either is missing, the lead will be imported without assignment
- Stage Name and Status are optional but will be assigned if provided

---

## 🔄 What Happens During Import

### Step-by-Step Process

1. **Excel File Parsing**
   - System reads the Excel file
   - Extracts `Salesperson / Agent` and `Project` columns
   - Maps them to lead data

2. **Agent Auto-Assignment Check** (Phase 3 of import)
   - For each lead with both agent and project specified:
     - ✅ **Finds the Project/Team** in database by name (must be active)
     - ✅ **Finds the Agent** within that project by name (matches both `name` and `alias_name` fields)
     - ✅ **Validates** that agent is active in the project

3. **If Agent and Project Found:**
   - ✅ Lead is **automatically assigned** to the agent
   - ✅ Lead is **linked to the project**
   - ✅ `use_status` is set to **`in_use`** (instead of `pending`)
   - ✅ Assignment record is created in `AssignLeads` collection
   - ✅ Lead gets `assigned_to`, `assigned_agent_name`, `assigned_date`, `assignment_status: 'auto_assigned'`
   - ✅ If Stage Name provided → Stage is assigned (created if doesn't exist)
   - ✅ If Status provided → Status is assigned within the stage (created if doesn't exist)

4. **If Agent or Project NOT Found:**
   - ⚠️ Lead is **imported without assignment**
   - ⚠️ Lead gets `use_status: 'pending'`
   - ⚠️ System logs a warning message
   - ⚠️ Lead continues through normal import process

---

## ✅ Success Scenario

### Example: Successful Auto-Assignment

**Excel Row:**
```
Contact Name: John Doe
Email: john@example.com
Salesperson / Agent: John Smith
Project: Project Alpha
```

**What Happens:**
1. System finds "Project Alpha" in database ✅
2. System finds "John Smith" in Project Alpha's agents list ✅
3. Lead is assigned to John Smith ✅
4. Lead is linked to Project Alpha ✅
5. Assignment record created ✅
6. Lead status: `in_use` ✅

**Result:**
- Lead appears in John Smith's assigned leads
- Lead is visible in Project Alpha
- Lead is ready for agent to work on

---

## ⚠️ Failure Scenarios

### Scenario 1: Project Not Found

**Excel Row:**
```
Salesperson / Agent: John Smith
Project: NonExistent Project
```

**What Happens:**
- ❌ Project "NonExistent Project" not found in database
- ⚠️ Lead imported without assignment
- ⚠️ Log message: `❌ PROJECT NOT FOUND: Project "NonExistent Project" not found`
- ✅ Lead still imported successfully (just not assigned)

### Scenario 2: Agent Not Found in Project

**Excel Row:**
```
Salesperson / Agent: Wrong Agent Name
Project: Project Alpha
```

**What Happens:**
- ✅ Project "Project Alpha" found
- ❌ Agent "Wrong Agent Name" not found in Project Alpha's agents
- ⚠️ Lead imported without assignment
- ⚠️ Log message: `❌ ASSIGNMENT FAILED: Agent "Wrong Agent Name" not found in project "Project Alpha"`
- ✅ Lead still imported successfully (just not assigned)

### Scenario 3: Missing Agent or Project

**Excel Row:**
```
Salesperson / Agent: John Smith
Project: (empty)
```

**What Happens:**
- ⚠️ Project is missing
- ⚠️ Lead skipped from auto-assignment check
- ✅ Lead imported with `use_status: 'pending'`
- ✅ Lead goes through normal import process

---

## 🎯 Agent Name Matching

The system matches agent names using **case-insensitive** comparison and checks both:

1. **`agent.name`** field
2. **`agent.alias_name`** field

**Example:**
- Excel: `"John Smith"`
- Database: `agent.name = "john smith"` → ✅ Match
- Database: `agent.alias_name = "John S."` → ✅ Match (if alias matches)
- Database: `agent.name = "Johnny Smith"` → ❌ No match

**Important:** Agent must be:
- ✅ Active (`agent.active = true`)
- ✅ Belong to the specified project
- ✅ Have a `user` field (linked to user account)

---

## 📋 Project/Team Name Matching

The system matches project names using **exact match** (case-sensitive):

**Example:**
- Excel: `"Project Alpha"`
- Database: `Team.name = "Project Alpha"` → ✅ Match
- Database: `Team.name = "project alpha"` → ❌ No match (case-sensitive)
- Database: `Team.name = "Project Alpha 2"` → ❌ No match

**Important:** Project must be:
- ✅ Active (`Team.active = true`)
- ✅ Exist in database

---

## 🎁 Bonus: Stage and Status Assignment

If you also provide **Stage Name** and **Status** in your Excel:

### Stage Name Column
- **Column Name:** `Stage Name`, `Stage`, or `stage_name`
- **Behavior:**
  - If stage exists → Assigns to existing stage
  - If stage doesn't exist → **Creates new stage automatically**
  - Flexible matching (case-insensitive, whitespace ignored)

### Status Column
- **Column Name:** `Status`, `Status Name`, or `status_name`
- **Behavior:**
  - If status exists in stage → Assigns to existing status
  - If status doesn't exist → **Creates new status automatically** within the stage
  - Flexible matching (case-insensitive, whitespace ignored)

### Special Status Handling

1. **Reklamation Stage:**
   - If `Stage Name = "Reklamation"` → `use_status` set to `'reclamation'`

2. **"Out" Status:**
   - If `Status = "out"` → Lead `active` set to `false`

---

## 📊 Import Result Information

After import, you'll see in the results:

### Success Indicators:
- ✅ `autoAssignedCount`: Number of leads auto-assigned
- ✅ `autoAssignedLeads`: Array of auto-assigned leads with details

### Log Messages:
- ✅ `🎯 AUTO-ASSIGNMENT: Lead "John Doe" has been auto-assigned to agent "John Smith" in project "Project Alpha"`
- ✅ `📊 AUTO-ASSIGNMENT DETAILS: Lead "John Doe" → Agent "John Smith" in Project "Project Alpha"`

### Failure Indicators:
- ⚠️ Leads imported but not assigned (check logs for reasons)
- ⚠️ Warning messages in logs about missing projects/agents

---

## 🔍 How to Verify Assignment

After import, check:

1. **Lead Record:**
   - `assigned_to`: Should contain agent's user ID
   - `assigned_agent_name`: Should contain agent name
   - `project_id`: Should contain project ID
   - `project_name`: Should contain project name
   - `use_status`: Should be `'in_use'` (not `'pending'`)

2. **Assignment Record:**
   - Check `AssignLeads` collection
   - Should have record with `lead_id`, `project_id`, `agent_id`, `status: 'active'`

3. **Agent View:**
   - Lead should appear in agent's assigned leads list
   - Lead should be visible in the project

---

## 📝 Complete Excel Example

Here's a complete example with all columns:

| Contact Name | Email | Phone | Partner ID | Lead Date | Expected Revenue | Salesperson / Agent | Project | Stage Name | Status |
|--------------|-------|-------|------------|-----------|------------------|---------------------|---------|------------|--------|
| John Doe | john@example.com | 1234567890 | P001 | 2025-11-26 | 50000 | John Smith | Project Alpha | Qualification | In Progress |
| Jane Smith | jane@example.com | 0987654321 | P002 | 2025-11-27 | 75000 | Sarah Johnson | Project Beta | Proposal | Pending |
| Bob Wilson | bob@example.com | 5555555555 | P003 | 2025-11-28 | 60000 | Mike Davis | Project Alpha | | |
| Alice Brown | alice@example.com | 1111111111 | P004 | 2025-11-29 | 40000 | | | | |

**Result:**
- Row 1: ✅ Auto-assigned to John Smith in Project Alpha with Stage and Status
- Row 2: ✅ Auto-assigned to Sarah Johnson in Project Beta with Stage and Status
- Row 3: ✅ Auto-assigned to Mike Davis in Project Alpha (no stage/status)
- Row 4: ⚠️ Imported without assignment (missing agent/project)

---

## ⚙️ Technical Details

### Code Location
- **Function:** `checkAgentAutoAssignment()` in `excel.js`
- **Called:** Phase 3 of import process (after duplicate checking, before lead creation)
- **Models Used:** `Team`, `Settings`, `AssignLeads`

### Assignment Record Structure
```javascript
{
  lead_id: ObjectId,
  project_id: ObjectId,
  agent_id: ObjectId,
  assigned_by: ObjectId (importing user),
  assigned_at: Date,
  status: 'active',
  notes: 'Auto-assigned during Excel import to agent...'
}
```

### Lead Fields Updated
```javascript
{
  assigned_to: agent.user (ObjectId),
  assigned_agent_name: agent.name,
  assigned_date: new Date(),
  assignment_status: 'auto_assigned',
  project_id: project._id,
  project_name: project.name,
  use_status: 'in_use',
  stage_id: stage._id (if stage provided),
  stage_name: stage.name (if stage provided),
  status_id: status._id (if status provided),
  status_name: status.name (if status provided)
}
```

---

## 🎯 Best Practices

1. **Use Exact Project Names:**
   - Match project names exactly as they appear in database
   - Case-sensitive matching

2. **Use Agent Names or Aliases:**
   - Can use either agent's `name` or `alias_name`
   - Case-insensitive matching

3. **Verify Before Import:**
   - Check that projects exist and are active
   - Check that agents exist in those projects
   - Verify agent names match exactly

4. **Provide Both Fields:**
   - Both `Salesperson / Agent` and `Project` are required
   - If one is missing, assignment won't happen

5. **Check Logs:**
   - Review import logs for assignment success/failure
   - Look for warning messages about missing projects/agents

---

## ❓ FAQ

**Q: Can I use agent email instead of name?**  
A: No, you must use the agent's name or alias_name as it appears in the project.

**Q: What if agent name has typos?**  
A: The system does case-insensitive matching, but typos will cause assignment to fail. The lead will still be imported without assignment.

**Q: Can I assign to multiple agents?**  
A: No, each lead can only be assigned to one agent. Use one row per lead.

**Q: What happens if project name is slightly different?**  
A: Project names must match exactly (case-sensitive). Slight differences will cause assignment to fail.

**Q: Can I use project ID instead of name?**  
A: No, you must use the project name as it appears in the database.

**Q: Will the lead be imported if assignment fails?**  
A: Yes, the lead will still be imported successfully, just without assignment. It will have `use_status: 'pending'`.

---

## 📞 Summary

**To enable auto-assignment:**
1. ✅ Add `Salesperson / Agent` column to Excel
2. ✅ Add `Project` column to Excel
3. ✅ Fill both columns for each lead you want to assign
4. ✅ Ensure project names match exactly (case-sensitive)
5. ✅ Ensure agent names match (case-insensitive, can use name or alias)

**Result:**
- ✅ Leads automatically assigned to agents
- ✅ Leads linked to projects
- ✅ Assignment records created
- ✅ Leads ready for agents to work on immediately

---

**Last Updated:** 2025-01-27  
**Code Location:** `backend/microservices/lead-offers-service/src/services/leadService/excel.js`

