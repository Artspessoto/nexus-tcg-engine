1. Overview
The goal of the project itself goes beyond being just a card roguelike game. The central objective is the implementation of a decoupled system, focused on scalability, maintenance, and a definitive separation of responsibilities (focusing on modularity).

2. Layered Division
Core Domain (Application State and Business Rules)
It is represented by the GameState, the main source of the project.

Responsibility: Manage the classic game states (hit points, mana, turn count, active player of the turn, current turn).

This layer was designed not to be tied to the framework (interface). If the graphics engine changes, the logic remains valid.

Managers (Orchestrators)
The Managers act as a service/use case layer. They are the orchestrators responsible for translating the player's or AI's will/intention into state changes and visual responses.

Example flow (playing a card):

The HandManager validates the card's existence.

The InputManager captures and handles the user's interaction with the object (enabling interactions and drag events).

The FieldManager handles the positioning of the object in the battle zone (monster and support zones).

Scenes (Visual Presentation)
The scenes are the Phaser life cycle (the graphics engine/framework). The primary responsibility of each scene is managing the loading of assets (icons, background, frame) via preload, camera rendering, backgrounds, and the transition between each UI state (button click, card click, menus, battle).

Components (Objects)
Classes such as Card and ToonButton are visual components that are already "autonomous" in their rendering and animations, but they do not make decisions about the game. They respond to user actions/commands sent from the Managers.

EventBus (Communication)
The EventBus was chosen as the communication tool within the project for acting as a central mediator, with the idea that each Manager communicates through this emission (emit) and subscription (on) without necessarily knowing each other.

Example flow (player life change): When the player's hit points change due to an attack, the CombatManager emits a BATTLE_RESOLVED event that the UIManager will process and update the player's hit points.

3. Artificial Intelligence and Heuristics
The project's AI architecture was designed to simulate an opponent with tactical knowledge adapted to the level chosen in the main menu. When in doubt, two thoughts occurred to me: how to assign weight to each move and how to measure it by its own defined level?

To solve the challenge of how to "measure the best move," a Weight Heuristic system and the Strategy Pattern were implemented.

Evaluation and Decision
The idea is that the AI has 2 main criteria to define its actions:

Analyzers (FieldAnalyzer, EffectAnalyzer): They act as analysts for the NPC, translating what is happening in the game into data format so that the Strategy can use it for decision-making. Example: monster numerical advantage, strongest opponent monster, urgency to recover hit points.

Strategies (EasyStrategy, MediumStrategy, HardStrategy): This is the NPC's brain, where it will analyze the data passed by the Analyzers and decide the weight and action based on the difficulty.

Weight Heuristics
Every possible executable move (attack, move card to the field, activate effect) has its score defined by a score, where this value is based on the current context of the field.

Examples:

Efficiency calculation: The monster/warrior is not only viewed by its ATK value, but rather by its efficiency from: (ATK + DEF) / Mana cost.

Validation of whether the AI remains at an advantage after a combat: It evaluates the monsters on each side of the field and defines if it remains at an advantage after the combat (by the amount of monsters x player's monsters).

Effect priority: A Burn effect (which deals direct damage) receives a massive score if the EffectAnalyzer detects that the damage will be lethal, ensuring that it prioritizes finishing the duel.