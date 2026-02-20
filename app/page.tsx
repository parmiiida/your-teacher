import CompanionCard from "@/components/CompanionCard";
import CompanionsList from "@/components/CompanionsList";
import CTA from "@/components/CTA";
import {recentSessions} from "@/constants";
import {getAllCompanions, getRecentSessions} from "@/lib/actions/companion.actions";
import {getSubjectColor} from "@/lib/utils";

export const dynamic = 'force-dynamic';

const Page = async () => {
    let companions: Awaited<ReturnType<typeof getAllCompanions>> = [];
    let recentSessionsCompanions: Awaited<ReturnType<typeof getRecentSessions>> = [];
    let dataError: string | null = null;

    try {
        companions = await getAllCompanions({ limit: 3 });
    } catch (e) {
        dataError = e instanceof Error ? e.message : "Veriler yüklenemedi.";
    }
    try {
        recentSessionsCompanions = await getRecentSessions(10);
    } catch {
        if (!dataError) dataError = "Son oturumlar yüklenemedi.";
    }

  return (
    <main>
      <h1>Popular Companions</h1>
      {dataError && (
        <p className="text-amber-600 dark:text-amber-400 text-sm mb-4" role="alert">
          <strong>Veri yüklenemedi.</strong> {dataError} <code>DATABASE_URL</code> .env veya .env.local içinde tanımlı olmalı (örn. <code>DATABASE_URL="file:./dev.db"</code>). İlk kez kullanıyorsan <code>npm run db:migrate</code> çalıştır.
        </p>
      )}

        <section className="home-section">
            {(companions ?? []).map((companion: Companion) => (
                <CompanionCard
                    key={companion.id}
                    {...companion}
                    color={getSubjectColor(companion.subject)}
                />
            ))}

        </section>

        <section className="home-section">
            <CompanionsList
                title="Recently completed sessions"
                companions={recentSessionsCompanions}
                className="w-2/3 max-lg:w-full"
            />
            <CTA />
        </section>
    </main>
  )
}

export default Page