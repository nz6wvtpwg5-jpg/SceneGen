# Quick Start: Using MCP Servers

## ⚡ What You Can Do With MCP

**Without MCP:** I can only see `/Users/jon/Desktop/scenegen/SceneGenUIV2`

**With MCP:** I can:
- 📁 Access **backend code** in other folders
- 🗄️ **Query your database** directly
- 🔍 Read **Azure Function logs**
- 🌐 Access **other GitHub repos**
- 🛠️ Run **custom tools**

---

## 🚀 Quick Setup (2 minutes)

### Step 1: Copy the example file

```bash
cd /Users/jon/Desktop/scenegen/SceneGenUIV2
cp .vscode/mcp-settings.json.example .vscode/mcp-settings.json
```

### Step 2: Edit for your needs

Open `.vscode/mcp-settings.json` and customize:

**Option A: Access backend folder**
```json
{
  "mcpServers": {
    "backend": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/backend"]
    }
  }
}
```

**Option B: Database access**
```json
{
  "mcpServers": {
    "database": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres"],
      "env": {
        "PGHOST": "your-db-host.database.windows.net",
        "PGDATABASE": "scenegen",
        "PGUSER": "admin",
        "PGPASSWORD": "your-password"
      }
    }
  }
}
```

**Option C: Both!**
```json
{
  "mcpServers": {
    "backend": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/backend"]
    },
    "database": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres"],
      "env": {
        "PGHOST": "your-db-host",
        "PGDATABASE": "scenegen",
        "PGUSER": "admin",
        "PGPASSWORD": "your-password"
      }
    }
  }
}
```

### Step 3: Reload VS Code

```
Cmd+Shift+P → "Developer: Reload Window"
```

### Step 4: Test it!

In this chat, ask:
```
@workspace List all files in the backend folder
@workspace Query the entities table
@workspace Show backend API endpoints
```

---

## 🎯 Useful Queries for SceneGen

### Backend Code Analysis
```
@workspace Show the backend implementation of POST /artist/add
@workspace Find all SQL queries in backend code
@workspace Compare frontend types with backend schemas
@workspace Show backend error handling for duplicate entities
```

### Database Inspection
```
@workspace Query entities table and show all records
@workspace Find duplicate entities (same administratorId)
@workspace Count shows by status
@workspace Show tours with their show counts
@workspace Find entities missing administratorId
```

### Cross-Project Comparison
```
@workspace Compare frontend entity model with backend schema
@workspace List all API endpoints and check if frontend uses them
@workspace Find missing endpoints (frontend calls but backend doesn't have)
```

### Debugging
```
@workspace Check backend logs for errors in last hour
@workspace Show failed API requests
@workspace Find why GET /user/entities returns wrong format
```

---

## 📊 Example Workflow

**Scenario:** You want to check if duplicate entity prevention works

1. **Query database:**
   ```
   @workspace Query: SELECT administratorId, COUNT(*) FROM entities GROUP BY administratorId HAVING COUNT(*) > 1
   ```

2. **Check backend code:**
   ```
   @workspace Show the duplicate check logic in backend POST /artist/add
   ```

3. **Compare with frontend:**
   ```
   @workspace Show how frontend handles 409 Conflict response
   ```

4. **Fix if needed:**
   ```
   @workspace Update backend to add duplicate check before insert
   ```

---

## 🔐 Security Best Practices

1. **Never commit credentials:**
   ```bash
   # Already added to .gitignore:
   .vscode/mcp-settings.json
   ```

2. **Use environment variables (better):**
   ```json
   {
     "mcpServers": {
       "database": {
         "command": "npx",
         "args": ["-y", "@modelcontextprotocol/server-postgres"],
         "env": {
           "PGHOST": "${env:DB_HOST}",
           "PGUSER": "${env:DB_USER}",
           "PGPASSWORD": "${env:DB_PASSWORD}"
         }
       }
     }
   }
   ```

3. **Check .gitignore:**
   ```bash
   git status .vscode/mcp-settings.json
   # Should show: "Untracked files" or not appear
   ```

---

## ❓ Which MCP Server Should You Add?

### For Backend Testing:
✅ **File System MCP** - Access backend code
- Best if backend is in different folder
- Can read backend API implementations
- Compare frontend/backend schemas

### For Data Debugging:
✅ **Database MCP** - Query Azure SQL
- See actual data in database
- Find duplicate entities
- Debug data issues
- Check administratorId fields

### For Production Debugging:
⚠️ **Azure MCP** - Function logs
- Check production errors
- Monitor API calls
- Debug deployment issues

### For Backend Repo Access:
⚠️ **GitHub MCP** - Access other repos
- If backend is in separate repo
- Can read backend code
- Check issues/PRs

---

## 🆘 Troubleshooting

### MCP not working?
1. Check VS Code version (need recent)
2. Reload window: `Cmd+Shift+P` → "Reload Window"
3. Check MCP settings syntax (valid JSON)

### Can't access files?
1. Check path is correct
2. Check permissions
3. Try absolute path

### Database connection fails?
1. Check credentials
2. Check Azure SQL firewall rules
3. Use correct port (1433 for Azure SQL)

---

## 📝 What Do You Want to Access?

Let me know:
- [ ] Backend code (where is it?)
- [ ] Database (have credentials?)
- [ ] Azure Functions (subscription ID?)
- [ ] Other GitHub repos?

I'll help you set it up! 🚀
