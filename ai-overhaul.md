# AI System Overhaul Plan

## Objective
Modernize the Llama Stream Game AI training system to eliminate code duplication, improve scalability, and enable advanced evolutionary strategies.

## Phase 1: Modularization & De-Duplication
The current system suffers from "logic drift" where physics and level generation code differs between the visualization (`ai.html`) and the trainer (`fast_trainer.html`). We will extract shared logic into a common module library.

**Actions:**
1.  **Create Shared Library:**
    *   `server/shared/neural-network.js`: The `NeuralNetwork` class.
    *   `server/shared/physics.js`: Game loop, collision detection, and entity updates.
    *   `server/shared/level-generator.js`: Level design and generation logic.
    *   `server/shared/constants.js`: Shared configuration (gravity, speeds, dimensions).
2.  **Refactor Clients:**
    *   Update `ai.html` to load logic from `/shared/`.
    *   Update `server/fast_trainer.html` to load logic from `/shared/`.
3.  **Refactor Server:**
    *   Update `server/server.js` to serve the `shared` directory correctly.

## Phase 2: Data Scalability
The `networks.json` file is a performance bottleneck and risks corruption.

**Actions:**
1.  **Migrate to SQLite:**
    *   Replace file-based storage with `better-sqlite3`.
    *   Create a schema for `Networks` (blob storage for weights), `Evaluations` (relational), and `Generations`.
2.  **API Optimization:**
    *   Implement efficient "checkout" endpoints for clients to request work.
    *   Implement "check-in" endpoints for result submission.

## Phase 3: Evolutionary Improvements
Moving to a server-authoritative model allows for better evolutionary algorithms that can't run in a single browser tab.

**Actions:**
1.  **Server-Side Breeding:**
    *   The server will act as the "Population Manager", maintaining the master list of species and fitness scores.
    *   Clients become "Compute Nodes" that only evaluate fitness; they no longer run the genetic algorithm locally.
2.  **Species & Diversity:**
    *   Implement "Species" tracking to preserve unique topologies or strategies (protecting promising but unoptimized mutations).
    *   Track "Ancestry" to visualize the family tree of the best llamas.

## Execution Order
1.  **Phase 1** (Immediate): Fixes the immediate bugs and maintenance burden.
2.  **Phase 2** (Short-term): Enables running for days/weeks without crashing.
3.  **Phase 3** (Long-term): Unlocks "Super-human" performance.

## Verification
*   **Unit Tests:** Create a test suite for `physics.js` to ensure deterministic behavior.
*   **Parity Check:** Verify that a network achieves the exact same score in `ai.html` and `fast_trainer.html`.
