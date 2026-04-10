# Drag-and-Drop Debugging Guide

## Current Issue

The `snapshot.isDraggingOver` is not triggering in `DataTable.tsx` for certain drop zones (specifically Payment table), which means the border highlighting doesn't appear and drops fail.

## Debug Logging Added

I've added console logs to help diagnose the issue:

### 1. In `OpeningsMultiTable.tsx`:

**handleDragUpdate:**
```typescript
console.log('🔄 handleDragUpdate:', {
  destination: update.destination?.droppableId,
  source: update.source?.droppableId,
});
```

**handleDragEnd:**
```typescript
console.log('🎯 handleDragEnd called:', {
  source: source?.droppableId,
  destination: destination?.droppableId,
  draggableId: result.draggableId,
});
```

### 2. In `DataTable.tsx`:

**Droppable render:**
```typescript
if (snapshot.isDraggingOver) {
  console.log(`✅ Droppable ${dragDropTableId} - isDraggingOver:`, snapshot.isDraggingOver);
}
```

## How to Debug

1. **Open your browser console**
2. **Try dragging from Opening → Payment**
3. **Watch for these logs:**

### Expected Output:
```
🔄 handleDragUpdate: { destination: "payment", source: "opening" }
✅ Droppable payment - isDraggingOver: true
🎯 handleDragEnd called: { source: "opening", destination: "payment", ... }
📋 Table IDs: { sourceTableId: "opening", destTableId: "payment" }
```

### If Payment Droppable is NOT detected:
```
🔄 handleDragUpdate: { destination: null, source: "opening" }  ❌ Problem!
```

This means the Droppable is not registering as a valid drop zone.

## Possible Issues & Solutions

### Issue 1: Fixed Height Container Blocking Drops

**Symptom:** `handleDragUpdate` shows `destination: null` even when hovering over the payment table.

**Cause:** The fixed height container (`max-h-[300px]`) or scrollable wrapper is preventing the drop zone from being detected.

**Solution:** Add `pointer-events` handling:

```typescript
// In OpeningsMultiTable.tsx - TableWrapper
<div
  style={{
    position: 'relative',
    overflow: 'visible',  // ← Make sure this allows drop detection
    pointerEvents: 'auto', // ← Ensure mouse events are captured
  }}
>
```

### Issue 2: Z-Index Stacking Context

**Symptom:** Drop works for some tables but not others.

**Cause:** Z-index or stacking context issues preventing certain Droppables from being hit-tested.

**Solution:** Ensure all tables have the same stacking context:

```typescript
// Remove any conflicting z-index in table containers
style={{
  position: 'relative',
  // zIndex: 'auto', // Let all tables be on the same level
}}
```

### Issue 3: Scroll Container Blocking

**Symptom:** Can't drop when table is scrolled or has overflow.

**Cause:** The scroll container (`overflow-y-auto` in TBody) might be preventing drop detection.

**Solution:** Ensure Droppable is properly sized:

```typescript
<TBody
  ref={provided.innerRef}
  {...provided.droppableProps}
  style={{
    maxHeight: '100%',
    height: 'auto',
    minHeight: '100px', // ← Ensure minimum height for drop target
    position: 'relative',
  }}
>
```

### Issue 4: Empty Table

**Symptom:** Can't drop when destination table is empty.

**Cause:** Droppable collapses to 0 height when there are no rows.

**Solution:** Add minimum height and placeholder:

```typescript
// In DataTable.tsx
<TBody
  style={{
    minHeight: '200px', // ← Ensure drop zone is visible even when empty
  }}
>
  {noData ? (
    <Tr>
      <Td>
        <div style={{ minHeight: '200px' }}>No data found!</div>
      </Td>
    </Tr>
  ) : (
    // ... rows
  )}
  {provided.placeholder} {/* ← Important! */}
</TBody>
```

## Quick Fix to Try

Based on the most common issue (empty/small drop zones), try this quick fix:

### In `DataTable.tsx` - Add minimum height to Droppable TBody:

```typescript
<TBody
  ref={provided.innerRef}
  {...provided.droppableProps}
  className={classNames(
    'overflow-y-auto',
    snapshot.isDraggingOver && 'drop-zone-active bg-blue-50/50 border-2 border-blue-500 border-dashed'
  )}
  style={{
    maxHeight: '100%',
    height: 'auto',
    minHeight: '150px', // ← Add this!
    position: 'relative',
  }}
>
```

## Test Steps

1. **Test with empty Payment table:**
   - Clear all payment items
   - Try dragging from Opening → Payment
   - The border should still appear even if Payment is empty

2. **Test with populated Payment table:**
   - Add some payment items
   - Try dragging from Opening → Payment
   - The border should appear when hovering

3. **Test different table combinations:**
   - Opening → Confirmation ✓
   - Opening → Payment ✓
   - Opening → Netto 2 ✓
   - Opening → Lost ✓
   - Confirmation → Payment ✓
   - Confirmation → Netto 2 ✓
   - Confirmation → Lost ✓

## Next Steps

1. **Check console logs** to identify which issue it is
2. **Apply the appropriate solution** based on the logs
3. **Remove debug logs** after fixing
4. **Report back** with the console output if issue persists

