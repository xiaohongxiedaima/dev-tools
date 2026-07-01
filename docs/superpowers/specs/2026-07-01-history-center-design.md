# History Center Design

## Summary

Replace the current right-side status panel with a reusable history center for all tools. The history center stores and restores full workspace snapshots, including the active tool, input content, output content, and tool-specific option state.

## Goals

- Remove the current "状态面板" concept from the right-side panel.
- Add a general history feature that works across JSON and future tools.
- Split history into two groups:
  - manual saved history
  - auto-captured input history
- Let the user click a history item to fully restore the saved workspace state.
- Persist both history groups locally so they remain available after restarting the app.

## Non-Goals

- Building a separate full-screen history page.
- Syncing history across machines or cloud accounts.
- Adding tool-specific history UIs inside each tool workspace.

## User Experience

### Right Panel

The right panel remains as the existing optional side panel, but its primary content changes from status-oriented information to a history center.

The history center is organized into two collapsible sections:

1. 手动保存
2. 自动输入历史

Each history item shows:

- tool name
- time
- short content preview
- source type

The preview text should be generated from the input content first, falling back to output content when the input is empty.

The overall side panel can still be collapsed or expanded using the existing workspace-level control.

### Saving History

Each tool workspace gets a common "保存历史" action. Triggering it creates a manual history entry from the current workspace snapshot.

Automatic history is recorded after the user stops typing for 800ms. Automatic capture is deduplicated so repeated identical snapshots do not create noisy duplicates.

### Restoring History

Selecting a history item restores the complete snapshot:

- active tool
- input content
- output content
- tool-specific option state
- view mode state when applicable

Restore behavior uses the saved snapshot state, not tool defaults.

## Architecture

### Persistence Layer

Add a SQLite-backed history table shared by all tools.

Suggested fields:

- `id`
- `tool_id`
- `source_type` (`manual` or `auto`)
- `title`
- `input_value`
- `output_value`
- `snapshot_json`
- `created_at`
- `updated_at`

`snapshot_json` stores structured tool state so future tools can add their own options without schema changes. Common fields such as input and output stay queryable in dedicated columns for listing and preview use.

### Store Layer

Extend the workspace store with history state and actions:

- load history entries from SQLite
- create manual history entries
- create debounced automatic history entries
- deduplicate automatic snapshots
- restore a saved snapshot into the current workspace

The workspace store remains the single restore entry point so UI components do not reimplement per-tool state wiring.

### UI Layer

Update the existing right-side panel component to render the history center instead of the status panel.

Update the main workspace panel to expose a shared manual save action that is available for all tools. The button label should use concise Chinese copy and align with the existing workspace action patterns.

## Snapshot Shape

Each saved snapshot should include:

- `toolId`
- `inputValue`
- `outputValue`
- `options`
- `viewState`
- `savedAt`

`options` stores tool-specific selections such as active JSON action or other future transform settings.

`viewState` stores display-oriented state that should be restored when it materially affects the current workspace, such as output text/tree mode or search-related presentation state that the tool intentionally persists. Ephemeral cursor position should not be stored.

## Data Flow

1. User edits tool input.
2. Workspace store updates the active tool state.
3. A debounced auto-save path evaluates whether the new snapshot differs from the last stored auto snapshot.
4. If different, the store writes a new auto history record to SQLite and refreshes the in-memory history list.
5. If the user presses "保存历史", the store writes a manual history record immediately.
6. If the user clicks a history item, the store loads its snapshot and applies it back to the active workspace state.

## Error Handling

- If a history write fails, surface the error through the existing app error pattern instead of silently dropping it.
- If a history item references a tool that no longer exists, show the item as unavailable for restore or block restore with a clear message.
- If snapshot parsing fails, report the failure and keep the current workspace unchanged.

## Limits and Retention

- Automatic history keeps the most recent 50 entries.
- Manual history keeps the most recent 200 entries.
- Deduplication should compare the effective snapshot content, not just timestamps.

## Testing

Add targeted coverage for:

- manual history creation
- debounced automatic history creation
- automatic history deduplication
- restoring tool, input, output, and option state from history
- rendering the two grouped history sections in the right panel
- removal of the old status-panel UI
- handling invalid or unavailable restore targets

## Recommended Implementation Direction

Implement this as an extension of the existing workspace store and right-side panel rather than creating a new route or isolated history page. This keeps the feature cross-tool, minimizes navigation friction, and reuses the current workspace layout successfully.
