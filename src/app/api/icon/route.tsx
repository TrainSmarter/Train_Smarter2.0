import { ImageResponse } from "next/og";
import { type NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const size = Number(searchParams.get("size") ?? 192);
  const clamped = Math.min(Math.max(size, 32), 1024);

  return new ImageResponse(
    (
      <div
        style={{
          fontSize: clamped * 0.5,
          background: "#0D9488",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: clamped * 0.16,
          color: "white",
          fontWeight: 700,
          letterSpacing: "-0.02em",
        }}
      >
        TS
      </div>
    ),
    { width: clamped, height: clamped }
  );
}
