import "server-only";

// GL JS runs in the browser. Only a public Mapbox token may cross this boundary.
export function getMapToken(): string {
  const token = process.env.MAPBOX_ACCESS_TOKEN?.trim() ?? "";
  return process.env.MAP_PROVIDER === "mapbox" && token.startsWith("pk.") ? token : "";
}
