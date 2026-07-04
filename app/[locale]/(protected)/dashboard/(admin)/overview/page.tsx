import { DatabaseConfigPreview } from "./DatabaseConfigPreview";
import { GenerationBreakdownCharts } from "./GenerationBreakdownCharts";
import { GenerationStatsChart } from "./GenerationStatsChart";
import { GrowthChart } from "./GrowthChart";
import { OverviewStats } from "./OverviewStats";

const OverviewPage = () => {
  return (
    <div className="container mx-auto p-4 md:p-6 space-y-4">
      <OverviewStats />

      <GrowthChart />

      <GenerationStatsChart />

      <GenerationBreakdownCharts />

      <DatabaseConfigPreview />
    </div>
  );
};

export default OverviewPage;
