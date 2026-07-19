import { verifyAuthToken, getAUthCookie } from "./auth";
import { prisma } from "./prisma";

type authPayload = {
  userId: string;
};

export async function getCurrentUser() {
  try {
    //
    const token = await getAUthCookie();
    if (!token) return null;

    const payload = (await verifyAuthToken(token)) as authPayload;

    if (!payload?.userId) return null;
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    return user;
  } catch (error) {
    console.log("error:", error);
  }
}
