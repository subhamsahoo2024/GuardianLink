import { NextResponse } from "next/server";
import { firestoreSchema } from "@/lib/firebase-schema";

export async function GET() {
  return NextResponse.json({
    schema: firestoreSchema,
  });
}
