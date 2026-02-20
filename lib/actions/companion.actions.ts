"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";

export const createCompanion = async (formData: CreateCompanion) => {
  const { userId: author } = await auth();
  if (!author) throw new Error("Unauthorized");

  const companion = await db.companion.create({
    data: {
      author,
      name: formData.name,
      subject: formData.subject,
      topic: formData.topic,
      voice: formData.voice,
      style: formData.style,
      duration: formData.duration,
    },
  });
  return toCompanion(companion);
};

export const getAllCompanions = async ({
  limit = 10,
  page = 1,
  subject,
  topic,
}: GetAllCompanions) => {
  const subjectStr = Array.isArray(subject) ? subject[0] : subject;
  const topicStr = Array.isArray(topic) ? topic[0] : topic;

  let where: { subject?: { contains: string }; OR?: unknown[]; AND?: unknown[] } | undefined;
  if (subjectStr && topicStr) {
    where = { AND: [{ subject: { contains: subjectStr } }, { OR: [{ topic: { contains: topicStr } }, { name: { contains: topicStr } }] }] };
  } else if (subjectStr) {
    where = { subject: { contains: subjectStr } };
  } else if (topicStr) {
    where = { OR: [{ topic: { contains: topicStr } }, { name: { contains: topicStr } }] };
  }

  const companions = await db.companion.findMany({
    where,
    skip: (page - 1) * limit,
    take: limit,
  });
  return companions.map(toCompanion);
};

export const getCompanion = async (id: string) => {
  const companion = await db.companion.findUnique({ where: { id } });
  return companion ? toCompanion(companion) : null;
};

export const addToSessionHistory = async (companionId: string) => {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  await db.sessionHistory.create({
    data: { companionId, userId },
  });
};

export const getRecentSessions = async (limit = 10): Promise<Companion[]> => {
  const sessions = await db.sessionHistory.findMany({
    take: limit,
    orderBy: { createdAt: "desc" },
    include: { companion: true },
  });
  return sessions.map((s: { companion: Parameters<typeof toCompanion>[0] }) => toCompanion(s.companion));
};

export const getUserSessions = async (userId: string, limit = 10) => {
  const sessions = await db.sessionHistory.findMany({
    where: { userId },
    take: limit,
    orderBy: { createdAt: "desc" },
    include: { companion: true },
  });
  return sessions.map((s: { companion: Parameters<typeof toCompanion>[0] }) => toCompanion(s.companion));
};

export const getUserCompanions = async (userId: string) => {
  const companions = await db.companion.findMany({
    where: { author: userId },
  });
  return companions.map(toCompanion);
};

export const newCompanionPermissions = async () => {
  const { userId, has } = await auth();
  if (!userId) return false;

  let limit = 0;
  if (has({ plan: "pro" })) return true;
  if (has({ feature: "3_companion_limit" })) limit = 3;
  else if (has({ feature: "10_companion_limit" })) limit = 10;

  const count = await db.companion.count({ where: { author: userId } });
  return count < limit;
};

export const addBookmark = async (companionId: string, path: string) => {
  const { userId } = await auth();
  if (!userId) return;

  try {
    await db.bookmark.create({
      data: { companionId, userId },
    });
    revalidatePath(path);
  } catch {
    // Zaten ekli veya tablo yoksa sessizce geç
  }
};

export const removeBookmark = async (companionId: string, path: string) => {
  const { userId } = await auth();
  if (!userId) return;

  try {
    await db.bookmark.deleteMany({
      where: { companionId, userId },
    });
    revalidatePath(path);
  } catch {
    // Tablo yoksa vb. sessizce geç
  }
};

export const getBookmarkedCompanions = async (userId: string): Promise<Companion[]> => {
  try {
    const bookmarks = await db.bookmark.findMany({
      where: { userId },
      include: { companion: true },
    });
    return bookmarks.map((b: { companion: Parameters<typeof toCompanion>[0] }) => toCompanion(b.companion));
  } catch {
    return [];
  }
};

// Prisma modelini uygulama tipine çevirir (bookmarked her sayfada ayrı hesaplanabilir)
function toCompanion(row: { id: string; name: string; subject: string; topic: string; voice: string; style: string; duration: number }) {
  return {
    id: row.id,
    $id: row.id,
    name: row.name,
    subject: row.subject,
    topic: row.topic,
    voice: row.voice,
    style: row.style,
    duration: row.duration,
    bookmarked: false,
  } satisfies Companion;
}
