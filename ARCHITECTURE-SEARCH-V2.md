# 🏗️ Architecture Search Refactored - Version 2

**Date**: April 24, 2026  
**Status**: ✅ IMPLEMENTED  

---

## 📊 Architecture Overview

### **Backend Responsibilities** (SERVER HANDLES ALL LOGIC)

The backend (`server/firestore-operations.js` + `server/server-firebase.js`) manages:

| Feature | Function | File | Status |
|---------|----------|------|--------|
| **Filtres** | `searchCompanies()` filters by sector, region, city, status | firestore-operations.js:L141 | ✅ |
| **Logique Around Me** | Haversine distance calculation, radius filtering | firestore-operations.js:L190 | ✅ |
| **Scoring IA** | Rule-based lead score (0-100 scale) | firestore-operations.js:L76 | ✅ |
| **API Endpoint** | Unified POST /api/search with params | server-firebase.js:L761 | ✅ |
| **AI Summary** | Generates brief insight on results + avg score | server-firebase.js:L785 | ✅ |

### **Frontend Responsibilities** (DISPLAY ONLY)

The frontend (`mobile/index.html`) is simplified to:

| Action | Function | Responsibility |
|--------|----------|-----------------|
| Retrieve GPS | `openProspectsAroundMe()` | Get user coordinates (only frontend can) |
| Normal Search | `runSearch()` + `applyFilters()` | Accept filters, call API |
| Display Results | `renderResults()` | Render data returned by backend |
| User Interactions | UI/UX only | Handle clicks, menus, etc. |

---

## 🔄 Data Flow

### **Normal Search Flow**
```
1. User enters query + selects filters
   ↓
2. Frontend calls POST /api/search {query, filters}
   ↓
3. Backend processes:
   - Text search across 15+ fields
   - Firestore WHERE clauses (sector, region, city)
   - Compute leadScore for each company
   - Generate AI summary
   ↓
4. Frontend receives: {count, results[], ai_text}
   ↓
5. Frontend renders card grid (no processing)
```

### **Geolocation Search Flow**
```
1. User clicks "Prospects autour de moi"
   ↓
2. Frontend requests GPS (navigator.geolocation)
   ↓
3. Frontend calls POST /api/search {
      filters: { around_me: {lat, lon, radius_km} }
   }
   ↓
4. Backend processes:
   - Fetches all companies with coordinates
   - Haversine distance calculation for each
   - Filters by radius
   - Sorts by distance
   - Computes leadScore
   - Generates AI insights
   ↓
5. Frontend receives: {count, results[], ai_text, _distance_km}
   ↓
6. Frontend renders map + list (no calculation)
```

---

## 📡 API Endpoint Specification

### **POST /api/search**

**Request Body:**
```json
{
  "query": "restaurants",
  "filters": {
    "sector": "Hôtellerie et restauration",
    "region": "Centre",
    "city": "Yaoundé",
    "limit": 50,
    "around_me": {
      "lat": 3.8667,
      "lon": 11.5167,
      "radius": 10
    }
  },
  "use_ai": true
}
```

**Response:**
```json
{
  "count": 25,
  "source": "database",
  "ai_text": "Trouvé 25 entreprises — secteurs principaux : Hôtellerie et restauration (15), Commerce (7), Services (3) — score moyen : 72.",
  "results": [
    {
      "id": "comp123",
      "raison_sociale": "Restaurant XYZ",
      "sector": "Hôtellerie et restauration",
      "region": "Centre",
      "city": "Yaoundé",
      "leadScore": 85,
      "_distance_km": 2.4,
      "telephone": "+237...",
      "email": "...",
      ...
    }
  ]
}
```

---

## 🎯 Scoring Rules (Backend - Rule-Based AI)

| Factor | Points | Condition |
|--------|--------|-----------|
| Base Score | 45 | Starting |
| Status Penalty | -18 | If inactive/closed |
| Employees: 5-19 | +4 | Employee count |
| Employees: 20-49 | +10 | Employee count |
| Employees: 50-99 | +16 | Employee count |
| Employees: 100+ | +22 | Employee count |
| Job Posts: 1 | +6 | Active hiring |
| Job Posts: 2-4 | +10 | Active hiring |
| Job Posts: 5+ | +18 | Active hiring |
| Sector Info | +6 | Has sector/activité |
| Recent ≤30d | +8 | Data freshness |
| Recent 30-90d | +4 | Data freshness |
| **Result Range** | **1-100** | Capped at boundaries |

---

## ✅ Testing Checklist

### **Backend Tests**
- [ ] `/api/search` with `query` parameter works
- [ ] `/api/search` with `filters: {sector, region, city}` works
- [ ] `/api/search` with `filters: {around_me}` calculates distance correctly
- [ ] `leadScore` is always returned for each company
- [ ] `ai_text` summary is generated when `use_ai: true`
- [ ] Results are sorted by distance when `around_me` is present

### **Frontend Tests**
- [ ] Normal search (text + filters) displays results
- [ ] "Around Me" search retrieves GPS and displays map
- [ ] Results grid renders without errors
- [ ] No calculation logic in frontend (all from backend)
- [ ] Offline cache works correctly
- [ ] Error handling for network issues

---

## 📁 Files Modified

| File | Changes |
|------|---------|
| `server/server-firebase.js` | Added documentation to POST /api/search endpoint |
| `mobile/index.html` | Simplified `runSearch()` and `openProspectsAroundMe()` with comments |
| `server/firestore-operations.js` | No changes (already correct) |

---

## 🚀 Summary

✅ **Backend** handles all business logic:
- Filter application
- Distance calculation (around_me)
- Lead scoring
- AI summary generation

✅ **Frontend** simplified to pure display:
- GPS retrieval (only client capability)
- API calls with parameters
- Result rendering

✅ **API** unified at `/api/search` for all search types

✅ **Architecture** now follows proper separation of concerns
