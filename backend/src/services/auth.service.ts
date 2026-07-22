import type { User } from "@prisma/client";
import { ConflictError, ValidationError } from "../errors";
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
      throw new ValidationError({}, "Firebase identity token is missing an email claim");
    }

    const [existingByUid, existingByEmail] = await this.db.$transaction([
      this.db.user.findUnique({ where: { firebaseUid: firebaseIdentity.uid } }),
      this.db.user.findUnique({ where: { email } }),
    ]);

    if (existingByUid && existingByEmail && existingByUid.id !== existingByEmail.id) {
      throw new ConflictError("This email is already linked to another account");
    }

    const existingUser = existingByUid ?? existingByEmail;
    const userData = {
      firebaseUid: firebaseIdentity.uid,
      email,
      fullName,
      displayName: firebaseIdentity.name ?? fullName,
      photoUrl: firebaseIdentity.picture ?? null,
      role: existingUser ? (firebaseIdentity.role ?? existingUser.role) : role,
      status: "ACTIVE" as const,
      lastLoginAt: new Date(),
    };

    const user = existingUser
      ? await this.db.user.update({
          where: { id: existingUser.id },
          data: userData,
        })
      : await this.db.user.create({
          data: {
            ...userData,
            profileComplete: false,
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
