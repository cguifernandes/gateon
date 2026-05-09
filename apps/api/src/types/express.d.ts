import type { Sessions, Users } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      authSession?: Sessions & { user: Users };
    }
  }
}

export {};
