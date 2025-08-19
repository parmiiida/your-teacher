import CompanionForm from "@/components/CompanionForm";
import React from "react";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

const NewCompanion = async () => {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  return (
    <main className="min-lg:w-1/3 items-center justify-center min-md:w-1/3">
      <article className="w-full gap-4 flex flex-col">
        <h1> Companion builder</h1>

        <CompanionForm />
      </article>
    </main>
  );
};

export default NewCompanion;
