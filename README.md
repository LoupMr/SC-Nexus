# SC-Nexus

**A logistics and operations portal for Star Citizen organizations.**

SC-Nexus helps orgs manage shared inventory, coordinate operations, track member contributions, and publish guides—all in one place. Built for groups like Black Horizon Group who need structure, visibility, and control over their in-game assets and ops.

---

## What It Does

| Feature | Description |
|---------|-------------|
| **Armory** | Master item database. Search and filter by category, size, grade (weapons, components, FPS gear, etc.). |
| **Ledger** | Inventory tracker. Members add items (who owns what, where it’s stored). Org ledger shows shared stock; personal ledger shows your own. Take items, toggle sharing, track history. |
| **Guides** | Org guides and tutorials. Rich text editor, approval flow. Public guides viewable without login. |
| **Conquest Ops** | Tactical operation guides. Objectives, checklists, step tracking. |
| **Merits & Rewards** | Service record and requisition. Earn merit tags from ops, spend them on raffle prizes. |
| **Roster** | Org members and ranks. |
| **Links** | Curated Star Citizen resources. |
| **Members** | Admin-only member management and role assignment. |

---

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Database:** SQLite (better-sqlite3)
- **Auth:** Session cookies, bcrypt, role-based access (admin, logistics, ops, raffle, guide, viewer)
- **Styling:** Tailwind CSS v4, dark/light theme, sci-fi aesthetic
- **Editor:** Tiptap (guides), Lucide icons

---

## Getting Started

```bash
cd app
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The home page and guides are public; other pages require login.

---

## Project Structure

```
app/
├── src/
│   ├── app/          # Routes (armory, ledger, guide, conquest-ops, merits, roster, links, members)
│   ├── components/  # UI components
│   ├── context/     # Auth, theme
│   ├── lib/         # DB, session, database data
│   └── data/        # JSON source data (items, locations, etc.)
├── scripts/         # generate-database.mjs (builds SQLite from JSON)
└── data/            # SQLite DB outputs
```

---

## License

© 2026 LoupMr. All Rights Reserved. Proprietary. Use, copying, or distribution without permission is prohibited. See [LICENSE](LICENSE) for details.
