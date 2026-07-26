import { describe, expect, it } from "vitest";
import {
  DEFAULT_ROUTE,
  getRoute,
  groupedRoutes,
  matchRoute,
  normalizeRoutePath,
  ROUTES,
  ROUTE_GROUPS,
  routeForSection,
} from "./routes";

describe("route model", () => {
  it("gives every destination a unique id and path", () => {
    expect(new Set(ROUTES.map((route) => route.id)).size).toBe(ROUTES.length);
    expect(new Set(ROUTES.map((route) => route.path)).size).toBe(ROUTES.length);
    for (const route of ROUTES) {
      expect(route.path.startsWith("/")).toBe(true);
      expect(route.label.length).toBeGreaterThan(0);
      expect(ROUTE_GROUPS).toContain(route.group);
    }
  });

  it("defaults to the reading drill", () => {
    expect(DEFAULT_ROUTE.id).toBe("practice-reading");
    expect(DEFAULT_ROUTE.section).toBe("practice");
    expect(DEFAULT_ROUTE.mode).toBe("reading");
  });

  it("only lists destinations that have a screen behind them", () => {
    // Navigation that leads nowhere is worse than no navigation, so Today,
    // Learn, and Account must not appear before the slices that build them.
    const labels = ROUTES.map((route) => route.label);
    expect(labels).not.toContain("Today");
    expect(labels).not.toContain("Learn");
    expect(labels).not.toContain("Account");
    expect(labels).not.toContain("Sign in");
  });
});

describe("normalizeRoutePath", () => {
  it("ignores trailing slashes and missing leading slashes", () => {
    expect(normalizeRoutePath("/progress/")).toBe("/progress");
    expect(normalizeRoutePath("progress")).toBe("/progress");
    expect(normalizeRoutePath("/progress///")).toBe("/progress");
    expect(normalizeRoutePath("/")).toBe("/");
    expect(normalizeRoutePath("")).toBe("/");
  });
});

describe("matchRoute", () => {
  it("resolves each known path", () => {
    expect(matchRoute("/practice/reading")?.id).toBe("practice-reading");
    expect(matchRoute("/practice/pitch")?.id).toBe("practice-pitch");
    expect(matchRoute("/practice/songs")?.id).toBe("songs");
    expect(matchRoute("/progress")?.id).toBe("progress");
    expect(matchRoute("/progress/map")?.id).toBe("progress-map");
    expect(matchRoute("/progress/history")?.id).toBe("progress-history");
    expect(matchRoute("/settings")?.id).toBe("settings");
    expect(matchRoute("/settings/data")?.id).toBe("settings-data");
  });

  it("tolerates trailing slashes and reports unknown paths", () => {
    expect(matchRoute("/progress/map/")?.id).toBe("progress-map");
    expect(matchRoute("/nope")).toBeUndefined();
    expect(matchRoute("/")).toBeUndefined();
  });
});

describe("routeForSection", () => {
  it("maps practice to the destination for the given mode", () => {
    expect(routeForSection("practice", "reading").id).toBe("practice-reading");
    expect(routeForSection("practice", "pitch").id).toBe("practice-pitch");
    expect(routeForSection("practice").id).toBe("practice-reading");
  });

  it("maps every other section to its destination", () => {
    expect(routeForSection("songs").id).toBe("songs");
    expect(routeForSection("progress").id).toBe("progress");
    expect(routeForSection("map").id).toBe("progress-map");
    expect(routeForSection("history").id).toBe("progress-history");
    expect(routeForSection("settings").id).toBe("settings");
    expect(routeForSection("data").id).toBe("settings-data");
  });

  it("falls back to the default destination for an unknown section", () => {
    expect(routeForSection("nope" as never).id).toBe(DEFAULT_ROUTE.id);
  });
});

describe("getRoute / groupedRoutes", () => {
  it("looks a destination up by id", () => {
    expect(getRoute("settings-data").path).toBe("/settings/data");
  });

  it("groups destinations in display order without dropping any", () => {
    const groups = groupedRoutes();
    expect(groups.map((entry) => entry.group)).toEqual([...ROUTE_GROUPS]);
    expect(groups.flatMap((entry) => entry.routes)).toHaveLength(ROUTES.length);
    expect(groups.every((entry) => entry.routes.length > 0)).toBe(true);
  });
});
