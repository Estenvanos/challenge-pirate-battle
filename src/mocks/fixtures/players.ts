import { LOCAL_PLAYER_ID } from "../../config/player";

export { LOCAL_PLAYER_ID };

export interface FixturePlayer {
  playerId: string;
  playerName: string;
}

export const fixturePlayers: readonly FixturePlayer[] = [
  { playerId: "rival-01", playerName: "Blackbeard" },
  { playerId: "rival-02", playerName: "Anne Bonny" },
  { playerId: "rival-03", playerName: "Calico Jack" },
  { playerId: "rival-04", playerName: "Mary Read" },
  { playerId: "rival-05", playerName: "Captain Kidd" },
  { playerId: "rival-06", playerName: "Grace O'Malley" },
  { playerId: "rival-07", playerName: "Black Bart" },
  { playerId: "rival-08", playerName: "Ching Shih" },
];
