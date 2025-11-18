const { MAP_WIDTH, MAP_HEIGHT, ZONE_RADIUS, ZONE_PATH_MARGIN, ZONE_LOOP_PERIOD_SECONDS, PLAYER_RADIUS } = require('./constants');
const { distance } = require('./physics');

/**
 * Calculate position on rectangular path
 * @param {number} d - Distance along perimeter (0 to PERIM)
 * @param {object} pathRect - { xMin, xMax, yMin, yMax }
 * @returns {object} - { x, y }
 */
function positionOnRectangle(d, pathRect) {
  const { xMin, xMax, yMin, yMax } = pathRect;

  const width = xMax - xMin;
  const height = yMax - yMin;
  const perim = 2 * (width + height);

  // Normalize d to be within perimeter
  d = d % perim;
  if (d < 0) d += perim;

  // Edge 1: Top (left to right)
  if (d < width) {
    return { x: xMin + d, y: yMin };
  }
  d -= width;

  // Edge 2: Right (top to bottom)
  if (d < height) {
    return { x: xMax, y: yMin + d };
  }
  d -= height;

  // Edge 3: Bottom (right to left)
  if (d < width) {
    return { x: xMax - d, y: yMax };
  }
  d -= width;

  // Edge 4: Left (bottom to top)
  return { x: xMin, y: yMax - d };
}

/**
 * Update zone positions based on game time
 */
function updateZonePositions(zones, gameTime) {
  const pathRect = {
    xMin: ZONE_PATH_MARGIN,
    xMax: MAP_WIDTH - ZONE_PATH_MARGIN,
    yMin: ZONE_PATH_MARGIN,
    yMax: MAP_HEIGHT - ZONE_PATH_MARGIN
  };

  const width = pathRect.xMax - pathRect.xMin;
  const height = pathRect.yMax - pathRect.yMin;
  const perim = 2 * (width + height);

  // Zone 1 position
  const s1 = (gameTime / ZONE_LOOP_PERIOD_SECONDS) % 1;
  const d1 = s1 * perim;
  const pos1 = positionOnRectangle(d1, pathRect);

  // Zone 2 position (opposite side)
  const d2 = (d1 + perim / 2) % perim;
  const pos2 = positionOnRectangle(d2, pathRect);

  zones[0].x = pos1.x;
  zones[0].y = pos1.y;
  zones[1].x = pos2.x;
  zones[1].y = pos2.y;
}

/**
 * Update zone ownership based on earliest continuous occupant
 */
function updateZoneOwnership(zones, players, currentTime) {
  for (const zone of zones) {
    // Find all players inside this zone (touching or inside)
    const playersInZone = players.filter(p => {
      if (!p.connected || !p.teamId) return false;
      // Player is in zone if any part of the circle touches the zone
      return distance(p.x, p.y, zone.x, zone.y) <= (ZONE_RADIUS + PLAYER_RADIUS);
    });

    if (playersInZone.length === 0) {
      zone.ownerTeamId = null;
      zone.occupants = [];
      continue;
    }

    // Track continuous occupancy
    if (!zone.occupants) zone.occupants = [];

    // Update occupants list
    const newOccupants = [];
    for (const player of playersInZone) {
      const existing = zone.occupants.find(o => o.playerId === player.playerId);
      if (existing) {
        // Player was already in zone, keep entry time
        newOccupants.push(existing);
      } else {
        // New player entering zone
        newOccupants.push({
          playerId: player.playerId,
          teamId: player.teamId,
          entryTime: currentTime
        });
      }
    }

    zone.occupants = newOccupants;

    // Find earliest continuous occupant
    if (zone.occupants.length > 0) {
      const earliest = zone.occupants.reduce((min, occ) =>
        occ.entryTime < min.entryTime ? occ : min
      );
      zone.ownerTeamId = earliest.teamId;
    } else {
      zone.ownerTeamId = null;
    }
  }
}

/**
 * Initialize zones
 */
function createZones(teamColorMapping) {
  return [
    {
      zoneId: 'zone1',
      x: ZONE_PATH_MARGIN,
      y: ZONE_PATH_MARGIN,
      ownerTeamId: null,
      occupants: []
    },
    {
      zoneId: 'zone2',
      x: MAP_WIDTH - ZONE_PATH_MARGIN,
      y: MAP_HEIGHT - ZONE_PATH_MARGIN,
      ownerTeamId: null,
      occupants: []
    }
  ];
}

module.exports = {
  createZones,
  updateZonePositions,
  updateZoneOwnership
};
