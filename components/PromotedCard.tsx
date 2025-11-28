// components/PromotedCard.tsx
import React from "react";
import { useRouter } from "next/router";

type Promo = {
  id: string;
  cpc: number;
  item_id: string;
  seller_id: string;
};

export default function PromotedCard({ item, promotion }: { item: any; promotion: Promo }) {
  const router = useRouter();

  const trackClick = (promotionId: string) => {
    const clickId = `${promotionId}-${Date.now()}-${Math.random().toString(36).slice(2,9)}`;
    const payload = {
      promotion_id: promotionId,
      item_id: item.id,
      click_id: clickId,
      page: router.asPath,
      ts: new Date().toISOString(),
    };
    const url = "/api/promotions/click";

    // prefer navigator.sendBeacon for reliability on navigation
    try {
      if (typeof window !== "undefined" && navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
        navigator.sendBeacon(url, blob);
        return;
      }
    } catch (e) {
      // fallthrough to fetch
    }

    // fallback
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {});
  };

  return (
    <div className="bg-white rounded-xl shadow p-3 promoted-card">
      <a
        onClick={() => {
          trackClick(promotion.id);
          router.push(`/item/${item.id}`);
        }}
        className="cursor-pointer block"
      >
        <img src={item.image_url} alt={item.title} className="w-full h-40 object-cover rounded-lg mb-2" />
        <h3 className="font-medium">{item.title}</h3>
        <p className="font-semibold">${item.price}</p>
        <div className="text-xs text-gray-500 mt-1">Promoted • ${promotion.cpc}/click</div>
      </a>
    </div>
  );
}
