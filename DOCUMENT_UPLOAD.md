# Document Upload Feature

## ✅ Implemented: Clickable Document Uploads in Downloads Section

### What Was Added:

Created a new `DocumentUpload` component that allows users to upload three types of documents:
1. **Press Kit**
2. **Stage Plot**
3. **Input List**

### Features:

#### 📤 Upload Functionality:
- **Click to Upload**: Each box is now clickable and opens file picker
- **Drag & Drop**: Users can click anywhere on the box to select a file
- **File Validation**: 
  - Accepts PDF, Word (.doc, .docx), and text files
  - Max file size: 10MB
  - Shows error if wrong type or too large

#### 💾 Backend Integration:
- ✅ **Connected to Azure Backend**: Uses existing `/api/assets` endpoint
- ✅ **Saves to Database**: Files are stored with:
  - `entityId`: The profile/entity ID
  - `fileId`: Document type (pressKit, stagePlot, inputList)
  - `file`: The actual document
- ✅ **Persistent Storage**: Files are stored in Azure and linked to the profile

#### 🎨 User Experience:
- **Before Upload**: Shows upload icon with "Click to upload" text
- **During Upload**: Shows spinning loader with "Uploading..." text
- **After Upload**: Shows checkmark with "Uploaded" status
- **Download Link**: Once uploaded, shows a download link to view/download the file
- **Error Handling**: Shows error messages at the bottom of the box
- **Hover Effect**: Border changes color on hover to indicate clickability

#### 🔐 Security:
- Requires authentication (uses session token)
- Only users with active profile can upload
- Files are linked to specific entities

### Component Location:
`/src/components/profile/DocumentUpload.tsx`

### Usage in Profile Page:
```tsx
<DocumentUpload
  entityId={activeProfile.id}
  fileId="pressKit"
  title="Press Kit"
  existingFile={profileDetails?.pressKitUrl}
/>
```

### File IDs Used:
- `pressKit` - Press kit documents
- `stagePlot` - Stage plot diagrams
- `inputList` - Input list documents

### API Endpoint:
**POST** `/api/assets`
- Accepts multipart form data
- Fields: `file`, `entityId`, `fileId`
- Returns: File path/URL of uploaded document

### What Happens When You Upload:
1. User clicks on one of the three boxes
2. File picker opens
3. User selects a PDF/DOC file
4. File is validated (type and size)
5. File is uploaded to Azure backend via API
6. Backend saves file and returns URL
7. UI shows checkmark and download link
8. File URL is associated with the profile

### Future Enhancements:
- Could add preview functionality
- Could add delete/replace document option
- Could track upload date/version
- Could add more document types (contracts, invoices, etc.)

---
*Implemented: January 8, 2026*
