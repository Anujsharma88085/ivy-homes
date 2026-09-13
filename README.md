# Ivy Homes — Frontend Application & API Audit

> A production-style property discovery frontend with an automated API verification and data-quality audit pipeline.

**Candidate:** Anuj Kumar Sharma
**College:** Motilal Nehru National Institute of Technology (MNNIT) Allahabad
**Role:** Software Engineering Internship — September 2026
**Location:** Bengaluru

---

## 📌 Overview

This repository contains a full-featured property discovery frontend built on top of the **Ivy Homes Property API**.

In addition to the frontend application, the repository includes an automated **API verification and audit pipeline** designed to identify discrepancies between the provided API documentation and the actual behavior of the live backend.

The implementation focuses on:

* Property discovery
* Sale listings
* Rental listings
* Builder projects
* Saved properties
* Data quality analysis
* API contract verification
* Authentication and token management
* Handling inconsistent units
* Handling missing API endpoints
* Client-side analytics and recommendations
* Automated data-invariant checks

The central engineering principle followed during the audit was:

> **Treat the running API as the source of truth and verify every important assumption empirically.**

---

# 🏗️ Architecture

```text
                         ┌─────────────────────────┐
                         │       Ivy Homes API     │
                         │   https://solve.ivy.homes│
                         └────────────┬────────────┘
                                      │
                              REST API / Axios
                                      │
                                      ▼
                         ┌─────────────────────────┐
                         │     React Frontend      │
                         │       + Vite            │
                         └────────────┬────────────┘
                                      │
              ┌───────────────────────┼───────────────────────┐
              │                       │                       │
              ▼                       ▼                       ▼
       Property Search          Property Details        Insights
              │                       │                       │
              ▼                       ▼                       ▼
       Listings / Rentals       Saved Properties       Data Analysis
                                      │
                                      ▼
                               Local Fallbacks
```

---

# 🛠️ Tech Stack

| Category        | Technology                   |
| --------------- | ---------------------------- |
| Frontend        | React 18                     |
| Build Tool      | Vite                         |
| Styling         | Tailwind CSS                 |
| Icons           | Lucide React                 |
| Routing         | React Router v6              |
| HTTP Client     | Axios                        |
| Authentication  | Bearer Token + Refresh Token |
| Data Processing | Node.js                      |
| Deployment      | Vercel                       |
| Backend API     | Ivy Homes Property API       |

---

# ✨ Key Features

## Property Discovery

The frontend supports discovery of:

* Sale listings
* Rental properties
* Builder projects
* Property details
* Saved properties
* Similar-property recommendations
* Data-quality filtering
* Insights and analytics

---

## 🔐 Authentication

The application communicates with the Ivy Homes API using:

```text
X-API-Key
Authorization: Bearer <access_token>
```

Authentication is handled through Axios interceptors.

When an access token expires:

```text
API Request
     │
     ▼
   401
     │
     ▼
Refresh Access Token
     │
     ▼
Retry Failed Request
```

Concurrent requests are queued during token refresh to prevent multiple refresh operations from being triggered simultaneously.

---

# 📂 Project Structure

```text
ivy-homes/
│
├── src/
│   ├── components/
│   ├── pages/
│   ├── services/
│   ├── utils/
│   ├── hooks/
│   └── App.jsx
│
├── scripts/
│   ├── ingest.js
│   ├── finalize.js
│   └── build_submission.js
│
├── public/
│
├── .env.example
├── .gitignore
├── package.json
├── vite.config.js
└── README.md
```

> The exact directory structure may vary depending on the final implementation.

---

# 🚀 Getting Started

## Prerequisites

Make sure the following are installed:

* Node.js `>= 18`
* npm `>= 9`
* Git

Check your versions:

```bash
node --version
npm --version
git --version
```

---

## 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/ivy-homes-frontend.git

