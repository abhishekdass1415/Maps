# Map Platform - DB-First Mapping Solution

A production-ready map platform with smart search, API fallback, and marker clustering. Built with a **database-first architecture** that prioritizes cost control and offline readiness.

## 🎯 Project Overview

This is a Google Maps-like mapping platform that solves the problem of **uncontrolled API costs** and **dependency on external services**. Unlike traditional mapping solutions that query APIs on every request, this platform:

- **Stores all place data in NeonDB (PostgreSQL)** for fast, free queries
- **Uses Google Places API only as a fallback** when DB results are insufficient
- **Automatically caches API results** to reduce future API calls
- **Scales cost-effectively** as the database grows

### Problem Solved

Traditional mapping platforms face:
- High API costs (Google Places charges per request)
- Slow response times (external API latency)
- No offline capability
- Vendor lock-in

**Our solution**: DB-first architecture with intelligent fallback ensures:
- ✅ Zero API costs once database is populated
- ✅ Sub-100ms response times from local DB
- ✅ Works offline for cached locations
- ✅ Gradual migration away from API dependency

## 🏗️ Architecture

```
┌─────────────┐
│  Frontend   │  React + TypeScript + Leaflet
│  (React)    │
└──────┬──────┘
       │ HTTP REST API
       ▼
┌─────────────┐
│   Backend   │  Node.js + Express + Prisma
│  (Express)  │
└──────┬──────┘
       │
       ├──────────────┬──────────────┐
       ▼              ▼              ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│   NeonDB    │  │   Google    │  │   Cache     │
│ (PostgreSQL)│  │ Places API  │  │  (Async)    │
│             │  │  (Fallback) │  │             │
└─────────────┘  └─────────────┘  └─────────────┘
     Primary          Secondary        Background
```

### Data Flow

1. **User searches** → Frontend sends query to backend
2. **Backend checks DB first** → Fast, free query
3. **If results < threshold** → Fallback to Google Places API
4. **API results cached** → Saved to DB asynchronously
5. **Future queries** → Served from DB (no API cost)

## ✨ Key Features

- **🗄️ DB-First Architecture**: All queries hit database first, API is fallback only
- **🔍 Smart Search**: Intent detection (category, city, "near me") with natural language queries
- **🔄 API Fallback**: Automatic fallback to Google Places when DB results insufficient
- **💾 Auto-Caching**: API results automatically saved to DB for future use
- **📍 Marker Clustering**: Efficient rendering of thousands of markers
- **🎨 Modern UI**: Clean, responsive interface with keyboard navigation
- **⚡ Fast Performance**: Sub-100ms response times from local database

## 🛠️ Tech Stack

### Backend
- **Runtime**: Node.js v20.x (LTS)
- **Framework**: Express.js 5.2.1
- **ORM**: Prisma 6.19.1
- **Database**: NeonDB (PostgreSQL)
- **External API**: Google Places API (fallback only)

### Frontend
- **Framework**: React 19.2.0
- **Language**: TypeScript 5.9.3
- **Mapping**: Leaflet 1.9.4 + React-Leaflet 5.0.0
- **Clustering**: React-Leaflet-Cluster 4.0.0
- **Build Tool**: Vite 7.2.4

## 🚀 How to Run Locally

### Prerequisites

