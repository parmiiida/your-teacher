const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const userId1 = "user_seed_1";
  const userId2 = "user_seed_2";

  const c1 = await prisma.companion.upsert({
    where: { id: "companion_math_1" },
    update: {},
    create: {
      id: "companion_math_1",
      author: userId1,
      name: "Math Buddy",
      subject: "maths",
      topic: "Algebra & Equations",
      voice: "alloy",
      style: "friendly",
      duration: 15,
    },
  });

  const c2 = await prisma.companion.upsert({
    where: { id: "companion_science_1" },
    update: {},
    create: {
      id: "companion_science_1",
      author: userId1,
      name: "Science Guide",
      subject: "science",
      topic: "Physics Basics",
      voice: "echo",
      style: "professional",
      duration: 20,
    },
  });

  const c3 = await prisma.companion.upsert({
    where: { id: "companion_coding_1" },
    update: {},
    create: {
      id: "companion_coding_1",
      author: userId2,
      name: "Code Mentor",
      subject: "coding",
      topic: "JavaScript & React",
      voice: "fable",
      style: "casual",
      duration: 25,
    },
  });

  console.log("Companions:", c1.name, c2.name, c3.name);

  await prisma.sessionHistory.upsert({
    where: { id: "session_1" },
    update: {},
    create: { id: "session_1", companionId: c1.id, userId: userId1 },
  });
  await prisma.sessionHistory.upsert({
    where: { id: "session_2" },
    update: {},
    create: { id: "session_2", companionId: c2.id, userId: userId1 },
  });
  await prisma.sessionHistory.upsert({
    where: { id: "session_3" },
    update: {},
    create: { id: "session_3", companionId: c3.id, userId: userId2 },
  });
  console.log("SessionHistory: 3 rows");

  await prisma.bookmark.upsert({
    where: { id: "bookmark_1" },
    update: {},
    create: { id: "bookmark_1", companionId: c2.id, userId: userId1 },
  });
  await prisma.bookmark.upsert({
    where: { id: "bookmark_2" },
    update: {},
    create: { id: "bookmark_2", companionId: c3.id, userId: userId1 },
  });
  await prisma.bookmark.upsert({
    where: { id: "bookmark_3" },
    update: {},
    create: { id: "bookmark_3", companionId: c1.id, userId: userId2 },
  });
  console.log("Bookmarks: 3 rows");
  console.log("Seed tamamlandı.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
