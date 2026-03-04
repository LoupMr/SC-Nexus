# 🚀 SC-Nexus: Org Logistics & Ops Portal

A high-performance, modern web application designed for **Star Citizen Organizations** to manage shared inventory, track mission-critical assets, and coordinate Conquest Zone operations.

## 🛠 Tech Stack

* **Framework:** Next.js 14+ (App Router)
* **Styling:** Tailwind CSS (Dark Mode / Sci-Fi Aesthetic)
* **Components:** Shadcn/UI + Lucide React Icons
* **Data Handling:** Local JSON Files (`/data/database.json` & `/data/ledger.json`)
* **State Management:** React Context (for Role-Based Access)
* **Deployement:** Docker 

---

## 📂 Project Structure & Data Schema

### 1. Item Database (`Database`)

Stores the "Master List" of every item in the game your Org tracks. CONTAINT JSON FILE FOR EACH CATEGORYES AND TYPE.


### 2. Ledger (`ledger.json`)

Tracks the actual physical stock owned by the Org.

```json
[
  {
    "id": "entry-1",
    "itemId": "uuid-1",
    "owner": "Commander_Starlight",
    "status": "Available",
    "quantity": 5,
    "location": "Orison Appt"
  }
]
add who took that item as well with data stempt so we know if some one took a item and we can track it as well.

```

---

## 🎨 Design System (The "Aegis/Anvil" Look)

* **Background:** `#020617` (Deep Space Blue/Black)
* **Primary Accent:** `#38bdf8` (Hologram Blue)
* **Secondary Accent:** `#f59e0b` (Industrial Orange)
* **Cards:** Semi-transparent "Glassmorphism" with thin 1px borders and subtle outer glows on hover.

---

## 🕹 Core Features to Implement

### 1. The Armory (Database View)

* **Layout:** Responsive grid of horizontal cards.
* **Card Anatomy:** * **Left:** Square thumbnail with object-contain.
* **Right:** Item Title, Category Badge, and a 2-column grid of "Stats."


* **Search/Filter:** Real-time filtering by category (Ship Weapons, FPS Gear, Consumables).

### 2. Conquest Ops (The Tactical Guide)

* **Objective Cards:** High-level mission cards (e.g., "Siege of Orison Prep").
* **Checklist Mode:** Lists specific items from the database needed for the op.
* **Drop Guide:** Mapping out which loot drops at which bunkers/zones.

### 3. The Ledger (Inventory Tracker)

* **Status Indicators:** Color-coded pips (Green = Stocked, Red = Low Stock).
* **Role-Based Access (RBAC):**
* **Viewer (Default):** Can see everything, but "Add Item" and "Edit" buttons are hidden.
* **Logistics Officer (Admin):** Can click an "Update Stock" button to open a modal form and modify the JSON data.



---

## 🛠 Development Roadmap (3-Day Sprint)

* **Day 1: Foundation.** Setup Next.js, Tailwind, and the JSON data structures. Build the Navigation Sidebar.
* **Day 2: Data Display.** Build the Item Card component and the Search/Filter logic for the Database and Ledger.
* **Day 3: Logic & UI.** Implement the Role Toggle (mock auth) and the "Ops Guide" layouts. Finalize the "Star Citizen" HUD styling.

---

