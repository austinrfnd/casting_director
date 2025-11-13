# Dynamic Budget System - Implementation Plan

## Overview
Replace hardcoded 3-tier budget system with AI-calculated budgets where Gemini analyzes multiple factors and assigns realistic budgets ($1M-$300M) along with studio attribution and detailed reasoning.

---

## Phase 1: Update Cloud Function - getBookInfo

**File:** `functions/index.js`

**Changes to `getBookInfo` function:**

### 1. Expand JSON Schema

Add new fields to the response schema:

```javascript
{
  popularity: STRING,        // Keep for backward compatibility
  synopsis: STRING,          // Existing
  characters: ARRAY,         // Existing
  movieBudget: NUMBER,       // NEW: $1M - $300M range
  castingBudget: NUMBER,     // NEW: Realistic % of movie budget
  studio: STRING,            // NEW: Real studio name (e.g., "Warner Bros", "A24")
  budgetReasoning: STRING    // NEW: 4-6 sentences
}
```

### 2. Update System Prompt

Instruct Gemini to:
- Analyze multiple factors:
  - Book popularity and sales numbers
  - Awards won
  - Fanbase size
  - Franchise potential
  - Genre and scope
  - Special effects/VFX requirements
  - Target audience demographics
  - Author's track record with adaptations
  - Adaptation complexity
  - Current market trends

- Calculate realistic movie budget between $1M and $300M
- Calculate casting budget (typically 20-30% of movie budget)
- Select appropriate real studio based on budget size:
  - **Major Studios** (>$100M): Warner Bros, Universal, Disney, Paramount, Sony Pictures
  - **Mid-Tier Studios** ($30M-$100M): Lionsgate, STX Entertainment, MGM
  - **Indie Studios** (<$30M): A24, Neon, Blumhouse, Focus Features, Searchlight Pictures

### 3. Update Budget Reasoning Format

Format: "Congratulations! Your movie has been bought by [STUDIO NAME]! [4-6 sentences explaining budget rationale]"

Example: "Congratulations! Your movie has been bought by Warner Bros! This literary classic has massive name recognition and appeals to adult audiences. The period piece setting requires significant costume and set design investment. Given F. Scott Fitzgerald's enduring legacy and the book's exploration of wealth and ambition, we're allocating a substantial mid-tier budget. The existing fanbase expects a high-quality adaptation with A-list talent."

---

## Phase 2: Update Frontend Logic

**File:** `app.js`

### Changes:

1. **Remove `calculateBudgets()` function** (lines 765-784)
   - No longer needed - AI handles budget calculation

2. **Update `populateScreen2()` function** (lines 790-795)
   - Change from `state.movieBudget` to `state.bookInfo.movieBudget`
   - Change from `state.castingBudget` to `state.bookInfo.castingBudget`
   - Add studio display: `state.bookInfo.studio`
   - Change reasoning: `state.bookInfo.budgetReasoning`

3. **Update State Management**
   - Modify where `state.movieBudget` and `state.castingBudget` are set
   - Use AI values directly from API response instead of calculating

4. **Update Screen 1 Flow** (lines 1051-1078)
   - Remove `calculateBudgets()` call after API response
   - Set budgets directly from `state.bookInfo.movieBudget` and `state.bookInfo.castingBudget`

---

## Phase 3: Redesign Screen 2 UI

**File:** `index.html`

### New Screen 2 Wireframe

```
╔═══════════════════════════════════════════════════════════╗
║ [█] STUDIO DEAL MEMO                                 [×]  ║
╠═══════════════════════════════════════════════════════════╣
║                                                           ║
║   PROJECT TITLE: [The Great Gatsby]                      ║
║   ═══════════════════════════════════════════════════     ║
║                                                           ║
║   📽️ MOVIE BUDGET:    $85,000,000                        ║
║   🎭 CASTING BUDGET:  $25,500,000                        ║
║                                                           ║
║   ───────────────────────────────────────────────────     ║
║                                                           ║
║   📜 STUDIO MESSAGE:                                      ║
║   ┌─────────────────────────────────────────────────┐   ║
║   │ Congratulations! Your movie has been bought by  │   ║
║   │ Warner Bros! This literary classic has massive  │   ║
║   │ name recognition and appeals to adult audiences.│   ║
║   │ The period piece setting requires significant   │   ║
║   │ costume and set design investment. Given F.     │   ║
║   │ Scott Fitzgerald's enduring legacy and the      │   ║
║   │ book's exploration of wealth and ambition, we're│   ║
║   │ allocating a substantial mid-tier budget.       │   ║
║   └─────────────────────────────────────────────────┘   ║
║                                                           ║
║   ┌─────────────────┐  ┌─────────────────┐              ║
║   │ START CASTING   │  │  MAIN MENU      │              ║
║   └─────────────────┘  └─────────────────┘              ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
```

### Layout Changes

1. **Header Enhancement**
   - Change "STUDIO MEMO" to "STUDIO DEAL MEMO" (more exciting)
   - Keep DOS-style fieldset/legend

2. **Project Title Section**
   - Larger, more prominent display
   - Add decorative separator line
   - Center-aligned

