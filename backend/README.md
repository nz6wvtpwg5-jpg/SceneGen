# SceneGen Backend API

Local backend server for SceneGen application.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Run database migration
npm run migrate

# Start server
npm start
```

The server will start on **http://localhost:3001**

## 📊 Database

Using **NeonDB** (PostgreSQL) for data storage.

### Tables Created:
- `shows` - Performance/show data
- `tours` - Tour groupings
- `invites` - Collaboration invites
- `calendar_connections` - Google Calendar OAuth tokens
- `notifications` - User notifications

## 🔑 Authentication

For now, pass your entity ID as a header or query parameter:
- Header: `X-Entity-Id: your-entity-id`
- Query param: `?entityId=your-entity-id`
- Body field: `entityId: "your-entity-id"`

## 📝 API Endpoints

### Health Check
```bash
GET /health
```

### Shows
```bash
GET    /api/shows?entityId=YOUR_ENTITY_ID
POST   /api/shows
GET    /api/shows/:id?entityId=YOUR_ENTITY_ID
PUT    /api/shows/:id?entityId=YOUR_ENTITY_ID
DELETE /api/shows/:id?entityId=YOUR_ENTITY_ID
```

### Tours
```bash
GET    /api/tours?entityId=YOUR_ENTITY_ID
POST   /api/tours
GET    /api/tours/:id?entityId=YOUR_ENTITY_ID
PUT    /api/tours/:id?entityId=YOUR_ENTITY_ID
DELETE /api/tours/:id?entityId=YOUR_ENTITY_ID
```

### Invites
```bash
GET  /api/invites?entityId=YOUR_ENTITY_ID
POST /api/invites
```

## 🧪 Testing the API

### Test with curl:

```bash
# Health check
curl http://localhost:3001/health

# Create a show
curl -X POST http://localhost:3001/api/shows \
  -H "Content-Type: application/json" \
  -H "X-Entity-Id: test-entity-123" \
  -d '{
    "venueName": "Madison Square Garden",
    "venueAddress": "4 Pennsylvania Plaza",
    "city": "New York",
    "state": "NY",
    "date": "2026-06-15",
    "startTime": "20:00"
  }'

# Get all shows
curl "http://localhost:3001/api/shows?entityId=test-entity-123"

# Create a tour
curl -X POST http://localhost:3001/api/tours \
  -H "Content-Type: application/json" \
  -H "X-Entity-Id: test-entity-123" \
  -d '{
    "name": "Summer Tour 2026",
    "startDate": "2026-06-01",
    "endDate": "2026-08-31"
  }'
```

## 🔧 Environment Variables

See `.env` file:

```
DATABASE_URL=postgresql://...
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

## 📦 Tech Stack

- **Node.js** + **Express** - Server framework
- **PostgreSQL** (NeonDB) - Database
- **pg** - PostgreSQL client
- **cors** - CORS middleware
- **dotenv** - Environment variables

## 🛠️ Development

```bash
# Run migration
npm run migrate

# Start dev server
npm run dev

# Start production server
npm start
```

## 📁 File Structure

```
backend/
├── server.js       # Main Express server
├── db.js           # Database connection
├── migrate.js      # Database migration script
├── .env            # Environment variables
├── package.json    # Dependencies
└── README.md       # This file
```

## 🔄 Next Steps

1. ✅ Database setup - DONE
2. ✅ Shows endpoints - DONE
3. ✅ Tours endpoints - DONE
4. ✅ Invites endpoints - DONE
5. ⏳ Connect frontend to this backend
6. ⏳ Add Google Calendar integration
7. ⏳ Add proper Azure AD B2C token validation
8. ⏳ Add enhanced contacts endpoints

## 🐛 Troubleshooting

**Database connection error?**
- Check your `.env` file has the correct DATABASE_URL
- Make sure NeonDB is accessible

**CORS errors?**
- Check `FRONTEND_URL` in `.env` matches your frontend port
- Frontend must be on http://localhost:3000

**Migrations failing?**
- Delete all tables and re-run `npm run migrate`
- Check database connection string

## 📞 Support

Questions? Check the main `BACKEND_TODO.md` for full API specification.
