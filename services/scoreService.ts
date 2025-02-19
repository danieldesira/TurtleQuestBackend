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
) =>
  await prisma.score.create({
    data: {
      player_id: playerId,
      player_won: payload.hasWon ? "1" : "0",
      points: payload.points,
      level: payload.level,
      created_at: new Date(),
    },
  });

export const getHighScores = async (prisma: PrismaClient) =>
  await prisma.score.findMany({
    take: 10,
    orderBy: {
      points: "desc",
    },
    select: {
      points: true,
      level: true,
      player_won: true,
      created_at: true,
      player: {
        select: {
          name: true,
        },
      },
    },
  });
