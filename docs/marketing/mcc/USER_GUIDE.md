# MCC User Guide

## Accessing Marketing Content

1. Open Command Centre at http://localhost:3000
2. Click **Marketing** in the sidebar (📱 icon)
3. View loads with kanban-style pipeline

## The Pipeline

Posts are organized by status:

| Status | Color | Description |
|--------|-------|-------------|
| Draft | Blue | New posts, not scheduled |
| Scheduled | Purple | Set for future publish |
| Awaiting Approval | Yellow | Waiting for your approval |
| Publishing | Orange | Currently publishing |
| Published | Green | Successfully posted |
| Failed | Red | Publish failed |

## Creating a Post

1. Click **+ New Post** in header
2. Fill in:
   - **Title** — internal label
   - **Post Body** — your caption
   - **Platforms** — Instagram, LinkedIn (or both)
   - **Brand** — YDS, Colin, etc.
   - **Media URLs** — image/link URLs
   - **Schedule For** — optional future date
3. Click **Save Post**

## Scheduling a Post

1. Open a draft post
2. Set **Schedule For** date/time
3. Click **Save** — triggers approval gate
4. Approve to move to Scheduled

## Publishing a Post

1. Click **🚀** on a scheduled post
2. Approval prompt appears with post summary
3. Click **Approve** to publish
4. Post moves through: awaiting → publishing → published

## Connecting Social Accounts

1. In the OAuth status bar, click **Connect** next to a platform
2. OAuth popup opens — complete authorization
3. Token stored in Notion (encrypted)
4. Platform shows "Connected"

## Editing a Post

1. Click any post card
2. Composer opens in edit mode
3. Make changes, click **Save Post**
4. Changes require approval

## Deleting a Post

1. Click **🗑️** on a draft post
2. Confirm deletion

## Troubleshooting

**"No OAuth token" on publish:**
- Connect platform in OAuth status bar first

**"Scheduled time must be in the future":**
- Pick a future date/time for scheduling

**"Invalid platform":**
- Only `instagram` and `linkedin` supported in P1

**View shows "No posts":**
- Create a post or check DB ID is correct in read-model.js