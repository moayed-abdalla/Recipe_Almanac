# Diagnostic Guide: Edit Button Not Showing

## Issue 1: Missing Characters in Slug ✅ FIXED
**Problem**: Username slug shows `_ncle_o` instead of `uncle_mo` for "Uncle Mo"

**Root Cause**: The regex `[^a-z0-9]` only matches lowercase letters, so capital letters (U, M) were being replaced with underscores.

**Fix Applied**: Convert username to lowercase before applying the regex replacement.

---

## Issue 2: Edit Button Not Showing - Diagnostic Steps

### Step 1: Verify Server-Side Owner Check
**Location**: `app/recipe/[id]/page.tsx` (lines 116-118)

**Check**:
```typescript
const { data: { user } } = await supabase.auth.getUser();
const isOwner = user?.id === typedRecipe.user_id;
```

**Diagnostic Actions**:
1. Add temporary console.log to verify:
   ```typescript
   console.log('Server-side check:', {
     userId: user?.id,
     recipeUserId: typedRecipe.user_id,
     isOwner: user?.id === typedRecipe.user_id
   });
   ```

2. Verify the user is authenticated on the server
3. Verify `typedRecipe.user_id` matches the logged-in user's ID

### Step 2: Verify isOwner Prop is Passed
**Location**: `app/recipe/[id]/page.tsx` (line 145)

**Check**: The `isOwner` prop is passed to `RecipePageClient`:
```typescript
<RecipePageClient
  recipe={typedRecipe}
  ingredients={ingredients || []}
  owner={owner}
  isOwner={isOwner}  // ← Verify this is true
/>
```

**Diagnostic Actions**:
1. Add console.log before the return:
   ```typescript
   console.log('Passing isOwner to client:', isOwner);
   ```

### Step 3: Verify Client-Side Rendering
**Location**: `app/recipe/[id]/RecipePageClient.tsx` (lines 504-526)

**Check**: The edit button condition:
```typescript
{isOwner && (
  <Link href={`/recipe/${recipe.slug}/edit`}>
    {/* Edit button */}
  </Link>
)}
```

**Diagnostic Actions**:
1. Add console.log at the start of the component:
   ```typescript
   console.log('RecipePageClient props:', {
     isOwner,
     recipeId: recipe.id,
     recipeSlug: recipe.slug
   });
   ```

2. Temporarily remove the condition to test if button renders:
   ```typescript
   {/* Temporarily show always for testing */}
   <Link href={`/recipe/${recipe.slug}/edit`}>
     Edit
   </Link>
   ```

### Step 4: Check for Client-Side State Override
**Location**: `app/recipe/[id]/RecipePageClient.tsx` (line 86)

**Potential Issue**: There's a `user` state variable that might be interfering:
```typescript
const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
```

**Diagnostic Actions**:
1. Check if this `user` state is being used anywhere that might conflict
2. Verify the `isOwner` prop from server is not being overridden by client-side logic

### Step 5: Verify Recipe Slug is Correct
**Location**: Edit button link (line 507)

**Check**: The edit link uses `recipe.slug`:
```typescript
href={`/recipe/${recipe.slug}/edit`}
```

**Diagnostic Actions**:
1. Verify `recipe.slug` exists and is correct
2. Check browser console for any 404 errors when clicking edit
3. Verify the slug format matches: `username-recipe-slug`

### Step 6: Check Browser Console
**Actions**:
1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for any errors related to:
   - Authentication
   - Recipe data
   - Navigation errors

### Step 7: Verify Authentication State
**Actions**:
1. Check if you're actually logged in:
   - Look for user avatar/profile in header
   - Check if "My Almanac" link works
2. Verify the recipe was created by the logged-in user:
   - Check the recipe's author matches your username
   - Verify in database if needed

### Step 8: Test with Hardcoded Value
**Temporary Test**: In `RecipePageClient.tsx`, temporarily hardcode `isOwner`:
```typescript
// TEMPORARY: Force show edit button for testing
const testIsOwner = true;
{testIsOwner && (
  <Link href={`/recipe/${recipe.slug}/edit`}>
    Edit
  </Link>
)}
```

If this shows the button, the issue is with the `isOwner` prop value.

---

## Common Issues and Fixes

### Issue A: Server-Side Auth Not Working
**Symptom**: `user` is null on server even when logged in
**Fix**: Check Supabase server client configuration in `lib/supabase.ts`

### Issue B: User ID Mismatch
**Symptom**: `user.id` doesn't match `recipe.user_id`
**Fix**: Verify recipe was created by current user, check database

### Issue C: Client-Side Hydration Mismatch
**Symptom**: Button shows in dev but not in production
**Fix**: Ensure server and client render the same initial state

### Issue D: Route Parameter Issue
**Symptom**: Edit link gives 404
**Fix**: Verify the edit route exists at `app/recipe/[id]/edit/page.tsx`

---

## Quick Fix Checklist

- [ ] Username slug generation fixed (convert to lowercase first)
- [ ] Server-side `isOwner` calculation is correct
- [ ] `isOwner` prop is passed to `RecipePageClient`
- [ ] Edit button condition uses `isOwner` prop (not client-side state)
- [ ] Recipe slug exists and is correct
- [ ] User is authenticated
- [ ] Recipe belongs to logged-in user
- [ ] No console errors in browser
- [ ] Edit route exists and is accessible

