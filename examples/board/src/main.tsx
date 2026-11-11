import { createRoot } from 'react-dom/client';
// The kinds this deployment draws. Footage is a package of its own, so importing it is what installs it.
import '@ssccsorg/skene-view-media';
import '@ssccsorg/skene-view-map';
import '@ssccsorg/skene-view-shell';
import '@ssccsorg/skene-view-graph';
import { Frame, offTheShelf } from '@ssccsorg/skene-frame';
import { brand } from './brand';
import './styles.css';

// No StrictMode: its double mount opens the record stream twice, and the first socket has already delivered
// records by the time it is closed, which the second one's arrival list has no way to subtract.
const root = document.getElementById('root');
if (!root) throw new Error('the page has no root to render into');

// A window with no host would be the browser's answers, which still expect the demonstration's room on loopback. This
// deployment ships its board and its runs, so it says so and asks nothing of the machine it is opened on.
createRoot(root).render(<Frame brand={brand} host={offTheShelf} />);
