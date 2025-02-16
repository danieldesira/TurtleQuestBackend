import { PrismaClient } from "@prisma/client";

interface GoogleUserPayload {
  sub: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  email: string;
}

export const checkAndRegisterPlayerGoogle = async (
  prisma: PrismaClient,
  user: GoogleUserPayload
) => {
  const player = await prisma.player.findFirst({
    where: { external_id: user.sub, platform: "google" },
  });

  if (!player) {
    await prisma.player.create({
      data: {
        external_id: user.sub,
        platform: "google",
        email: user.email,
        name: user.name,
        profile_pic: user.picture,
        last_login_at: new Date(),
        created_at: new Date(),
      },
    });
  } else {
    await prisma.player.update({
      where: { id: player.id },
      data: { last_login_at: new Date() },
    });
  }
};
