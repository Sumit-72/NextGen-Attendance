import type { User } from "@prisma/client";
import { getPrisma } from "../prisma";
import { signSession } from "../security";
import type { Role, SessionUser } from "../types/domain";
import { verifyFirebaseIdToken } from "../lib/firebase-admin";

export type SessionExchangeInput = {
  idToken: string;
  roleHint?: Role;
};

export type SessionExchangeResult = {
  user: SessionUser;
  sessionToken: string;
  expiresIn: string;
};

function resolveRole(claimRole: Role | undefined, roleHint: Role | undefined): Role {
  return claimRole ?? roleHint ?? "STUDENT";
}

function toSessionUser(user: User): SessionUser {
  return {
    id: user.id,
    firebaseUid: user.firebaseUid,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    status: user.status,
    departmentId: user.departmentId,
  };
}

export class AuthService {
  private readonly db = getPrisma();

  async exchangeSession(input: SessionExchangeInput): Promise<SessionExchangeResult> {
    const firebaseIdentity = await verifyFirebaseIdToken(input.idToken);
    const role = resolveRole(firebaseIdentity.role, input.roleHint);
    const fullName = firebaseIdentity.name?.trim() || firebaseIdentity.email?.split("@")[0] || "User";
    const email = firebaseIdentity.email?.trim().toLowerCase();

    if (!email) {
      throw new Error("Firebase identity token is missing an email claim");
    }

    const user = await this.db.user.upsert({
      where: { firebaseUid: firebaseIdentity.uid },
      create: {
        firebaseUid: firebaseIdentity.uid,
        email,
        fullName,
        displayName: firebaseIdentity.name ?? fullName,
        photoUrl: firebaseIdentity.picture ?? null,
        role,
        status: "ACTIVE",
        profileComplete: false,
        lastLoginAt: new Date(),
      },
      update: {
        email,
        fullName,
        displayName: firebaseIdentity.name ?? fullName,
        photoUrl: firebaseIdentity.picture ?? null,
        role,
        status: "ACTIVE",
        lastLoginAt: new Date(),
      },
    });

    const sessionUser = toSessionUser(user);

    return {
      user: sessionUser,
      sessionToken: await signSession(sessionUser),
      expiresIn: "7d",
    };
  }
}