/**
 * @fileoverview Test coverage for public landing page.
 */
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import LandingPage from "./LandingPage";

describe("LandingPage", () => {
  it("renders the hero copy and primary actions", () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: /your ride,/i })).toBeTruthy();
    expect(screen.getByText(/your town\./i)).toBeTruthy();
    expect(screen.getByRole("link", { name: /request a ride/i }).getAttribute("href")).toBe("/register?role=CUSTOMER");
    expect(screen.getByRole("link", { name: /become a driver/i }).getAttribute("href")).toBe("/register?role=DRIVER");
  });
});
