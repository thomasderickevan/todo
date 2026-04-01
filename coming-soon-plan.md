# Meet Summarizer - Development Plan

## Overview
Meet Summarizer is a browser extension designed to enhance productivity during Google Meet sessions by capturing live captions, generating concise AI summaries, and automatically syncing action items to the **endeavor** TaskMaster.

## Core Features
1. **Live Caption Capture**: Real-time extraction of Google Meet's built-in captions.
2. **AI Summary Generation**: 
   - Processing the transcript using LLMs (e.g., Gemini API).
   - Identifying key discussion points, decisions made, and follow-up tasks.
3. **Automated Task Sync**:
   - Direct integration with Firestore-based TaskMaster.
   - Categorizing tasks by urgency or speaker.
4. **Export Options**: 
   - Save summaries as Google Docs (via existing DriveSync logic).
   - Export transcripts as plain text or PDF.

## Technical Architecture
- **Frontend**: Chrome/Edge/Firefox Browser Extension (Manifest V3).
- **Background Script**: Managing the authentication state and API calls.
- **Content Script**: DOM manipulation to scrape captions from the Google Meet UI.
- **Backend Integration**: 
   - Firebase Auth for session persistence.
   - Cloud Functions (optional) for heavy AI processing to keep the client lightweight.

## Development Phases
### Phase 1: Prototype (Week 1-2)
- Scrape live captions from a Google Meet tab.
- Basic local storage of transcripts.
- Integration with Gemini API for simple summarization.

### Phase 2: Integration (Week 3-4)
- Connect extension to **endeavor** Auth (Firebase).
- Implement "Add to TaskMaster" button within the extension UI.
- Add Google Drive export functionality.

### Phase 3: Polish (Week 5+)
- Refine UI/UX to match the **endeavor** aesthetic.
- Support for multiple languages.
- Advanced speaker identification and tagging.

## Security & Privacy
- **Client-Side Processing**: Prioritize local processing where possible.
- **No Persistent Audio Recording**: Only process text captions to respect user privacy.
- **Permissions**: Request minimal necessary permissions (Tabs, Identity, Storage).
