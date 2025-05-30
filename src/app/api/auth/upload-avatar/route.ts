import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { del, put } from "@vercel/blob";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession();

    if (!session) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    // Lấy thông tin người dùng để kiểm tra avatarUrl hiện tại
    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: { avatarUrl: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Không tìm thấy người dùng" },
        { status: 404 },
      );
    }

    // Xóa avatar cũ nếu có
    if (user.avatarUrl) {
      await del(user.avatarUrl);
    }

    // Xử lý form data để lấy file avatar
    const formData = await req.formData();
    const avatarFile = formData.get("avatar") as File;

    if (!avatarFile) {
      return NextResponse.json(
        { error: "Không tìm thấy file avatar" },
        { status: 400 },
      );
    }

    // Kiểm tra loại file
    if (!avatarFile.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "File phải là hình ảnh" },
        { status: 400 },
      );
    }

    // Kiểm tra kích thước file (tối đa 2MB)
    if (avatarFile.size > 2 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Kích thước file không được vượt quá 2MB" },
        { status: 400 },
      );
    }

    // Upload avatar lên Vercel Blob Storage
    const blob = await put(`avatars/${session.id}-${Date.now()}`, avatarFile, {
      access: "public",
    });

    return NextResponse.json({
      avatarUrl: blob.url,
      message: "Upload avatar thành công",
    });
  } catch (error) {
    console.error("Lỗi khi upload avatar:", error);
    return NextResponse.json(
      { error: "Có lỗi xảy ra khi upload avatar" },
      { status: 500 },
    );
  }
}
