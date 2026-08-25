// Shared gallery content model + image-host constants.
// Media files and the config JSON both live on the user's image host so the
// site needs no database and works even as a fully static deploy.

export type MediaType = "image" | "video";

export interface SlideText {
  code: string;
  category: string;
  title: string;
  subtitle: string;
}

export interface Slide extends SlideText {
  mediaUrl: string;
  mediaType: MediaType;
}

export interface GalleryConfig {
  version: number;
  slides: Slide[];
}

// Image host: unauthenticated POST upload, returns { url, name }. It keys files
// by their source filename and — critically — ignores a re-upload of a name that
// already exists (the first write wins, later ones are dropped). So every upload
// MUST use a fresh name: media gets a random name, and the config JSON is written
// as an incrementing version file (…-v1.json, …-v2.json, …). The server discovers
// the newest version at read time.
export const IMAGE_HOST = "https://imgs.kizai.top";
export const UPLOAD_ENDPOINT = `${IMAGE_HOST}/api/enableauthapi/r2`;

export const CONFIG_PREFIX = "ilg-gallery-config-v";
export const CONFIG_SUFFIX = ".json";

export function configFileName(version: number): string {
  return `${CONFIG_PREFIX}${version}${CONFIG_SUFFIX}`;
}

export function configUrl(version: number): string {
  return `${IMAGE_HOST}/api/rfile/${configFileName(version)}`;
}

export const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;

// Default copy — mirrors the six cells of the bundled mural atlas and seeds the
// admin form on first run.
export const DEFAULT_TEXT: SlideText[] = [
  { code: "ILG–01", category: "URBAN SYSTEMS", title: "Infinite City", subtitle: "A city, endlessly becoming." },
  { code: "ILG–02", category: "LIVING STRUCTURES", title: "Glass House", subtitle: "Transparency as a way of living." },
  { code: "ILG–03", category: "ACOUSTIC SPACE", title: "Echo Chamber", subtitle: "Rooms that remember every note." },
  { code: "ILG–04", category: "ORGANIC FUTURES", title: "Forest Portal", subtitle: "A threshold into another rhythm." },
  { code: "ILG–05", category: "SPATIAL IDENTITY", title: "Elsewhere", subtitle: "A place just beyond the familiar." },
  { code: "ILG–06", category: "CULTURAL PLATFORM", title: "Common Sky", subtitle: "One horizon, many points of view." },
];
