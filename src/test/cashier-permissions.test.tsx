import React from "react";
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import RequireAdmin from "@/components/RequireAdmin";
import { canViewCostPrice, isCashier } from "@/lib/auth";
import { getProductsSafe } from "@/lib/pos-safe";
import { saveProducts } from "@/lib/store";

const loginAsCashier = () => {
  localStorage.setItem("pos_auth_enabled", "1");
  localStorage.setItem("pos_users", JSON.stringify([{ id: "cashier-1", name: "كاشير", pin: "1234", role: "cashier", createdAt: new Date().toISOString() }]));
  localStorage.setItem("pos_session_user", JSON.stringify({ userId: "cashier-1", loginAt: new Date().toISOString() }));
};

describe("cashier permissions", () => {
  beforeEach(() => {
    localStorage.clear();
    loginAsCashier();
  });

  it("hides costPrice and sensitive stock quantities before POS rendering", () => {
    saveProducts([{ id: "p1", name: "منتج", code: "A1", brand: "B", model: "M", costPrice: 90, sellPrice: 120, quantity: 7, lowStockThreshold: 2, createdAt: new Date().toISOString() }]);

    const [product] = getProductsSafe();

    expect(isCashier()).toBe(true);
    expect(canViewCostPrice()).toBe(false);
    expect(product.costPrice).toBeUndefined();
    expect(product.quantity).toBeUndefined();
    expect(product.lowStockThreshold).toBeUndefined();
    expect(product.inStock).toBe(true);
  });

  it("blocks direct admin URLs for cashier users", async () => {
    render(
      <MemoryRouter initialEntries={["/reports"]}>
        <Routes>
          <Route path="/reports" element={<RequireAdmin><div>admin costPrice quantity secret</div></RequireAdmin>} />
          <Route path="/pos" element={<div>POS allowed</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.queryByText(/admin costPrice quantity secret/i)).not.toBeInTheDocument();
    expect(await screen.findByText("POS allowed")).toBeInTheDocument();
  });
});