3. **Budget Display**
   - Add emoji icons (📽️ 🎭) or ASCII art for visual interest
   - Increase font size slightly
   - Keep cyan color highlight
   - Clear labeling

4. **Studio Message Box**
   - New section with clear label "STUDIO MESSAGE:"
   - Boxed area to emphasize the narrative
   - Scrollable if text exceeds space
   - Slightly different background shade for contrast
   - Good line height for readability

5. **Button Updates**
   - Rename "GET TO CASTING" → "START CASTING" (more action-oriented)
   - Keep both buttons in button-bar
   - Maintain existing button styling

### CSS Additions

```css
.studio-message-box {
    border: 1px solid var(--dos-header);
    padding: 15px;
    background: rgba(0, 255, 255, 0.05);
    margin: 15px 0;
    max-height: 200px;
    overflow-y: auto;
    line-height: 1.4;
}

.budget-section {
    margin: 20px 0;
}

.project-title-large {
    font-size: 28px;
    color: var(--dos-header);
    text-align: center;
    margin: 10px 0;
}

.studio-message-label {
    color: var(--dos-header);
    font-size: 20px;
    margin-bottom: 5px;
}
```

---

## Phase 4: Testing

### Test Cases

1. **Massive Bestseller** (e.g., "Harry Potter and the Sorcerer's Stone" by J.K. Rowling)
   - **Expected Budget**: $150M-$300M
   - **Expected Studio**: Major (Warner Bros, Universal, Disney)
   - **Expected Reasoning**: Mentions massive fanbase, franchise potential, VFX needs

2. **Cult Classic** (e.g., "Neuromancer" by William Gibson)
   - **Expected Budget**: $30M-$80M
   - **Expected Studio**: Mid-tier (Lionsgate, Sony Pictures)
   - **Expected Reasoning**: Mentions dedicated fanbase, sci-fi VFX, niche appeal

3. **Obscure Find** (e.g., unknown indie novel)
   - **Expected Budget**: $1M-$15M
   - **Expected Studio**: Indie (A24, Blumhouse, Neon)
   - **Expected Reasoning**: Mentions risk, emerging talent, limited marketing

4. **Genre Variations**
   - **Sci-fi/Fantasy**: Higher VFX budgets (e.g., "Dune")
   - **Intimate Drama**: Lower budgets (e.g., "The Remains of the Day")
   - **Period Pieces**: Moderate-high for costumes/sets (e.g., "Pride and Prejudice")

5. **Edge Cases**
   - Very long reasoning text (test scrolling in studio-message-box)
   - Unknown books (AI should handle gracefully with lower budgets)
   - Books with existing adaptations (AI might reference previous versions)
   - Non-English books (test international recognition)

### Testing Checklist

- [ ] API returns all new fields (movieBudget, castingBudget, studio, budgetReasoning)
- [ ] Budgets are within realistic range ($1M-$300M)
- [ ] Casting budget is reasonable percentage of movie budget (15-35%)
- [ ] Studio names are real and appropriate for budget level
- [ ] Reasoning is 4-6 sentences and well-formatted
- [ ] Screen 2 displays all information correctly
- [ ] Studio message box scrolls if content is too long
- [ ] Buttons work correctly (START CASTING, MAIN MENU)
- [ ] Screen transition from Screen 1 → Screen 2 → Screen 3 works
- [ ] No console errors
- [ ] Currency formatting displays correctly

---

## Implementation Order

1. ✅ **Update Cloud Function first** - Modify getBookInfo schema and prompts
2. ✅ **Test API response** - Verify Gemini returns expected data structure
3. ✅ **Update Frontend State** - Remove calculateBudgets(), update state handling
4. ✅ **Redesign HTML/CSS** - Implement new Screen 2 layout
5. ✅ **Test End-to-End** - Try different books and verify complete flow
6. ✅ **Fine-tune Prompts** - Adjust if budgets seem unrealistic or reasoning is off

---

## Estimated Timeline

- **Phase 1** (Cloud Function): 30 mins
- **Phase 2** (Frontend Logic): 20 mins
- **Phase 3** (UI Redesign): 45 mins
- **Phase 4** (Testing): 30 mins
- **Total: ~2 hours**

---

## Backwards Compatibility

- Keep `popularity` field in API response (other code may reference it)
- Maintain same screen transition flow (Screen 1 → Screen 2 → Screen 3)
- No changes to Screen 3 (Casting Interface)
- No changes to Screen 4 (Results)
- No changes to Screen 5 (Movie Details)

---

## Success Criteria

✅ Each book entered generates a unique, realistic budget
✅ Studio names match budget tier appropriately
✅ Reasoning is engaging, informative, and makes sense
✅ UI displays all information clearly in DOS-style aesthetic
✅ No breaking changes to existing functionality
✅ App feels more dynamic and personalized per book

---

## Future Enhancements (Out of Scope)

- Allow user to negotiate budget with studio
- Show multiple studio offers to choose from
- Add studio logos/branding
- Track historical budgets for comparison
- Generate marketing taglines for the movie

---

*Created: 2025-11-12*
*Status: Ready for Implementation*
