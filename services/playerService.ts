import { PrismaClient } from "@prisma/client";

export interface Player {
  name: string;
  dob: string;
}

export const updateJsonField = async (
  prisma: PrismaClient,
  playerId: number,
  fieldName: string,
  value: object
) =>
  await prisma.player.update({
    where: { id: playerId },
    data: { [fieldName]: JSON.stringify(value) },
  });

export const updatePlayer = async (
  prisma: PrismaClient,
  playerId: number,
  { name, dob }: Player
) =>
  await prisma.player.update({
    where: { id: playerId },
    data: { name, date_of_birth: new Date(dob) },
  });
