# ContactInfoCard API Integration Guide

## How the API Works

### 1. API Endpoint

```
PUT /api/leads/:id
```

### 2. Request Format

```json
{
  "contact_name": "John Doe",
  "email_from": "john@example.com",
  "phone": "+1234567890"
}
```

### 3. Response Format

```json
{
  "_id": "lead_id",
  "contact_name": "John Doe",
  "email_from": "john@example.com",
  "phone": "+1234567890",
  "expected_revenue": 50000,
  "stage": "Qualified",
  "status": "Active"
  // ... other lead fields
}
```

## Implementation Flow

### 1. Frontend Hook (`useContactUpdate`)

```typescript
const { updateContact, isUpdating } = useContactUpdate({
  leadId: lead._id,
  onSuccess: (updatedLead) => {
    // Handle success
  },
});
```

### 2. API Service (`apiUpdateLead`)

```typescript
export async function apiUpdateLead(id: string, data: Partial<Lead>) {
  return ApiService.fetchDataWithAxios<Lead>({
    url: `/leads/${id}`,
    method: 'put',
    data,
  });
}
```

### 3. Backend Controller (`updateLead`)

```javascript
const updateLead = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { user } = req;

  // Check permissions
  if (!hasPermission(user.role, PERMISSIONS.LEAD_UPDATE)) {
    throw new AuthorizationError("You don't have permission to edit leads");
  }

  // Update lead data
  const updatedLead = await leadService.updateLeadData(id, req.body, user);

  return res.status(200).json(updatedLead);
});
```

### 4. Backend Service (`updateLeadData`)

```javascript
const updateLeadData = async (leadIds, updateData, user) => {
  return processBatchOperation(leadIds, async (lead) => {
    // Store original data for comparison
    const originalLead = { ...lead.toObject() };

    // Check if lead is in reclamation
    if (lead.reclamation_status && ['pending', 'accepted'].includes(lead.reclamation_status)) {
      throw new Error(`Cannot modify lead ${lead._id} because it is in reclamation process`);
    }

    // Check for actual changes
    let hasActualChanges = false;
    Object.entries(updateData).forEach(([key, value]) => {
      if (originalLead[key] !== value) {
        hasActualChanges = true;
      }
    });

    // Only update if there are changes
    if (!hasActualChanges) {
      return originalLead;
    }

    // Update the lead
    const updatedLead = await Lead.findByIdAndUpdate(lead._id, updateData, {
      new: true,
    });

    // Emit activity events
    if (user && hasActualChanges) {
      // Log field changes
      const fieldChanges = {};
      Object.keys(updateData).forEach((key) => {
        if (originalLead[key] !== updatedLead[key]) {
          fieldChanges[key] = {
            field: humanReadableFields[key] || key,
            oldValue: originalLead[key],
            newValue: updatedLead[key],
          };
        }
      });

      // Emit activity event
      eventEmitter.emit(EVENT_TYPES.LEAD.UPDATED, {
        lead: updatedLead,
        creator: user,
        changes: fieldChanges,
      });
    }

    return updatedLead;
  });
};
```

## Usage Examples

### 1. Single Field Update (Inline Editing)

```typescript
// User double-clicks on contact name
const updateData = { contact_name: 'New Name' };
await updateContact(updateData);
```

### 2. Multiple Fields Update (Save Changes Button)

```typescript
// User edits multiple fields and clicks save
const updateData = {
  contact_name: 'John Doe',
  email_from: 'john@example.com',
  phone: '+1234567890',
};
await updateContact(updateData);
```

## Error Handling

### 1. Permission Errors

```javascript
// Backend returns 403 if user lacks permission
if (!hasPermission(user.role, PERMISSIONS.LEAD_UPDATE)) {
  throw new AuthorizationError("You don't have permission to edit leads");
}
```

### 2. Reclamation Status Errors

```javascript
// Backend prevents updates if lead is in reclamation
if (lead.reclamation_status && ['pending', 'accepted'].includes(lead.reclamation_status)) {
  throw new Error(`Cannot modify lead ${lead._id} because it is in reclamation process`);
}
```

### 3. Frontend Error Handling

```typescript
try {
  await updateContact(updateData);
  // Show success notification
} catch (error) {
  // Show error notification
  console.error('Failed to update contact:', error);
}
```

## Activity Logging

The backend automatically logs all changes to the activity system:

```javascript
// Field changes are logged with human-readable names
const humanReadableFields = {
  contact_name: 'Contact Name',
  email_from: 'Email',
  phone: 'Phone Number',
  expected_revenue: 'Expected Revenue',
  // ... more fields
};

// Activity event includes:
eventEmitter.emit(EVENT_TYPES.LEAD.UPDATED, {
  lead: updatedLead,
  creator: user,
  changes: fieldChanges,
  changeDescription: "Contact Name changed from 'Old Name' to 'New Name'",
});
```

## Query Invalidation

The `useUpdateLead` hook automatically invalidates relevant queries:

```typescript
const { mutate: updateLead } = useUpdateLead(leadId);

// On success, these queries are invalidated:
// - ['lead', id] - Current lead data
// - ['leads'] - Leads list
// - ['infinite-activities'] - Activity feed
```

## Security Features

1. **Role-based Access Control**: Only users with `LEAD_UPDATE` permission can edit
2. **Reclamation Protection**: Leads in reclamation cannot be modified
3. **Activity Logging**: All changes are logged with user attribution
4. **Input Validation**: Backend validates all input data
5. **Change Detection**: Only actual changes trigger updates and logging

## Testing the API

### 1. Test with cURL

```bash
curl -X PUT http://localhost:3000/api/leads/lead_id \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_token" \
  -d '{
    "contact_name": "Test User",
    "email_from": "test@example.com"
  }'
```

### 2. Test in Browser Console

```javascript
// Open browser console on lead details page
// Find the ContactInfoCard component and test double-click editing
```

### 3. Test API Response

```javascript
// Expected successful response
{
  "_id": "lead_id",
  "contact_name": "Test User",
  "email_from": "test@example.com",
  "phone": "+1234567890",
  // ... other fields
}
```

## Troubleshooting

### Common Issues:

1. **Save not working**: Check if user has proper permissions
2. **API errors**: Check browser network tab for error details
3. **No changes detected**: Verify the field values are actually different
4. **Activity not logged**: Check if user object is properly passed to service

### Debug Steps:

1. Check browser console for JavaScript errors
2. Check network tab for API request/response
3. Check backend logs for server errors
4. Verify user permissions in database
5. Check if lead is in reclamation status
