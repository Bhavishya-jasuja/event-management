import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { v2 as cloudinary } from "cloudinary";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "OWNER") {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (!process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME === "your-cloud-name") {
      return NextResponse.json({ error: "Cloudinary is not configured." }, { status: 500 });
    }

    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) return NextResponse.json({ error: "No file provided." }, { status: 400 });
    if (!file.type.startsWith("image/")) return NextResponse.json({ error: "Only image files are allowed." }, { status: 400 });
    if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: "Image must be under 10 MB." }, { status: 400 });

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");
    const dataUri = `data:${file.type};base64,${base64}`;

    const result = await cloudinary.uploader.upload(dataUri, {
      folder: "nexarc/venues",
    });

    return NextResponse.json({ url: result.secure_url });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[upload error]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
