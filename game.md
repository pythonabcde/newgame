# Connection Sorting — Full Technical Specification (Final Version)

## 1. High-Level Overview

### 1.1 Concept

“Connection Sorting” is a browser-based, real-time multiplayer classroom game (typical 16–24 players).

* One *host* creates a room and projects their screen.
* Students join on their own devices using a room code and their *real name*.
* In the lobby, the host assigns each student to one of *two abstract, colorless groups*:

  * *Group 1*
  * *Group 2*
* When the game starts, the two groups are *randomly assigned colors*:

  * One becomes *Blue* (#6EC1FF).
  * The other becomes *Red* (#FF8A80).
* This color–group mapping is *never explicitly shown*; only the zones in the game show blue/red.

In-game:

* Each player controls one anonymous gray circle on a shared 2D map.
* The game never directly tells players:

  * Which circle they control.
  * Which group/team they are on.
  * Which group corresponds to which color.
* Players must infer:

  * Which circle they are (via movement).
  * Who their teammates are (via coordinated movement).
  * How to sort into two zones according to these hidden teams/colors.

Two moving zones travel around the map in opposite positions on a *rectangular path* near the edges (but never touching the edges). The class cooperatively tries to maximize a *sorting accuracy percentage* by the end of a 5-minute round.

---

## 2. Roles and Session Lifecycle

### 2.1 Roles

#### Host

* Creates and manages a room.
* Sees all joined players’ *real names*.
* Assigns players to *Group 1* and *Group 2* using drag-and-drop.
* Starts the game when groups are ready.
* Does not control any circle.
* During the game, sees the same view and zone colors as players; never sees a mapping of Group 1 → Blue or similar.

#### Players

* Join via room code and real name.
* Control one anonymous circle.
* Are not told:

  * Their team/group.
  * Which circle is theirs.
  * Which color corresponds to which group.

---

### 2.2 Session Flow

1. *Host creates a room*

   * Host visits /host.
   * Clicks *Create Room*.
   * Server creates:

     * roomCode: 6-character uppercase alphanumeric (e.g. A4QX9L).
     * maxPlayers = 32.
     * durationSeconds = 300 (5 minutes).
   * Host is taken to the *Host Lobby*.

2. *Players join*

   * Players visit /join.
   * Must enter:

     * *Room Code* (required).
     * *Real Name* (required).
   * Validation:

     * Empty code → “Please enter a room code.”
     * Empty name → “Please enter your name.”
   * If room exists and game not running:

     * Player is added to room with:

       * name recorded.
       * teamId = null (unassigned).
   * Otherwise:

     * Show “Room not found or already in progress.”

3. *Host assigns players to Group 1 / Group 2 (drag-and-drop)*

   * Host sees three columns:

     * *Unassigned*
     * *Group 1*
     * *Group 2*
   * Each player appears as a draggable card (name only) in *Unassigned* on join.
   * Host drags cards into *Group 1* or *Group 2*.
   * Cards can be moved between all three columns.
   * Internal mapping:

     * teamId = "TEAM1" if in Group 1.
     * teamId = "TEAM2" if in Group 2`.
     * teamId = null if in Unassigned.
   * *Start Game* button enabled only when:

     * totalPlayers >= MIN_PLAYERS_TO_START (default 4), and
     * Unassigned is empty.

4. *Player waiting room (“How to Play” screen)*

   Once players are assigned and while the host hasn’t started yet, players see a waiting screen with concise instructions.

   Suggested text:

   * Title: *“Connection Sorting — How to Play”*

   * Bullet points (or equivalent):

     1. You are one of the gray circles in a shared world, but the game will not show which one is you.
     2. Use *WASD* or *arrow keys* to move.
     3. Press *Spacebar* to dash: a short speed burst in your last movement direction.
     4. Dashing has a *cooldown*. You must wait for the dash meter to refill before dashing again.
     5. Two colored zones move around the edges of the map. Your goal is to end in the correct zone with your hidden teammates.
     6. No talking or pointing to the screen, but you can use other non-verbal signals (within classroom rules) to coordinate.

   * At bottom: “Waiting for the host to start the game…”

5. *Game start: random color mapping and spawn*

   When the host clicks *Start Game*:

   * Server:

     * Confirms all players have teamId = "TEAM1" | "TEAM2".

     * Locks team assignments.

     * Randomly maps groups to colors:

       text
       If random < 0.5:
         TEAM1 → Blue (#6EC1FF)
         TEAM2 → Red  (#FF8A80)
       Else:
         TEAM1 → Red  (#FF8A80)
         TEAM2 → Blue (#6EC1FF)
       

     * Stores:

       ts
       teamColor: {
         "TEAM1": "#6EC1FF" | "#FF8A80",
         "TEAM2": "#FF8A80" | "#6EC1FF"
       }
       

     * Initializes:

       * Zone positions and time parameter.
       * Player spawn positions (central, non-overlapping with zones; see 3.3.2).
       * Dash/cooldown state.
       * Countdown timer.

     * Sets state = "RUNNING".

     * Sends GAME_START { durationSeconds, mapConfig } to all clients.

6. *Game running*

   * All clients see:

     * Whole map.
     * All gray circles.
     * Two moving zones on opposite sides of a rectangular path near the edges (≥ 8 units from any edge).
   * Players:

     * Move and dash, using the *dash cooldown UI* to understand when dash is available.
     * Try to infer identity, team, and zones.

7. *Game end*

   * When timer reaches 0:

     * Server stops simulation.
     * Computes sorting accuracy.
     * Sends GAME_END with results to all clients.

8. *Post-game*

   * Host sees results.
   * Host can:

     * Return to lobby (same players) and re-assign groups; a new round re-randomizes color mapping.
     * End session (destroy room and return to /host).

---

## 3. Game Mechanics

### 3.1 Teams (Abstract Groups + Hidden Colors)

Internal team IDs:

* TEAM1 (Group 1)
* TEAM2 (Group 2)

At game start, each is randomly mapped to blue or red.

Colors:

* Blue: #6EC1FF
* Red: #FF8A80

Players are never explicitly shown the mapping.

*Player data model:*

ts
interface Player {
  playerId: string;
  roomCode: string;
  name: string;                         // Required real name
  teamId: "TEAM1" | "TEAM2" | null;     // null in lobby, TEAM1/TEAM2 in game

  x: number;
  y: number;
  vx: number;
  vy: number;

  // Dash state (authoritative on server)
  isDashing: boolean;
  dashTimeRemaining: number;            // seconds left in current dash
  lastNonZeroMoveDir: { x: number; y: number }; // normalized
  nextDashAvailableTime: number;        // game-time when dash is usable again

  connected: boolean;
}


---

### 3.2 Map

* Map dimensions:

  * MAP_WIDTH = 100
  * MAP_HEIGHT = 60
* Everyone sees the full rectangular map.

Visual:

* Background: #FAFAFA.
* Grid lines:

  * Every 5 units horizontally and vertically.
  * Color: #E0E0E0.
  * Thin and subtle.

---

### 3.3 Players and Movement

#### 3.3.1 Player Circles

* Radius: PLAYER_RADIUS = 1.5.
* Fill: #E0E0E0 (light gray).
* Stroke: #000000.
* No labels, IDs, or highlight on local circle.

#### 3.3.2 Spawn Positions at Game Start

At round start:

* Players must *not* spawn:

  * Inside either zone.
  * Within 2 units of any zone boundary:

    * distance(spawn, zoneCenterAtT0) ≥ ZONE_RADIUS + 2.
  * Within 2 units of any map edge:

    * x ∈ [PLAYER_RADIUS + 2, MAP_WIDTH - PLAYER_RADIUS - 2].
    * y ∈ [PLAYER_RADIUS + 2, MAP_HEIGHT - PLAYER_RADIUS - 2].
* Players are spread out across a central region so everyone has freedom to move.

Implementation suggestion:

* Define a central spawn rectangle:

  * SPAWN_MIN_X = 25, SPAWN_MAX_X = 75
  * SPAWN_MIN_Y = 15, SPAWN_MAX_Y = 45

* Create a grid of spawn slots in that rectangle (e.g. 4×8 or 5×5 grid).

* Assign players to distinct slots.

* For each slot, verify zone distance constraint. If a slot violates it, skip or adjust.

Result:

* Players are centrally placed, not clumped.
* No one starts in or right next to a zone.

#### 3.3.3 Normal Movement

* Base speed: PLAYER_SPEED = 15 units/second.
* Per tick:

  * Read (moveX, moveY) from WASD/arrow keys (-1, 0, 1).
  * Normalize if both components non-zero.

Velocity when not dashing:

pseudo
dir = normalize(moveX, moveY) or (0,0)
vel = dir * PLAYER_SPEED
tentativePos = player.pos + vel * dt


* Clamp:

  * x ∈ [PLAYER_RADIUS, MAP_WIDTH - PLAYER_RADIUS]
  * y ∈ [PLAYER_RADIUS, MAP_HEIGHT - PLAYER_RADIUS]

Collisions (non-dash):

* If movement would overlap another circle, adjust or cancel movement so no overlaps remain.

#### 3.3.4 Dash: Short Burst with Cooldown and Collision

Dash = brief high-speed burst in last movement direction, with cooldown and collision-enforced.

Parameters:

* DASH_DURATION_SECONDS = 0.20 (≈200ms).
* DASH_SPEED_MULTIPLIER = 4.0.
* DASH_COOLDOWN_SECONDS = 2.

Tracking:

* lastNonZeroMoveDir updated whenever (moveX, moveY) != (0,0).
* nextDashAvailableTime indicates when dash is ready again.
* isDashing and dashTimeRemaining track active dash burst.

Activation:

* Press Spacebar.
* Dash starts only if:

  * isDashing == false.
  * currentTime >= nextDashAvailableTime.
  * lastNonZeroMoveDir is non-zero.
* On dash start:

  * isDashing = true.
  * dashTimeRemaining = DASH_DURATION_SECONDS.
  * nextDashAvailableTime = currentTime + DASH_COOLDOWN_SECONDS.

Movement while dashing:

pseudo
dashDir = lastNonZeroMoveDir
speed = PLAYER_SPEED * DASH_SPEED_MULTIPLIER
vel = dashDir * speed
tentativePos = player.pos + vel * dt
tentativePos = clampToBounds(tentativePos)


Collisions while dashing:

* Player–player collisions are enforced.
* If dash movement would cause a collision:

  * Move player up to collision point or cancel this tick’s movement (implementation-dependent).
  * Immediately end dash:

    * isDashing = false
    * dashTimeRemaining = 0
  * Dash cooldown is still consumed.

Dash time expiration:

pseudo
if isDashing:
  dashTimeRemaining -= dt
  if dashTimeRemaining <= 0:
    isDashing = false
    dashTimeRemaining = 0


---

### 3.4 Zones

Two zones:

ts
interface Zone {
  zoneId: string;
  x: number;
  y: number;
  ownerTeamId: "TEAM1" | "TEAM2" | null;
}


* Radius: ZONE_RADIUS = 8.

Visual:

* ownerTeamId == null:

  * Fill: rgba(200, 200, 200, 0.3)
  * Stroke: #9E9E9E
* ownerTeamId == "TEAM1":

  * Fill: teamColor["TEAM1"] @ 0.3 alpha
  * Stroke: teamColor["TEAM1"] @ 1.0 alpha
* ownerTeamId == "TEAM2":

  * Fill: teamColor["TEAM2"], same logic.

#### 3.4.1 Zone Ownership

Ownership logic uses *earliest continuous occupant*:

Per tick:

1. For each zone, compute insideZone = { players | distance(player, zone.center) ≤ ZONE_RADIUS }.
2. Track for each zone which players are inside and when they entered (continuous entryTimestamp).
3. If insideZone is empty:

   * ownerTeamId = null.
4. Else:

   * Let earliestPlayer = player with smallest entryTimestamp.
   * ownerTeamId = earliestPlayer.teamId.

---

### 3.5 Zone Movement: Rectangular Path, Opposite Positions

Zones move on opposite points of a rectangular path inside the map, staying ≥ 8 units from edges.

Define path rectangle for zone centers:

* (X_MIN, Y_MIN) = (8, 8)
* (X_MAX, Y_MAX) = (MAP_WIDTH - 8, MAP_HEIGHT - 8) → (92, 52) for 100×60.

Zones traverse rectangle clockwise:

* Edge 1: (X_MIN, Y_MIN) → (X_MAX, Y_MIN) (top).
* Edge 2: (X_MAX, Y_MIN) → (X_MAX, Y_MAX) (right).
* Edge 3: (X_MAX, Y_MAX) → (X_MIN, Y_MAX) (bottom).
* Edge 4: (X_MIN, Y_MAX) → (X_MIN, Y_MIN) (left).

Let:

* PERIM = 2 * ((X_MAX - X_MIN) + (Y_MAX - Y_MIN)).
* loopPeriodSeconds = time to complete one loop (e.g. 60s).

For Zone 1:

pseudo
s1 = (t / loopPeriodSeconds) mod 1   // 0..1
d1 = s1 * PERIM                      // distance along perimeter
(x1, y1) = positionOnRectangle(d1)


For Zone 2 (opposite position):

pseudo
d2 = (d1 + PERIM / 2) mod PERIM
(x2, y2) = positionOnRectangle(d2)


With this:

* Zones are always far apart and never overlap.
* They remain near edges but ≥ 8 units from them.
* A player can only be inside one or zero zones at a time.

---

### 3.6 Scoring

At game end:

For each player:

1. Compute:

   * inZone1 = distance(player.pos, zone1.center) ≤ ZONE_RADIUS.
   * inZone2 = distance(player.pos, zone2.center) ≤ ZONE_RADIUS.
2. If neither:

   * Player is incorrect.
3. If exactly one is true:

   * targetZone is that zone.
4. Player is *correctly sorted* if:

   * targetZone.ownerTeamId === player.teamId, and
   * targetZone.ownerTeamId != null.

Compute:

* totalPlayers = number of connected players at end.
* correctPlayers.
* accuracyPercent = (correctPlayers / totalPlayers) * 100.

Optional per-group stats:

* Group 1 (TEAM1): total, correct, %, etc.
* Group 2 (TEAM2): total, correct, %, etc.

---

## 4. User Interface

### 4.1 Style

* Font: system sans-serif.
* Colors:

  * Background: #FAFAFA.
  * Text: #212121.
  * Buttons:

    * Background: white.
    * Border: #BDBDBD.
    * Hover: #E0E0E0.
  * Zone colors: Blue #6EC1FF, Red #FF8A80.

---

### 4.2 Host UI

#### 4.2.1 Host Landing (/host)

* Title: “Connection Sorting — Host”.
* Button: *Create Room*.

---

#### 4.2.2 Host Lobby (Drag-and-Drop)

Top:

* Large room code (e.g. A4QX9L).
* Text: “Ask students to go to /join and enter this code.”

Middle: three columns:

1. *Unassigned*

   * Header: “Unassigned”.
   * Draggable cards (player names).

2. *Group 1*

   * Header: “Group 1”.
   * Drop zone; cards dropped here get teamId = "TEAM1".

3. *Group 2*

   * Header: “Group 2”.
   * Drop zone; cards dropped here get teamId = "TEAM2".

On drop, send HOST_UPDATE_TEAM { playerId, teamId }.

Bottom:

* “Total: X”
* “Group 1: Y”
* “Group 2: Z”
* “Unassigned: U”

Buttons:

* *Start Game* (enabled only when X ≥ MIN_PLAYERS_TO_START and U == 0).
* *End Session* (destroy room, return to /host).

---

#### 4.2.3 Host Game View

* Fullscreen map canvas.
* Overlays:

  * Top center: Time left: mm:ss.
  * Top left: Players: X.

---

#### 4.2.4 Host End Screen

* “Time’s up!”
* “Class sorting accuracy: XX% (C / N players).”
* Optional group breakdown:

  * “Group 1: A / T1 correct (YY%).”
  * “Group 2: B / T2 correct (ZZ%).”

Buttons:

* *Back to Lobby*.
* *End Session*.

---

### 4.3 Player UI

#### 4.3.1 Join Screen (/join)

Inputs:

* Room Code (required).
* Name (required; “Your real name”).

Button: *Join Game*.

Error messages:

* Missing room code.
* Missing name.
* Invalid room.

---

#### 4.3.2 Wait Room (“How to Play”)

* Title: “Connection Sorting — How to Play”.
* Short instructions (as in 2.2.4).
* Text: “Waiting for host to start the game…”

---

#### 4.3.3 Player Game View

Components:

1. *Main canvas*:

   * Full map, all circles, both zones.

2. *Top-center overlay*:

   * Time left: mm:ss.

3. *Bottom-center overlay*:

   * Text instructions:

     * “Move: WASD or arrow keys”
     * “Dash: Spacebar”

4. *Dash cooldown UI (required)*

   * This explicitly solves:

     * Players know there *is* a cooldown.
     * Players know *how long* until dash is ready again.

   Requirements:

   * A small, always-visible UI element labeled clearly, e.g. “Dash”.
   * Recommended placement: *bottom-right corner* of the screen.

   Example behavior:

   * When dash is available:

     * Show: Dash: READY.
     * A full bar or full circle.
   * When dash is used:

     * Immediately show something like:

       * Dash: 2.0s
       * A progress bar counting down from 2s to 0s.
     * Update on every frame/tick (or ~10 times/second) to show remaining cooldown, e.g. Dash: 1.3s, Dash: 0.5s, etc.
   * When remaining cooldown ≤ 0:

     * Change back to Dash: READY and restore the bar.

   Implementation options:

   * Client can derive remaining cooldown using:

     * Last dash start time (when server accepts PLAYER_INPUT with dash).
     * Constant DASH_COOLDOWN_SECONDS.
   * Or, server can include localDashCooldownRemaining in GAME_STATE for the requesting player.
   * In either case, the UX must make it trivial to see:

     * That dash cannot be spammed (dash only when READY).
     * How many seconds remain.

No labels on circles, no team information.

---

#### 4.3.4 Player End Screen

* “Round finished!”
* “Class sorting accuracy: XX% (C / N players).”

Buttons:

* “Ready for next round”.
* “Leave game”.

---

## 5. Networking & Architecture

### 5.1 Tech Stack (Recommended)

* Frontend: HTML5 Canvas + JavaScript/TypeScript (framework optional).
* Backend: Node.js + WebSockets (ws or Socket.IO).

---

### 5.2 Authoritative Server Model

* Server is authoritative for:

  * Player positions and dash state.
  * Zone positions and ownership.
  * Timer and game state.
  * Team ↔ color mapping.
* Tick rate: SERVER_TICK_RATE = 30 updates/second.

---

### 5.3 Events

Client → Server:

* HOST_CREATE_ROOM
* PLAYER_JOIN_ROOM { roomCode, name }
* HOST_UPDATE_TEAM { playerId, teamId }  // "TEAM1", "TEAM2", or null
* HOST_START_GAME { roomCode }
* PLAYER_INPUT { roomCode, playerId, moveX, moveY, dashPressed, inputSeq }

Server → Client:

* ROOM_CREATED { roomCode }
* LOBBY_UPDATE { players: [{playerId, name, teamId}], counts: {team1, team2, unassigned} }
* GAME_START { durationSeconds, mapConfig }
* GAME_STATE { players: [{playerId, x, y}], zones: [{zoneId, x, y, ownerTeamId, colorHex}], timeLeft }

  * Optional: may also include localDashCooldownRemaining for the requesting player.
* GAME_END { accuracyPercent, correctPlayers, totalPlayers, perGroup? }
* ERROR { message }

---

## 6. Server Logic (Summary)

### 6.1 Update Loop (with Dash + Collisions)

pseudo
loop every 1 / SERVER_TICK_RATE seconds:
  dt = time since last tick
  t  = time since game start

  // Update zones on rectangular path
  updateZonePositionsRectangle(t)

  // Update players
  for each player:
    input = latest input for this player

    // Track last non-zero direction
    if (input.moveX, input.moveY) != (0,0):
      player.lastNonZeroMoveDir = normalize(input.moveX, input.moveY)

    // Dash start
    if input.dashPressed and not player.isDashing:
      if currentTime >= player.nextDashAvailableTime
         and player.lastNonZeroMoveDir is non-zero:
        player.isDashing = true
        player.dashTimeRemaining = DASH_DURATION_SECONDS
        player.nextDashAvailableTime = currentTime + DASH_COOLDOWN_SECONDS

    // Determine direction & speed
    if player.isDashing:
      dir   = player.lastNonZeroMoveDir
      speed = PLAYER_SPEED * DASH_SPEED_MULTIPLIER
    else:
      dir   = normalize(input.moveX, input.moveY)
      speed = PLAYER_SPEED

    vel = dir * speed
    tentativePos = player.pos + vel * dt
    tentativePos = clampToBounds(tentativePos)

    // Collisions
    if player.isDashing:
      if wouldCollide(tentativePos, player, others):
        player.pos = resolveCollisionStopEarly(player.pos, vel, dt, others)
        player.isDashing = false
        player.dashTimeRemaining = 0
      else:
        player.pos = tentativePos
    else:
      player.pos = resolveCollisions(tentativePos, player, others)

    // Update dash timer
    if player.isDashing:
      player.dashTimeRemaining -= dt
      if player.dashTimeRemaining <= 0:
        player.isDashing = false
        player.dashTimeRemaining = 0

  // Update zone ownership
  updateZoneOwnershipByEarliestContinuousOccupant()

  // Broadcast state
  broadcast GAME_STATE to all clients


### 6.2 End-of-Game Scoring

pseudo
onTimerEnd(room):
  players = all connected players
  totalPlayers = count(players)
  correctPlayers = 0

  for each player in players:
    inZone1 = distance(player.pos, zone1.center) <= ZONE_RADIUS
    inZone2 = distance(player.pos, zone2.center) <= ZONE_RADIUS

    if not inZone1 and not inZone2:
      continue

    targetZone = zone1 if inZone1 else zone2

    if targetZone.ownerTeamId != null
       and targetZone.ownerTeamId == player.teamId:
      correctPlayers++

  accuracyPercent = (correctPlayers / totalPlayers) * 100
  send GAME_END(accuracyPercent, correctPlayers, totalPlayers, perGroupStats)


---

## 7. Configurable Constants

* MAX_PLAYERS = 32
* MIN_PLAYERS_TO_START = 4
* GAME_DURATION_SECONDS = 300
* MAP_WIDTH = 100
* MAP_HEIGHT = 60
* PLAYER_RADIUS = 1.5
* ZONE_RADIUS = 8
* PLAYER_SPEED = 15
* DASH_DURATION_SECONDS = 0.20
* DASH_SPEED_MULTIPLIER = 4.0
* DASH_COOLDOWN_SECONDS = 2
* SERVER_TICK_RATE = 30
* ROOM_CODE_LENGTH = 6

---

## 8. Edge Cases

* Player disconnects in lobby:

  * Removed from group columns; counts update.
* Player disconnects during game:

  * Removed from simulation; not counted in final stats.
* Player attempts to join mid-game:

  * Rejected with error.
* Host disconnects:

  * Room destroyed; players see “Host disconnected.”
* Zones:

  * Rectangular path prevents overlaps; if overlap occurs due to bug, behavior is undefined.

---

## 9. Non-Functional Requirements

* Smooth performance for 16–24 players on typical school laptops/Chromebooks.
* Supports latest Chrome/Edge/Firefox.
* No login/accounts or persistent storage needed beyond single session memory.
* One classroom (one room) per deployed server instance is sufficient.