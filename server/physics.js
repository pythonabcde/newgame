const { MAP_WIDTH, MAP_HEIGHT, PLAYER_RADIUS, PLAYER_SPEED, DASH_SPEED_MULTIPLIER } = require('./constants');

/**
 * Normalize a 2D vector
 */
function normalize(x, y) {
  const length = Math.sqrt(x * x + y * y);
  if (length === 0) return { x: 0, y: 0 };
  return { x: x / length, y: y / length };
}

/**
 * Calculate distance between two points
 */
function distance(x1, y1, x2, y2) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

/**
 * Clamp position to map boundaries
 */
function clampToBounds(pos) {
  return {
    x: Math.max(PLAYER_RADIUS, Math.min(MAP_WIDTH - PLAYER_RADIUS, pos.x)),
    y: Math.max(PLAYER_RADIUS, Math.min(MAP_HEIGHT - PLAYER_RADIUS, pos.y))
  };
}

/**
 * Check if two circles overlap
 */
function circlesOverlap(x1, y1, r1, x2, y2, r2) {
  return distance(x1, y1, x2, y2) < (r1 + r2);
}

/**
 * Resolve collisions with other players
 * Returns adjusted position that doesn't overlap with others
 */
function resolveCollisions(tentativePos, currentPlayer, allPlayers) {
  let finalPos = { ...tentativePos };

  for (const other of allPlayers) {
    if (other.playerId === currentPlayer.playerId) continue;
    if (!other.connected) continue;

    const dist = distance(finalPos.x, finalPos.y, other.x, other.y);
    const minDist = PLAYER_RADIUS * 2;

    if (dist < minDist) {
      // Push away from overlapping player
      const overlap = minDist - dist;
      const dir = normalize(finalPos.x - other.x, finalPos.y - other.y);

      finalPos.x += dir.x * overlap;
      finalPos.y += dir.y * overlap;

      // Clamp again after adjustment
      finalPos = clampToBounds(finalPos);
    }
  }

  return finalPos;
}

/**
 * Check if tentative position would collide with any player
 */
function wouldCollide(tentativePos, currentPlayer, allPlayers) {
  for (const other of allPlayers) {
    if (other.playerId === currentPlayer.playerId) continue;
    if (!other.connected) continue;

    if (circlesOverlap(
      tentativePos.x, tentativePos.y, PLAYER_RADIUS,
      other.x, other.y, PLAYER_RADIUS
    )) {
      return true;
    }
  }
  return false;
}

/**
 * Generate non-overlapping spawn positions for players
 */
function generateSpawnPositions(playerCount, zones) {
  const positions = [];
  const SPAWN_MIN_X = 25;
  const SPAWN_MAX_X = 75;
  const SPAWN_MIN_Y = 15;
  const SPAWN_MAX_Y = 45;
  const MIN_SPACING = PLAYER_RADIUS * 3;
  const ZONE_SAFE_DISTANCE = 10;

  let attempts = 0;
  const maxAttempts = playerCount * 100;

  while (positions.length < playerCount && attempts < maxAttempts) {
    attempts++;

    const candidate = {
      x: SPAWN_MIN_X + Math.random() * (SPAWN_MAX_X - SPAWN_MIN_X),
      y: SPAWN_MIN_Y + Math.random() * (SPAWN_MAX_Y - SPAWN_MIN_Y)
    };

    // Check distance from zones
    let tooCloseToZone = false;
    for (const zone of zones) {
      if (distance(candidate.x, candidate.y, zone.x, zone.y) < ZONE_SAFE_DISTANCE) {
        tooCloseToZone = true;
        break;
      }
    }

    if (tooCloseToZone) continue;

    // Check distance from other spawn positions
    let tooClose = false;
    for (const pos of positions) {
      if (distance(candidate.x, candidate.y, pos.x, pos.y) < MIN_SPACING) {
        tooClose = true;
        break;
      }
    }

    if (!tooClose) {
      positions.push(candidate);
    }
  }

  // If we couldn't generate enough positions, fill remaining with grid positions
  if (positions.length < playerCount) {
    console.warn(`Only generated ${positions.length}/${playerCount} spawn positions`);
  }

  return positions;
}

module.exports = {
  normalize,
  distance,
  clampToBounds,
  circlesOverlap,
  resolveCollisions,
  wouldCollide,
  generateSpawnPositions
};
