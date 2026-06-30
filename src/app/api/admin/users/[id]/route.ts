import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  action: z.enum(["BLOCK", "UNBLOCK"]),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;

  // Prevent admin from blocking themselves
  if (id === session.user.id) {
    return NextResponse.json({ error: "Cannot block yourself." }, { status: 400 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input." }, { status: 400 });

  await prisma.user.update({
    where: { id },
    data: { isBlacklisted: parsed.data.action === "BLOCK" },
  });

  return NextResponse.json({ success: true });
}
