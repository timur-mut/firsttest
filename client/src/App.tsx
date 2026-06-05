import { useAppStore } from './app/appStore';
import { PlannerApp } from './planner/PlannerApp';
import { PlansView } from './app/PlansView';

export default function App() {
  const view = useAppStore((s) => s.view);
  return view === 'plans' ? <PlansView /> : <PlannerApp />;
}