cd ivy-homes-frontend
```

Replace `YOUR_USERNAME` with the GitHub username associated with the repository.

---

## 2. Install Dependencies

```bash
npm install
```

---

## 3. Configure Environment Variables

Create a `.env` file:

```bash
cp .env.example .env
```

Configure the required environment variables:

```env
VITE_BASE_URL=https://solve.ivy.homes
VITE_API_KEY=YOUR_IVY_API_KEY
```

### ⚠️ Security

**Never commit `.env` to Git.**

The API key should only exist in your local environment or secure deployment environment.

A `.env.example` file should contain placeholders rather than real credentials:

```env
VITE_BASE_URL=https://solve.ivy.homes
VITE_API_KEY=YOUR_IVY_API_KEY
```

---

# ▶️ Running the Application

## Development

```bash
npm run dev
```

The Vite development server will normally be available at:

```text
http://localhost:5173
```

---

## Production Build

```bash
npm run build
```

---

# 🔍 API Audit Pipeline

The repository also contains scripts used to investigate the live Ivy Homes API.

## 1. Ingest the Catalog

```bash
node scripts/ingest.js
```

This authenticates with the API and retrieves catalog data through pagination.

The investigation covered:

* **3,350 sale listings**
* **1,300 rental records**
* **400 builder projects**

The retrieved data was stored locally for analysis.

---

## 2. Run the Audit

```bash
node scripts/finalize.js
```

This performs automated checks against the collected dataset.

The audit includes:

* Physical property invariants
* Unit consistency
* Data quality
* Price anomalies
* Geographic consistency
* Project/listing consistency
* Authentication behavior
* Pagination behavior
* Endpoint availability

---

## 3. Generate Submission Data

```bash
node scripts/build_submission.js
```

This generates:

```text
submission.json
```

containing the reproduced API discrepancies and investigation results.

---

# 🔬 Investigation Methodology

Instead of manually inspecting individual API records, the audit followed an automated data-ingestion and profiling approach.

## Step 1 — Full Dataset Ingestion

Authenticated against:

```http
POST /auth/login
```

and paginated through the available catalog resources.

The following resources were investigated:

```text
/v1/listings
/v1/rentals
/v1/projects
```

---

## Step 2 — Network & Contract Probing

Documented API parameters and authentication mechanisms were tested directly against the live API.

This was used to identify differences between:

```text
Documented Contract
        vs.
