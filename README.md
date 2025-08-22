# Netflix Management Panel — Setup Guide

This project is a **Netflix-like management dashboard** for administrators. It includes:

* **Backend API (Node.js + Express)** with MySQL stored procedures and views.
* **Frontend (React + Vite)** dashboard with authentication, CRUD operations, and statistics.

---

## Features

* **Authentication**: JWT-based login with token expiry and auto-logout.
* **Account & Profiles**: Create, edit, delete accounts and profiles; track login attempts.
* **Media Management**: Create, update, delete media with genre, quality, description.
* **Subscriptions**: Create, update (quality), cancel subscriptions; enforce only one active subscription.
* **Preferences & Statistics**: Read-only views for preferences (anon) and watch stats.
* **Toasts & UX**: Clean notifications, protected routes, auto-redirect on token expiry.

---

## Prerequisites

* **Node.js** v18+
* **MySQL** 8.x
* **Git**

### Credentials / Roles

* Default admin login: `admin@netflix.com` / pass: `admin`
* MySQL user: `api` / pass: `api`- for express.js application (has access only to execute stored procedures)
* MySQL user: `junior` / pass: `junior`
* MySQL user: `medior` / pass: `medior`
* MySQL user: `senior` / pass: `senior`

---

## Setup Steps

### 1. Clone & Install

```bash
git clone <repo_url>
cd netflix_management_panel
```

Install backend and frontend dependencies:

```bash
# Backend
npm install

# Frontend
cd netflix-dashboard
npm install
```

---

### 2. Database Setup (Recommended through phpmyadmin)

1. Create database `netflix`.

2. Import schema (mock data included):

 ```sql
   source /netflix_management_panel/phpmyadmin_db_setup/netflix.sql;
   ```

4. Import users/permissions:
```sql
   source /netflix_management_panel/phpmyadmin_db_setup/previleges.sql;
   ```
   

---

### 3. Environment Variables

Create `.env` files in both backend(../netflix_management_panel/) and frontend( ../netflix_management_panel/netflix-dashboard ):

**Backend (`/`):**

```env
PORT=4000
DB_HOST=127.0.0.1
DB_USER=api
DB_PASS=api
DB_NAME=netflix
JWT_SECRET=supersecret
```

**Frontend (`/netflix-dashboard`):**

```env
VITE_API_URL=http://localhost:4000
```

Make sure your MySql server is running on default port 3306

---

### 4. Run the Backend

```bash
npm run dev / npm start
```

Backend starts at **[http://localhost:4000](http://localhost:4000)**.

Test endpoint:

```bash
curl http://localhost:4000/api/accounts/_ping
# { "ok": true, "scope": "accounts" }
```

---

### 5. Run the Frontend

```bash
cd netflix-dashboard
npm run dev / npm start
```

Frontend runs at **[http://localhost:5173](http://localhost:5173)**.

**Login** at `/login` with admin credentials.

---

## Usage Highlights

* **Login:** `/login`
* **Accounts/Profiles:** `/customers`
* **Media:** `/media`
* **Subscriptions:** `/subscriptions`
* **Preferences (anon):** `/preferences-anon`

## Postman Tests

You can test the API using our Postman collection:

[Open in Postman](https://postman.co/workspace/My-Workspace~c8a41641-9aa4-4dd6-80ce-cedb8b96aff7/request/40404530-86a909c9-0205-479d-ab15-27cb09b0a143?action=share&creator=40404530&ctx=documentation&active-environment=40404530-b926af74-3dce-42d6-9554-6790c2625513)

Login first, then copy JWT token and change JWT Token variable for collection to access other routes

### Notes

* JWT token expires in 1 hour. Auto-redirect to `/login` when expired.
* Age rating must be a number; release date required.
* Genres are selected from predefined options.
* Quality is checked when creating/updating media.

---

## License

For academic use / demo purposes only.
