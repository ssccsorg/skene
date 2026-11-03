// The one class-merge the kit exposes. The primitives import it directly from the `cn`
// package; this module is the public name, so a deployment that composes classes merges
// them the same way the kit does.
export { cn, type ClassValue } from 'cn';
