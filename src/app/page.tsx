import LeaderboardTable from '@/components/leaderboard/LeaderboardTable';
import DonutChart from '@/components/DonutChart';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-gray-50 to-white">
      <main className="flex-grow py-16 px-4">
        <LeaderboardTable />
        <DonutChart />
      </main>
    </div>
  );
}