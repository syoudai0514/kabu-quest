import { useGame } from './state/game';
import Home from './ui/screens/Home';
import Travel from './ui/screens/Travel';
import Play from './ui/screens/Play';
import ReturnScreen from './ui/screens/Return';
import Zukan from './ui/screens/Zukan';
import Parent from './ui/screens/Parent';
import SettingsScreen from './ui/screens/SettingsScreen';

export default function App() {
  const screen = useGame((s) => s.screen);
  return (
    <div className="mx-auto min-h-dvh max-w-md bg-slate-900 text-slate-50">
      {screen === 'home' && <Home />}
      {screen === 'travel' && <Travel />}
      {screen === 'play' && <Play />}
      {screen === 'return' && <ReturnScreen />}
      {screen === 'zukan' && <Zukan />}
      {screen === 'parent' && <Parent />}
      {screen === 'settings' && <SettingsScreen />}
    </div>
  );
}
