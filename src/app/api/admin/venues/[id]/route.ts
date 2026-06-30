import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  action: z.enum(["APPROVE", "REJECT", "SUSPEND", "REACTIVATE"]),
  reason: z.string().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();

  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }

  const { action, reason } = parsed.data;

  const statusMap = {
    APPROVE:    "ACTIVE",
    REJECT:     "REJECTED",
    SUSPEND:    "SUSPENDED",
    REACTIVATE: "ACTIVE",
  } as const;

  await prisma.venue.update({
    where: { id },
    data: {
      status: statusMap[action],
      rejectionReason: action === "REJECT" ? reason : null,
      reviewedById: session.user.id,
      reviewedAt: new Date(),
    },
  });

  return NextResponse.json({ success: true });
}
