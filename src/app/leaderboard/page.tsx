import LeaderboardTable from '@/components/LeaderboardTable';

export default function LeaderboardPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-gray-50 to-white">
      <main className="flex-grow py-16 px-4">
        <LeaderboardTable />
      </main>
    </div>
  );
} 