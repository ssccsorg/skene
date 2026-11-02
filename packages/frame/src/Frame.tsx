import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { TooltipProvider } from './components/ui/tooltip';
import { BrandProvider, type Brand } from './lib/brand';
import { setHost, type Host } from './lib/host';
import 'maplibre-gl/dist/maplibre-gl.css';

/**
 * The frame a deployment mounts: the router, the tooltips, the brand, and the shell.
 *
 * A product supplies a brand and a board. It does not supply a frame, which is the whole of why this is a package:
 * every surface that reads a record is the same surface, and what differs between deployments is what is written in
 * the bundle rather than what is written in the application.
 */
export function Frame({ brand, host }: { brand: Brand; host?: Host }) {
  // The host is installed before anything under it renders, because the modules that reach the shell are not
  // components and read it as a module value rather than as a context.
  setHost(host);
  return (
    <BrowserRouter>
      <TooltipProvider>
        <BrandProvider brand={brand}>
          <App />
        </BrandProvider>
      </TooltipProvider>
    </BrowserRouter>
  );
}
