import { PrismaClient } from "@prisma/client";

interface Settings {
  controlPosition: "left" | "right";
}

export const updateSettings = async (
  prisma: PrismaClient,
  playerId: number,
  settings: Settings
) =>
  await prisma.player.update({
    where: { id: playerId },
    data: { settings: JSON.stringify(settings) },
  });
