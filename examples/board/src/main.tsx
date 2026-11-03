import { createRoot } from 'react-dom/client';
// The kinds this deployment draws. Footage is a package of its own, so importing it is what installs it.
import '@ssccsorg/skene-view-media';
import '@ssccsorg/skene-view-map';
import '@ssccsorg/skene-view-shell';
import { Frame } from '@ssccsorg/skene-frame';
import { brand } from './brand';
import './styles.css';

// No StrictMode: its double mount opens the record stream twice, and the first socket has already delivered
// records by the time it is closed, which the second one's arrival list has no way to subtract.
const root = document.getElementById('root');
if (!root) throw new Error('the page has no root to render into');

createRoot(root).render(<Frame brand={brand} />);
