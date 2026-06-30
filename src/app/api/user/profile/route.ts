import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  name:  z.string().min(2).max(60),
  phone: z.string().regex(/^[6-9]\d{9}$/).optional().or(z.literal("")),
});

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body   = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input." }, { status: 400 });

  const { name, phone } = parsed.data;

  // Check phone uniqueness (exclude self)
  if (phone) {
    const conflict = await prisma.user.findFirst({
      where: { phone, NOT: { id: session.user.id } },
    });
    if (conflict) return NextResponse.json({ error: "Phone number already in use." }, { status: 409 });
  }

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data:  { name, phone: phone || null },
    select: { id: true, name: true, email: true, phone: true, role: true },
  });

  return NextResponse.json({ user });
}
