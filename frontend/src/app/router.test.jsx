/**
 * @fileoverview Test coverage for router.
 */
import { describe, expect, it } from "vitest";
import { router } from "./router";

describe("router", () => {
  it("has login route", () => {
    const paths = router.routes.map((route) => route.path).filter(Boolean);
    expect(paths).toContain("/login");
  });
});
