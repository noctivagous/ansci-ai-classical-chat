/**
 * Browser stub for the Node builtins the engine's data loaders import.
 * Filesystem reads throw / report absence, which the WordNet and
 * FrameNet providers already handle by disabling themselves.
 */
export function readFileSync(): never {
  throw new Error("filesystem unavailable in the browser build");
}
export function writeFileSync(): never {
  throw new Error("filesystem unavailable in the browser build");
}
export function existsSync(): boolean {
  return false;
}
export function readdirSync(): string[] {
  return [];
}
export function statSync(): never {
  throw new Error("filesystem unavailable in the browser build");
}
export function join(...parts: string[]): string {
  return parts.join("/");
}
export function resolve(...parts: string[]): string {
  return parts.join("/");
}
export function dirname(p: string): string {
  return p.split("/").slice(0, -1).join("/");
}
export function basename(p: string): string {
  return p.split("/").pop() ?? p;
}
export function extname(): string {
  return "";
}
export function fileURLToPath(u: string): string {
  return u;
}
export const sep = "/";
export default {};