- **Node.js**: v20.x (LTS) - [Download](https://nodejs.org/)
- **PostgreSQL**: NeonDB account (free tier works) - [Sign up](https://neon.tech/)
- **Google Places API Key**: [Get API Key](https://developers.google.com/maps/documentation/places/web-service/get-api-key)

### Step 1: Clone Repository

```bash
git clone <repository-url>
cd map
```

### Step 2: Backend Setup

```bash
cd map-backend

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your credentials:
# DATABASE_URL="postgresql://..."
# GOOGLE_MAPS_API_KEY="your-api-key"
# PORT=4000

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate deploy

# Seed categories (optional)
npx prisma db seed

# Start backend server
npm run dev
# Backend runs on http://localhost:4000
```

### Step 3: Frontend Setup

```bash
cd map-frontend

# Install dependencies
npm install

# Start development server
npm run dev
# Frontend runs on http://localhost:5173
```

### Step 4: Verify Setup

1. **Check backend health**: `curl http://localhost:4000/api/health`
2. **Open frontend**: Navigate to `http://localhost:5173`
3. **Test search**: Try searching for "hospital in mumbai"

## 📁 Project Structure

```
map/
├── map-backend/
│   ├── src/
│   │   ├── routes/          # API endpoints
│   │   ├── services/        # Business logic
│   │   ├── providers/       # DB & API providers
│   │   ├── middleware/      # Request logging
│   │   └── server.ts        # Express app
│   ├── prisma/
│   │   ├── schema.prisma    # Database schema
│   │   └── migrations/      # DB migrations
│   └── package.json
│
├── map-frontend/
│   ├── src/
│   │   ├── App.tsx          # Main component
│   │   ├── App.css          # Styles
│   │   └── api.ts           # API client
│   └── package.json
│
└── README.md                 # This file
```

## 🔌 API Endpoints

### Health Check
```
GET /api/health
Returns: { status: "ok", db: "connected", timestamp: "..." }
```

### Categories
```
GET /api/categories
Returns: [{ slug: "hospital", displayName: "Hospital" }, ...]
```

### Places Search
```
GET /api/places?query=hospital+near+nagpur&lat=21.1458&lng=79.0882
Returns: [{ id, name, latitude, longitude, city, state }, ...]
```

### Nearby Places
```
GET /api/places/nearby?lat=21.1458&lng=79.0882&radius=5&category=hospital
Returns: { source: "database" | "external", places: [...] }
```

### Cities
```
GET /api/places/cities
Returns: ["Mumbai", "Delhi", ...]
```

## 🧊 Feature Freeze

This project is **feature-complete** and **frozen**. The following features are **intentionally excluded**:

- ❌ **Navigation/Routing**: No turn-by-turn directions
- ❌ **Authentication**: No user accounts or login
- ❌ **Traffic Data**: No real-time traffic information
- ❌ **Reviews/Ratings**: No user reviews or ratings
- ❌ **Real-time Updates**: No WebSocket or live updates
- ❌ **User Profiles**: No saved locations or favorites

**Why?** This project focuses on **core mapping functionality** with **cost-effective architecture**. Additional features would require:
- More complex state management
- Additional API integrations
- User data storage
- Real-time infrastructure

These are **out of scope** for this MVP.

## 💡 Interview Questions & Answers

### "How is this different from Google Maps?"

**Answer**: Google Maps queries APIs on every request, leading to high costs and latency. Our platform uses a **database-first architecture**:
- Stores all place data locally in PostgreSQL
- Queries database first (free, fast)
- Falls back to Google API only when needed
- Automatically caches API results to reduce future calls
- **Result**: Zero API costs once database is populated, sub-100ms response times

### "How do you avoid API costs?"

**Answer**: 
1. **Threshold-based fallback**: Only call API if DB results < 10 places
2. **Automatic caching**: All API results saved to DB asynchronously
3. **Duplicate prevention**: Check `externalId` before saving
4. **Natural progression**: As database fills, API usage naturally decreases
5. **Cost control**: Can set rate limits or disable API entirely

### "What happens when DB is full?"

**Answer**: 
- **API naturally stops being used** (threshold never met)
- **All queries served from DB** (fastest, cheapest)
- **No code changes needed** (fallback logic handles it)
- **Database scales** (PostgreSQL handles millions of rows)
- **Optional**: Can disable API fallback entirely via config

## 📝 Environment Variables

### Backend (.env)

```env
# Database (NeonDB PostgreSQL)
DATABASE_URL="postgresql://user:password@host/database?sslmode=require"

# Google Places API (fallback only)
GOOGLE_MAPS_API_KEY="your-api-key-here"

# Server
PORT=4000
NODE_ENV=development
```

### Frontend (.env)

```env
# API Base URL (if different from default)
VITE_API_BASE=http://localhost:4000/api
```

## 🧪 Testing

### Manual Testing Checklist

- [ ] Health check endpoint returns `200 OK`
- [ ] Search with query returns results
- [ ] Search with "near me" uses lat/lng
- [ ] Category filter works
- [ ] City filter works
- [ ] Empty states display correctly
- [ ] Keyboard navigation (Enter/Escape) works
- [ ] Marker clustering renders correctly
- [ ] API fallback triggers when DB results < 10

## 📄 License

ISC

## 👤 Author

Built as a portfolio project demonstrating:
- Database-first architecture
- Cost-effective API usage
- Production-ready code structure
- Modern full-stack development

---

**Tested with**: Node.js v20.x (LTS), Prisma 6.19.1, React 19.2.0
