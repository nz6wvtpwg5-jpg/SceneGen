# MCP Server Setup for SceneGen

This guide shows how to set up Model Context Protocol (MCP) servers to enhance your development workflow.

## 🎯 Recommended MCP Servers for SceneGen

### 1. Database MCP (Highest Priority)

**Why:** Direct access to your Azure SQL database to inspect/debug data

**Setup Steps:**

1. **Find your Azure SQL connection details:**
   - Azure Portal → SQL Database → Connection strings
   - Note: Host, Database, Username, Password

2. **Create MCP config file:**

Create `.vscode/mcp-settings.json`:
```json
{
  "mcpServers": {
    "scenegen-db": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-postgres"
      ],
      "env": {
        "PGHOST": "your-azure-sql-server.database.windows.net",
        "PGPORT": "1433",
        "PGDATABASE": "scenegen",
        "PGUSER": "your-username",
        "PGPASSWORD": "your-password",
        "PGSSLMODE": "require"
      }
    }
  }
}
```

**Note:** For Azure SQL, you may need the PostgreSQL-compatible endpoint or use a SQL Server MCP instead.

3. **Update VS Code settings:**

Add to `.vscode/settings.json`:
```json
{
  "github.copilot.chat.mcpServers": ".vscode/mcp-settings.json"
}
```

4. **Use in chat:**
```
@workspace Can you query the entities table to see if there are duplicate entities?
@workspace Show me all entities where administratorId = 'user-id-123'
@workspace Check the shows table for tours
```

---

### 2. File System MCP (For Backend Code)

**Why:** Access backend code if it's in a different folder

**Setup:**

Create `.vscode/mcp-settings.json`:
```json
{
  "mcpServers": {
    "backend-files": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "/Users/jon/Desktop/scenegen/backend"
      ]
    }
  }
}
```

**Use cases:**
```
@workspace Show me the backend implementation of POST /artist/add
@workspace Compare frontend and backend entity schemas
@workspace Check backend error handling
```

---

### 3. Azure Functions MCP (For Logs)

**Why:** Check Azure Function logs and deployments

**Setup:**

```json
{
  "mcpServers": {
    "azure": {
      "command": "npx",
      "args": ["-y", "@azure/functions-mcp-server"],
      "env": {
        "AZURE_SUBSCRIPTION_ID": "your-subscription-id",
        "AZURE_FUNCTION_APP_NAME": "scenegen-api"
      }
    }
  }
}
```

**Use cases:**
```
@workspace Show recent errors from Azure Functions
@workspace Check deployment status
@workspace Get logs for POST /artist/add endpoint
```

---

## 🚀 Quick Setup (Recommended)

For now, the **most useful** would be file system access to see backend code. Here's the simplest setup:

### Option A: Access Backend Folder

If your backend is at `/Users/jon/Desktop/scenegen/backend`:

```json
{
  "mcpServers": {
    "scenegen-backend": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "/Users/jon/Desktop/scenegen"
      ]
    }
  }
}
```

### Option B: Access Multiple Folders

```json
{
  "mcpServers": {
    "project-root": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "/Users/jon/Desktop/scenegen"
      ]
    },
    "backend": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "/Users/jon/Documents/backend"
      ]
    }
  }
}
```

---

## 📊 Example Queries with MCP

Once set up, you can ask:

### Database Queries:
```
@workspace Query the entities table and show all records
@workspace Count entities grouped by administratorId to find duplicates
@workspace Show all shows with tourId = null
@workspace Find entities missing administratorId field
```

### Backend Code Analysis:
```
@workspace Read the backend /artist/add endpoint implementation
@workspace Compare frontend API call with backend endpoint
@workspace Show all backend SQL queries
@workspace Check backend duplicate entity validation
```

### Cross-Project Analysis:
```
@workspace Compare frontend entity schema with backend schema
@workspace Find all API endpoints in backend and check if frontend uses them
@workspace Show backend error handling vs frontend error handling
```

---

## 🔧 Installation Commands

Install MCP servers you need:

```bash
# Database access
npm install -g @modelcontextprotocol/server-postgres

# File system access
npm install -g @modelcontextprotocol/server-filesystem

# GitHub access
npm install -g @modelcontextprotocol/server-github

# Or use npx (no install needed)
# MCP will auto-download when first used
```

---

## 🎯 What Would Be Most Helpful for You?

Based on your testing needs, I recommend:

1. **File System MCP** - Access backend code (if in different folder)
2. **Database MCP** - Query Azure SQL directly to inspect data
3. **GitHub MCP** - Access backend repo if separate

**Want me to set one up for you?**

Just tell me:
- Where is your backend code? (path)
- Do you have database credentials? (I won't show them)
- Is your backend in a separate GitHub repo?

---

## ⚠️ Security Note

**Never commit database credentials!**

- Use `.vscode/mcp-settings.json`
- Add to `.gitignore`
- Or use environment variables

Example `.gitignore`:
```
.vscode/mcp-settings.json
.env.local
*.credentials
```

---

## 🤔 Not Sure What MCP Can Do?

**Without MCP:** I can only see files in the current workspace

**With MCP:** I can:
- ✅ Query your database directly
- ✅ Access backend code in other folders
- ✅ Check Azure Function logs
- ✅ Read GitHub issues/PRs
- ✅ Execute custom commands
- ✅ Access any file on your system (with permission)

This is especially useful for:
- 🔍 Debugging: "Why is this API failing?"
- 📊 Data inspection: "Show me all duplicate entities"
- 🔄 Cross-project work: "Compare frontend and backend schemas"
- 🐛 Troubleshooting: "Check backend logs for errors"

---

## 📝 Next Steps

1. **Decide which MCP servers you need**
2. **Create `.vscode/mcp-settings.json`**
3. **Add credentials (keep secure!)**
4. **Restart VS Code**
5. **Test with:** `@workspace [your query]`

**Want help setting one up? Let me know:**
- Backend location?
- Database access needed?
- Other integrations?
