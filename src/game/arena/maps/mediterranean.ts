import type { TileMapDefinition } from "../tileMap";

/** Two aligned ASCII layers: ground/spawns and decorative features. */
export const mediterranean: TileMapDefinition = {
  name: "Mediterranean",
  author: "Estevan",
  grid: [
    "gggg...E.....ggg", // 0
    "gggg.........ggg", // 1
    "......ss........", // 2
    "......ss........", // 3
    "E..ss...P..ggg.E", // 4
    "...ss......ggg..", // 5
    "...........ggg..", // 6
    "ggggggggg......E", // 7
    "ggggggggg..E....", // 8
  ],
  features: [
    "lO#O............", // 0
    "...............Q", // 1
    "................", // 2
    "................", // 3
    "................", // 4
    "............l...", // 5
    "................", // 6
    "................", // 7
    "..O%%O.l........", // 8
  ],
};
