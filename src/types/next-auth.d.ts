import type { Role } from "@/generated/prisma/enums";
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role | null;
    } & DefaultSession["user"];
  }
}
