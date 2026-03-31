# Toon Castle: TCG Engine & Event-Driven Architecture
### High-Performance Game Engine built with Phaser 3, TypeScript, and Vitest

## Getting Started

Follow these instructions to get a copy of the project up and running on your local machine.

### Requirements

- **Node.js** (v22 or higher)
- **npm**

### Installation

1. Clone the repository (Bash):
```bash
git clone https://github.com/Artspessoto/nexus-tcg-engine.git
```

2. Install dependencies:
```bash
npm install
```

### Scripts
*  **Start the game with:**
```bash
npm run dev
```

*  **Production Build:** Clean `dist`, run type-check, and build for production.
```bash
npm run build
```

*  **Testing:** Run unit tests via **Vitest**.
```bash
npm run test # Watch mode 
npm run test:ci # Single run 
npm run test:cov # Coverage report
```

* **Linting & Formatting:** Keep the code clean and standardized.
```bash
npm run lint # Check for errors 
npm run format # Fix formatting via Prettier
```

*  **Type-Check:** Validate TypeScript without emitting files.
```bash
npm run type-check
```

### Project Documentation
For a deeper dive into the project, please refer to the following documents:
-  **[Game Design & Rules](./GAME_DESIGN.md):** Detailed combat mechanics, card rarities, and floor scaling.
-  **[Technical Architecture](./ARCHITECTURE.md):** Clean architecture, Design Patterns, and AI heuristics.

Inside the architecture guide, you will find:
* **Layered Design:** Details on Domain (GameState), Managers, and Presentation layers.
* **Design Patterns:** How we applied Strategy, Observer, and Singleton patterns.
* **AI Heuristics:** A deep dive into the weighted scoring system for NPC decision-making.
