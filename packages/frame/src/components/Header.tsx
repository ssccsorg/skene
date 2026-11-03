import { Settings } from 'lucide-react';
import { Hint } from '@ssccsorg/skene-ui';
import { RowControl } from '@ssccsorg/skene-ui';
import { useMenu } from '../hooks/useMenu';
import { ROW, ROW_CONTROL_EDGE, TITLE } from '@ssccsorg/skene-ui';
import { useBrand } from '../lib/brand';
import { cn } from '@ssccsorg/skene-ui';
import { SettingsMenu } from './SettingsMenu';
import { StatusBar } from './StatusBar';
import { VersionCard } from './VersionCard';

// The bar is one line at the standard row and the standard inset, so the mark on it stands on the same left edge as
// a panel's own name and as an item in a list. It carries the mark and the version beside it, and nothing else on that
// side: the name is the application's, and everything the frame has to report about itself is a reading and belongs at
// the other end with the settings.
//
// The mark is drawn here and once, at the size a panel's name is drawn at and standing out by being the brightest ink
// in the bar, and it is the control that opens what the frame is: a version read at a glance is a version that gets
// checked. The version beside it is a placeholder until a build stamps one.
//
// The views are not here. A way into the graph or into the account is a way of looking at the space the pilot is
// already in, and the space is always the thing on screen, so those controls stand with the ones that change what the
// board holds rather than in the frame's own title bar.

export function Header() {
  const brand = useBrand();
  const [about, setAbout, aboutBox] = useMenu();
  const [settings, setSettings, settingsBox] = useMenu();

  return (
    <header data-region="header" className={cn(ROW, 'border-b bg-sidebar')}>
      <div ref={aboutBox} className="relative z-[100]">
        <Hint label="about">
          <button
            type="button"
            data-region="brand"
            data-on={about}
            data-row-control="start"
            onClick={() => setAbout(!about)}
            className={cn(
              ROW_CONTROL_EDGE.xs.start,
              'flex items-center gap-1.5 rounded-sm px-2 py-0.5 transition-colors hover:bg-accent/40',
              about && 'bg-accent',
            )}
          >
            <span className={cn(TITLE, 'tracking-wide')}>{brand.title}</span>
            <span className="text-[11.5px] tabular-nums text-muted-foreground">{brand.version}</span>
          </button>
        </Hint>
        {about ? <VersionCard /> : null}
      </div>
      <nav className="ml-auto flex items-center gap-1">
        <StatusBar />
        <div ref={settingsBox} className="relative z-[100]">
          <Hint label="settings">
            <RowControl data-on={settings} onClick={() => setSettings(!settings)}>
              <Settings />
            </RowControl>
          </Hint>
          {settings ? <SettingsMenu /> : null}
        </div>
      </nav>
    </header>
  );
}
