import { PrismaClient } from "@prisma/client";

interface GoogleUserPayload {
  sub: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  email: string;
}

interface CheckAndRegisterPlayerGoogleResult {
  id: number;
  isNewPlayer: boolean;
}

export const checkAndRegisterPlayerGoogle = async (
  prisma: PrismaClient,
  user: GoogleUserPayload
): Promise<CheckAndRegisterPlayerGoogleResult> => {
  const player = await prisma.player.findFirst({
    where: { external_id: user.sub, platform: "google" },
  });

  if (!player) {
    const { id } = await prisma.player.create({
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
    return { id, isNewPlayer: true };
  } else {
    await prisma.player.update({
      where: { id: player.id },
      data: { last_login_at: new Date() },
    });
    return { id: player.id, isNewPlayer: false };
  }
};

export const fetchGoogleUser = async (
  token: string
): Promise<GoogleUserPayload> => {
  const response = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${token}`
  );
  const payload = await response.json();

  if (!payload) {
    throw Error("Invalid token payload");
  }

  if (
    payload.iss !== "https://accounts.google.com" &&
    payload.iss !== "accounts.google.com"
  ) {
    throw new Error("Invalid issuer");
  }

  if (payload.aud !== process.env.GOOGLE_CLIENT_ID) {
    throw new Error("Invalid audience");
  }

  return payload;
};
