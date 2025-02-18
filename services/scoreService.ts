import { PrismaClient } from "@prisma/client";

export interface SaveScorePayload {
  points: number;
  level: number;
  hasWon: boolean;
}

export const saveScore = async (
  prisma: PrismaClient,
  playerId: number,
  payload: SaveScorePayload
) => {
  await prisma.score.create({
    data: {
      player_id: playerId,
      player_won: payload.hasWon ? "1" : "0",
      points: payload.points,
      level: payload.level,
      created_at: new Date(),
    },
  });
};
