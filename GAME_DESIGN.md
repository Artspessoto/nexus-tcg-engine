# TOON CASTLE - Documentation (subject to updates)

## 1. Overview
**Toon Castle** is a single-player roguelike card game. The focus is on the tactical ascent of a 5-story tower, where wisdom, patience, and a lean deck of 20 cards are key to conquering the castle.

---
## 2. Functional Requirements (FR)

The functional requirements of this project aim to describe the actions that the system should allow the user to perform or that should occur automatically during the game.

| ID       | Requirement                       | Description                                                                                                                                |
| -------- | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **FR01** | **Deck Management**              | The player must have a fixed deck of exactly 20 cards.                                                                          |
| **FR02** | **Card Replacement**      | After defeating an NPC, the player chooses 1 of 3 offered cards. To add it, they must remove a current card from their deck. |
| **FR03** | **Floor flow**            | The game processes 5 castle levels. Each level features 4 common NPCs and 1 Final Boss..                                           |
| **FR04** | **Life System (Hearts)** | Manage the attempt system: Easy (5), Medium (3), and Hard (1). Losing a duel consumes one life.                            |
| **FR05** | **Duel Mechanics**         | Turn-based duels based on Mana consumption. The objective is to reduce the opponent's HP to zero.                                        |
| **FR06** | **Response Window (Traps)**        | When an attack is declared, the system must provide a Decision Modal for the defender. They can choose to activate a response or pass, pausing the combat flow until a decision is made.                                |
| **FR07** | **Priority AI**            | The NPC evaluates the field and its own hand, assigning weights to moves to decide the best action based on difficulty.               |

---
## 3. Non-Functional Requirements (NFR)

Non-functional requirements define the software's quality criteria.

| **ID**    | **Requirement**            | **Description**                                                                                                  |
| --------- | ------------------------ | -------------------------------------------------------------------------------------------------------------- |
| **NFR01** | **Engine Technology** | The game must be developed using the Phaser 3 framework..                                           |
| **NFR02** | **Logic and Typing**     | All code must be written in TypeScript for security and maintainability. |
| **NFR03** | **UI Architecture**    | The game must have a main menu with options for: Start, Guide, and Difficulty Selection.                 |

---
## 4. Game Rules

This section specifies the numbers governing combat balance.
### 4.1. Attribute and Damage System

Combat uses a Point Difference system based on the card's position:

- **Attack Mode:** The monster uses its ATK. If it defeats a monster in attack mode, the difference reduces the opponent's HP.
- **Defense Mode:** The monster uses its DEF. If it is attacked and its DEF is higher than the enemy's ATK, the attacker takes damage equal to the difference. If it is lower, the monster is destroyed, but the owner loses no HP.
- **Total HP:** Each duelist starts with 600 life points.

### 4.2. Mana and Turn Management

- **Starting Hand:** 5 cards (maximum of 6 cards in hand).
- **Draw per Turn:** 1 card.
- **Mana:** Each player starts with 5 mana points on the first turn. Mana increases by +2 every turn (no maximum limit defined yet).
---
## 5. Card Types and Effects

To enhance combat strategy, the base behavior for each card type is defined as:

1. **Monsters:** Primary units with ATK/DEF values.
2. **Effect Monsters:** Units with ATK/DEF values that possess a special effect when revealed. E.g., "When summoned, draw 1 card".
3. **Spells:** Immediate-use cards during the player's turn. Example: "Increases a monster's attack by 5 points".
4. **Traps:** Cards Set face-down. They can be activated when the opponent attacks. Example: "Reduces the attacking monster's attack by half".

---
## Priority Artificial Intelligence (AI)

This section details how the AI processes NPC decisions based on the difficulty level chosen by the player.

|**Level**|**Behavior Profile**|**Decision Strategy**|
|---|---|---|
|**Easy**|**Impulsive Aggressive**|Prioritizes spending all mana in the turn. Attacks whenever it has a monster with ATK higher than the target's DEF/ATK, without considering potential traps. 🟢|
|**Medium**|**Strategic Reactive**|Uses **Reactive Priority**. If it has a trap in hand, it may summon weak monsters in attack mode as bait. Attempts to keep mana reserves for critical turns. 🟡
|**Hard**|**Professional Strategist**|Analyzes the graveyard and the field. Calculates the cost-benefit of every trade and only attacks when it has a "safety net" (other monsters or protective traps). 🔴|

---
## 7. Interface and Board (Phaser 3 Layout)

The battle scene layout is fixed and divided into interaction zones.

**Field Zones (Slots):**
- **Monsters:** 3 central slots for each side.
- **Support (Spells/Traps):** 3 slots directly below (or above, for the NPC) the monsters.

