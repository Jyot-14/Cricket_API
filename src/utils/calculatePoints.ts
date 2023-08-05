enum PlayerType {
  Batter = 'Batter',
  WicketKeeper = 'Wicket-Keeper',
  AllRounder = 'All-Rounder',
  Bowler = 'Bowler',
}

interface PlayerStatistics {
  runs: number;
  boundaries: number;
  sixes: number;
  dismissals: number; // Dismissal for a duck
  wickets: number;
  maidens: number;
  catches: number;
  stumpings: number;
  runOutDirect: number;
  runOutIndirect: number;
  isCaptain: boolean;
  isViceCaptain: boolean;
  isAnnouncedInLineups: boolean;
  isPlayingSubstitute: boolean;
  economyRate: number;
  strikeRate: number;
  playerType: PlayerType;
}

export function calculatePoints(stats: PlayerStatistics): number {
  let points = 0;

  // Batting points
  points += stats.runs;
  points += stats.boundaries;
  points += stats.sixes * 2;
  if (stats.runs >= 30) points += 4;
  if (stats.runs >= 50) points += 8;
  if (stats.runs >= 100) points += 16;
  if (stats.dismissals === 0) points += 2;
  if (stats.dismissals === -2) points -= 2;

  // Bowling points
  if (stats.playerType === PlayerType.Bowler) {
    points += stats.wickets * 25;
    if (stats.wickets >= 5) points += 16;
    else if (stats.wickets >= 4) points += 8;
    else if (stats.wickets >= 3) points += 4;
    points += stats.maidens * 12;
    if (stats.economyRate < 5) points += 6;
    else if (stats.economyRate < 6) points += 4;
    else if (stats.economyRate < 7) points += 2;
  }

  // Fielding points
  points += stats.catches * 8;
  if (stats.catches >= 3) points += 4;
  points += stats.stumpings * 12;
  points += stats.runOutDirect * 12;
  points += stats.runOutIndirect * 6;

  // Additional points
  if (stats.isCaptain) points *= 2;
  else if (stats.isViceCaptain) points *= 1.5;
  if (stats.isAnnouncedInLineups) points += 4;
  if (stats.isPlayingSubstitute) points += 4;

  // Strike rate points for non-bowlers
  if (stats.playerType !== PlayerType.Bowler) {
    if (stats.strikeRate > 170) points += 6;
    else if (stats.strikeRate > 150) points += 4;
    else if (stats.strikeRate > 130) points += 2;
    else if (stats.strikeRate > 60) points -= 2;
    else if (stats.strikeRate > 50) points -= 4;
    else points -= 6;
  }

  return points;
}

// const player1Stats: PlayerStatistics = {
//   runs: 60,
//   boundaries: 4,
//   sixes: 2,
//   dismissals: 0,
//   wickets: 0,
//   maidens: 0,
//   catches: 1,
//   stumpings: 0,
//   runOutDirect: 1,
//   runOutIndirect: 0,
//   isCaptain: true,
//   isViceCaptain: false,
//   isAnnouncedInLineups: true,
//   isPlayingSubstitute: false,
//   economyRate: 0,
//   strikeRate: 120,
//   playerType: PlayerType.Batter,
// };

// const player1Points = calculatePoints(player1Stats);
// console.log('Player 1 points:', player1Points);
