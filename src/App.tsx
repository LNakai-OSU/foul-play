import { Suspense, lazy } from 'react';
import { CaseWorkspace } from './editor/CaseWorkspace';
import { DesignSystem } from './pages/DesignSystem';
import { Library } from './pages/Library';
import { hrefs, useRoute } from './router';
import { Button, EmptyState, Spinner } from './ui';
import { FeedbackProvider } from './ui/feedback';
import { Search } from 'lucide-react';

// The game (and its pixel font) only loads when someone plays.
const GamePage = lazy(() => import('./game/GamePage'));
const GameGallery = lazy(() => import('./game/GameGallery'));

export function App() {
  const route = useRoute();
  return (
    <FeedbackProvider>
      {route.name === 'library' && <Library />}
      {route.name === 'design' && <DesignSystem />}
      {(route.name === 'build' || route.name === 'gm' || route.name === 'export') && <CaseWorkspace key={route.caseId} route={route} />}
      {route.name === 'play' && (
        <Suspense fallback={<div className="library__inner"><Spinner /></div>}>
          <GamePage key={route.caseId} caseId={route.caseId} />
        </Suspense>
      )}
      {route.name === 'gallery' && (
        <Suspense fallback={<div className="library__inner"><Spinner /></div>}>
          <GameGallery />
        </Suspense>
      )}
      {route.name === 'notfound' && (
        <div className="library__inner">
          <EmptyState icon={<Search />} title="Nothing here" action={<Button variant="filled" href={hrefs.library()}>Back to the case library</Button>}>
            That page does not exist.
          </EmptyState>
        </div>
      )}
    </FeedbackProvider>
  );
}