Actual API Behavior
```

---

## Step 3 — Physical Invariant Checks

Automated assertions were created to identify physically impossible property states.

Examples:

```text
floor > total_floors
```

```text
carpet_area > super_built_up_area
```

```text
price <= 0
```

```text
carpet_area <= 0
```

---

## Step 4 — Unit Distribution Analysis

Price-per-square-foot distributions were analyzed across different portal sources:

```text
magichomes
100acres
dwelling
squarelane
zerobroker
```

This analysis revealed an order-of-magnitude anomaly associated with `magichomes`.

The affected listings contained area values in:

```text
square meters (m²)
```

while the documented contract expected:

```text
square feet (sqft)
```

The approximate conversion is:

```text
1 m² ≈ 10.7639 sqft
```

---

## Step 5 — Cross-Resource Consistency

Active listings were grouped using:

```text
project_id
```

The resulting listing counts were compared against each project's:

```text
total_listings
```

This exposed significant inconsistencies between the two resources.

---

# 🚨 API Discrepancies Discovered

The following discrepancies were reproduced against the running API.

|  # | Endpoint                                      | Category         | Documented Behavior                                                               | Actual Behavior                                                                              |
| -: | --------------------------------------------- | ---------------- | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
|  1 | `*`                                           | Authentication   | API key supplied using `?api_key=...`                                             | Query parameter returns `401`; API key must be supplied through `X-API-Key`                  |
|  2 | `/v1/*`                                       | Authentication   | API key provides city-level access; authentication required only for user actions | Catalog routes require `Authorization: Bearer <token>`                                       |
|  3 | `/auth/login`                                 | Authentication   | `expires_in: 86400` (24 hours)                                                    | Actual expiry is `900` seconds (15 minutes); refresh token and `/auth/refresh` are available |
|  4 | `/health`                                     | Timestamps       | UTC ISO-8601 timestamps with `Z`                                                  | Returns explicit `+05:30` Asia/Kolkata offset                                                |
|  5 | `/v1/listings`, `/v1/rentals`, `/v1/projects` | Pagination       | 1-indexed `page` and `limit`                                                      | Offset-based pagination using `offset`, `limit`, and `has_more`                              |
|  6 | `/v1/listings`                                | Completeness     | Withdrawn/inactive listings excluded server-side                                  | Inactive listings are returned and include undocumented `is_live`                            |
|  7 | `/v1/listings`                                | Units            | Area represented as integer square feet                                           | `magichomes` records contain square-meter values                                             |
|  8 | `/v1/projects`                                | Units            | `price_min` and `price_max` represented as integer rupees                         | Values are expressed using Crores/Lakhs depending on magnitude                               |
|  9 | `/v1/listings`                                | Data Quality     | Genuine physical properties                                                       | 123 corrupt records were identified                                                          |
| 10 | `/v1/listings`                                | Fraud            | Real active sale listings                                                         | 6 listings contain monthly rental amounts in the sale-price field                            |
| 11 | `/v1/projects`                                | Consistency      | `total_listings` matches associated listings                                      | 298 of 400 projects contain contradictory counts                                             |
| 12 | `/v1/favourites`                              | Missing Endpoint | Endpoint available at `/v1/favourites`                                            | Returns `404`; actual endpoint is `/v1/saved`                                                |
| 13 | `/v1/listings/{id}/similar`                   | Missing Endpoint | Returns comparable listings                                                       | Returns `404`; handled client-side                                                           |
| 14 | `/v1/analytics/summary`                       | Missing Endpoint | Returns pre-computed analytics                                                    | Returns `404`; analytics are calculated client-side                                          |

---

# 🧪 Negative Hypotheses

A major part of the investigation was deliberately testing assumptions that might turn out to be false.

This helps avoid confirmation bias and demonstrates that the audit was based on empirical verification rather than only looking for failures.

---

## Hypothesis 1 — Invalid Coordinates

### Hypothesis

Because some property records contained corrupted physical attributes, coordinates might also contain invalid values.

Potential problems included:

* Swapped latitude/longitude
* `0, 0` coordinates
* Coordinates outside the assigned city
* Malformed geographic data

### Test

All 3,350 listings were checked against:

```text
28.25 <= latitude <= 28.65
```

and:

```text
76.80 <= longitude <= 77.25
```

### Result

**Clean.**

100% of the coordinates fell within the tested geographic bounds.

---

# Hypothesis 2 — Invalid Rental Deposits

### Hypothesis

Rental records might contain:

* Negative deposits
* Negative maintenance fees
* Unrealistically low deposits

### Test

The following conditions were checked:

```text
deposit >= price
```

and:

```text
maintenance >= 0
```

### Result

**Clean.**

No negative rental deposits or maintenance fees were identified.

Deposits generally ranged between approximately:

```text
2x – 10x monthly rent
```

---

# Hypothesis 3 — Invalid RERA Numbers

### Hypothesis

Builder projects might contain:

* Duplicate RERA numbers
* Structurally invalid RERA numbers
* Synthetic placeholder values

### Test

RERA numbers were checked for:

* Regex compliance
* Uniqueness per builder project

### Result

**Clean.**

Every builder project had a structurally valid and unique RERA identification string.

---

# Hypothesis 4 — Case-Sensitive Enum Problems

### Hypothesis

Categorical fields such as:

```text
furnishing
facing_direction
```

might contain inconsistent capitalization.

For example:

```text
semi-furnished
Semi-Furnished
SEMI-FURNISHED
```

Such inconsistencies could break frontend filtering.

### Test

Distinct categorical values were profiled across the entire dataset.

### Result

**Clean.**

The categorical enum values were consistently lowercase and normalized.

---

# 🛡️ How the Frontend Handles API Inconsistencies

The frontend does not blindly trust the documented API contract.

Instead, it incorporates defensive handling based on the behavior observed during the audit.

---

## 1. Automatic Token Refresh

Access tokens expire after a short period.

The frontend uses an Axios response interceptor:

```text
Request
   │
   ▼
API
   │
   ├── 200 ──► Return Response
   │
   └── 401
        │
        ▼
   Refresh Token
        │
        ▼
   Update Tokens
        │
        ▼
   Retry Request
```

Concurrent requests are queued while the refresh operation is in progress.

This allows the application to continue operating without requiring the user to manually log in again.

---

# 2. Unit Normalization

The API contains a unit inconsistency for `magichomes`.

The frontend detects the source:

```javascript
website === "magichomes"
```

and converts:

```text
m² → sqft
```

using:

```text
sqft = m² × 10.7639
```

This ensures that users see normalized area values.

---

# 3. Saved Properties Fallback

The documented endpoint:

```text
/v1/favourites
```

was found to return:

```text
404
```

The actual working endpoint is:

```text
/v1/saved
```

The frontend also maintains a local fallback using per-user `localStorage` keys:

```text
ivy_saved_<email>
```

This provides resilience when server-side saved-property operations are unavailable.

---

# 4. Client-Side Similar Properties

The documented endpoint:

```text
/v1/listings/{id}/similar
```

returns:

```text
404
```

Instead of failing the property-details page, the frontend synthesizes similar properties by querying listings using matching attributes such as:

```text
locality
bedroom count
```

This provides comparable-property functionality without relying on the unavailable endpoint.

---

# 5. Client-Side Analytics

The documented endpoint:

```text
/v1/analytics/summary
```

also returns:

```text
404
```

The frontend therefore calculates analytics locally.

The Insights dashboard can derive:

* Median values
* Price distributions
* Listing distributions
* Data-quality statistics
* Other catalog-level summaries

directly from the indexed dataset.

---

# 6. Data Quality Filters

The UI provides filtering for suspicious records.

Examples include:

```text
floor > total_floors
```

```text
price <= 0
```

and identified inquiry-bait/fake listing patterns.

This prevents obviously corrupt records from unnecessarily affecting the user's browsing experience.

---

# 📊 Key Findings

The audit revealed several important classes of API inconsistency.

### Authentication

The documented authentication flow does not completely match the running API.

### Pagination

The documented page-based pagination differs from the actual offset-based implementation.

### Units

Different data sources use inconsistent units.

### Data Quality

Some listing records contain physically impossible values.

### Fraud / Incorrect Values

A small number of sale listings contain values that resemble monthly rental prices.

### Cross-Resource Consistency

Project-level listing counts frequently disagree with the actual listing dataset.

### Missing Endpoints

Several documented endpoints are unavailable in the running API.

These findings demonstrate why API consumers should validate contracts against actual runtime behavior rather than relying exclusively on documentation.

---

# 🔮 Future Improvements

Given additional development time, I would prioritize the following improvements.

## 1. Virtualized Property Lists

Large datasets can contain thousands of listings.

Implement list virtualization using a library such as:

```text
react-window
```

This would reduce DOM overhead and improve scrolling performance.

---

## 2. Interactive Geospatial Map

Add an interactive map using:

```text
Leaflet
```

or:

```text
Mapbox
```

Potential features:

* Property markers
* Marker clustering
* Project boundaries
* Price heatmaps
* Location-based filtering

---

## 3. Continuous API Contract Testing

Create a GitHub Actions workflow that periodically executes the audit pipeline.

```text
GitHub Actions
       │
       ▼
Fetch Live API
       │
       ▼
Run Assertions
       │
       ├── PASS ──► Report Success
       │
       └── FAIL ──► Alert / Report Drift
```

This would detect future API contract changes automatically.

---

## 4. Property Comparison

Add a side-by-side comparison interface supporting up to four properties.

Possible comparison fields:

* Price
* Carpet area
* Built-up area
* Bedrooms
* Bathrooms
* Floor
* Total floors
* Price per sqft
* Project
* Location
* Builder information

---

# 🤖 AI Assistance Transparency

Large Language Models were used as a collaborative engineering tool during development.

AI assistance was used for:

* React component scaffolding
* Tailwind CSS boilerplate
* Exploratory Node.js audit scripts
* Repetitive implementation tasks
* Mathematical verification
* Unit-conversion calculations
* Exploring possible API failure hypotheses

However, the important engineering decisions were independently tested against the live API.

In particular:

* API behavior was reproduced manually and programmatically.
* Data assertions were executed against the collected dataset.
* Hypotheses were tested rather than assumed to be true.
* Discrepancies were reproduced before being included in the audit.
* Frontend fallbacks were based on observed API behavior.

The objective was to use AI to **accelerate implementation and exploration**, while retaining human responsibility for verification and engineering decisions.

---

# 📁 Generated Audit Artifacts

The audit pipeline can generate artifacts such as:

```text
submission.json
```

This file contains the reproduced discrepancies and structured investigation results required for submission.

---

# 🔐 Environment Variables

Create `.env.example` with:

```env
VITE_BASE_URL=https://solve.ivy.homes
VITE_API_KEY=YOUR_IVY_API_KEY
```

Never commit actual API credentials.

Add the following to `.gitignore`:

```gitignore
node_modules/
.env
.env.local
.env.*.local
dist/
```

---

# 🧑‍💻 Development Philosophy

The implementation follows several principles:

### Verify, Don't Assume

Documentation is treated as a hypothesis until verified against the running service.

### Fail Gracefully

Missing backend functionality should not unnecessarily break the frontend.

### Normalize at the Boundary

Inconsistent API data should be normalized before being presented to users.

### Automate Repetitive Investigation

Large datasets should be analyzed programmatically rather than manually.

### Preserve Evidence

Unexpected behavior should be reproduced and recorded before being treated as an API discrepancy.

---

# 📌 Conclusion

This project combines a property discovery frontend with a systematic API audit.

The main engineering challenge was not simply consuming the documented API, but determining where the **documented contract differed from the actual running service** and designing the frontend to remain reliable despite those inconsistencies.

The resulting system demonstrates:

* React frontend development
* REST API integration
* Authentication management
* Axios interceptors
* Token refresh flows
* Data ingestion
* Automated data validation
* Data-quality analysis
* Unit normalization
* Client-side fallback strategies
* API contract testing
* Defensive frontend engineering

The audit demonstrates a practical engineering workflow:

```text
Documentation
      │
      ▼
Form Hypothesis
      │
      ▼
Probe Live API
      │
      ▼
Collect Data
      │
      ▼
Run Automated Checks
      │
      ▼
Reproduce Discrepancy
      │
      ▼
Implement Robust Handling
      │
      ▼
Verify Again
```

---

## 👤 Author

**Anuj Kumar Sharma**

B.Tech — Computer Science & Engineering
Motilal Nehru National Institute of Technology (MNNIT) Allahabad

---

## 📄 License

This project was developed as part of the Ivy Homes Software Engineering Internship assignment.

All API data and endpoints referenced in this repository are subject to the terms and access controls of the Ivy Homes assignment environment.
