// Game Constants
module.exports = {
  // Room settings
  MAX_PLAYERS: 32,
  MIN_PLAYERS_TO_START: 4,
  GAME_DURATION_SECONDS: 300, // 5 minutes
  ROOM_CODE_LENGTH: 6,

  // Map settings
  MAP_WIDTH: 100,
  MAP_HEIGHT: 60,

  // Player settings
  PLAYER_RADIUS: 1.5,
  PLAYER_SPEED: 15, // units per second

  // Dash settings
  DASH_DURATION_SECONDS: 0.20,
  DASH_SPEED_MULTIPLIER: 4.0,
  DASH_COOLDOWN_SECONDS: 2,

  // Zone settings
  ZONE_RADIUS: 8,
  ZONE_LOOP_PERIOD_SECONDS: 60, // Time to complete one loop
  ZONE_PATH_MARGIN: 8, // Distance from map edges

  // Server settings
  SERVER_TICK_RATE: 30, // updates per second

  // Colors
  COLORS: {
    BLUE: '#6EC1FF',
    RED: '#FF8A80',
    GRAY: '#E0E0E0'
  },

  // Team IDs
  TEAMS: {
    TEAM1: 'TEAM1',
    TEAM2: 'TEAM2'
  }
};