**Resource Management:**
- **Bottom Left:** Displays HP (600) and the NPC/Player name.
- **Bottom Right:** Deck pile (20 cards) with a numerical counter.
- **Bottom Right (near deck):** Mana indicator.
- **Bottom Center:** Player's hand (starting at 5 cards).

 _Both players' resource areas are mirrored._

---
### 8. Navigation Flow and States

The game follows a linear and continuous flow inspired by _battle-rush_ systems.

1. **Preparation Scene:** Displays the current deck and the "Ready for the Castle" button.
2. **Battle Scene:** A cycle of 4 phases (Draw ➡️ Main ➡️ Battle ➡️ End Turn).
3. **Result Scene:**
	- **Victory:** Direct transition to the Reward Screen (Choose 1 of 3 hidden cards + mandatory substitution).
    - **Defeat:** Consumes 1 life (heart). If lives remain, a rematch is allowed; otherwise, a total progress Reset (Game Over) is executed.

---
## 9. Battle Phases

Each turn is divided into 4 mandatory states. The system blocks actions that do not belong to the current phase to prevent logic errors.

| **Phase**                | **Allowed Actions**                                 | **Automatic Rules**                                                                                               |
| ----------------------- | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| **1. Draw**    | None (System Action).                          | The system draws 1 card from the Deck to the Hand. If the Deck is empty, the Graveyard is reshuffled.            |
| **2. Main** | Summon Monsters; Activate Spells; Set Traps. | Player spends Mana. Summoning requires available slots (max 3). Spells can be activated directly from the hand.                         |
| **3. Battle** | Declare Attacks.                                | The system checks for opponent Traps. If found, the trigger activates before damage calculation. |
| **4. End Turn**      | None.                                            | Temporary effects expire. Control passes to the opponent.                 |

---
## 10. "Recycling" and Graveyard Logic

With a lean 20-card deck, managing the discard pile is vital to prevent duels from stalling.

- **Discard Flow:** Used Spells, activated Traps, and destroyed Monsters are moved to the **Graveyard**.
- **Reshuffling Condition:** If a draw is required and the deck has 0 cards, the system moves all cards from the Graveyard back to the Deck and reshuffles.
- **Interactivity:** Players can click the Graveyard pile to view discarded cards for strategic planning.

---
## 11. Tower Difficulty Scaling

As a roguelike, enemies grow stronger as the player ascends the floors.

- **Floors 1-2:** NPCs use basic decks with low ATK monsters and simple Spells/Traps.
- **Floors 3-4:** NPCs begin utilizing Effect Monsters and complex Trap cards.
- **Floor 5 (Top):** The Final Boss features exclusive cards with reduced mana costs or ATK exceeding 25.

---
## 12. Reward System and Rarities

After defeating an NPC, the player accesses the **Reward Screen**, where 3 card options are generated based on the floor's probability table.

### 12.1. Rarity Categories

- **Common (C):** Basic support cards and low-level monsters. ⚪
- **Rare (R):** Initial effect monsters and utility spells. 🔵
- **Epic (E):** Cost 3+ monsters and devastating traps. 🟣
- **Legendary (L):** Exclusive reward cards with game-changing effects 🟡

### 12.2. Exclusive Reward Cards (Drops)

These cards **cannot** be part of the player's initial deck. They serve as incentives for the climb.
- **Example:** "Toon Castle Master" (Legendary) – Only appears as a reward on floors 4 or 5.

---
## 13. Card Swap Interface

When selecting a reward card, the game enters **Substitution Mode** to ensure the deck remains at exactly **20 cards**.

### 13.1. Direct Comparison Functionality

The screen is divided for easier analysis:

- **Left Side (New Card):** Displays the chosen reward with rarity-based glow animations.
- **Right Side (Current Deck):** A scrollable list or grid of the player's current 20 cards.
- **Center Panel (Comparison):** Clicking a current card positions it next to the new one, highlighting attribute differences (e.g., higher ATK appears in green 🟢).

### 13.2. TypeScript Logical Flow

1. The system stores the new card.
2. The player selects the card from their deck to be removed.
3. The system saves the new deck state and proceeds to the next phase.

---
## 14. Exception Rules and Victory Conditions

### 14.1. Tie Resolution

- When two monsters in **Attack Mode** have the same **ATK**, both are destroyed and sent to the graveyard.
- No damage is subtracted from either player's HP in this situation.

### 14.2. Game Over and Reset

- The game ends when the player's **Hearts (Lives)** reach 0.
- **Reset Flow:** The player is sent to the Game Over screen; "Restart" clears progress, resets the deck to initial settings, and returns the player to the Main Menu.
  
---
## 15. Visual Standardization

- **Card Back:** All cards (Player and NPC) share the same back design to maintain mystery over Set cards.
- **Visual Feedback:** Cards must have clear visual states for: _Attack Mode (Vertical)_, _Defense Mode (Horizontal)_ e _Hidden Card (Face-down)_.


