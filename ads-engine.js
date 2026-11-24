(function () {
  "use strict";

  const CONFIG_URL = "https://ads.brunorachiele.it/ads-config.json";

  function injectStyles() {
    if (document.getElementById("br-ads-engine-css")) return;
    const style = document.createElement("style");
    style.id = "br-ads-engine-css";
    style.textContent = `
      .br-ad-slot {
        margin: 18px auto;
        text-align: center;
        max-width: 100%;
        clear: both;
      }
      .br-ad-wrapper {
        display: inline-block;
        max-width: 100%;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 6px 8px 8px;
        box-sizing: border-box;
      }
      .br-ad-label {
        display: block;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: #64748b;
        margin-bottom: 5px;
        text-align: center;
      }
      .br-ad-link {
        display: block;
        line-height: 0;
        text-decoration: none;
      }
      .br-ad-img {
        max-width: 100%;
        height: auto;
        border-radius: 5px;
        display: block;
        margin: 0 auto;
      }
    `;
    document.head.appendChild(style);
  }

  function isDateValid(startDate, endDate) {
    const today = new Date().toISOString().slice(0, 10);
    if (startDate && today < startDate) return false;
    if (endDate && today > endDate) return false;
    return true;
  }

  function pickWeightedCampaign(list) {
    if (!list || list.length === 0) return null;
    if (list.length === 1) return list[0];

    const totalWeight = list.reduce((sum, item) => sum + (Number(item.weight) || 1), 0);
    let random = Math.random() * totalWeight;

    for (let i = 0; i < list.length; i++) {
      random -= Number(list[i].weight) || 1;
      if (random <= 0) return list[i];
    }
    return list[0];
  }

  function trackEvent(eventName, campaign, slotName) {
    if (typeof window.gtag === "function") {
      window.gtag("event", eventName, {
        event_category: "Advertising_B2B",
        event_label: campaign.client + " (" + campaign.id + ")",
        ad_slot: slotName
      });
    }
  }

  function renderSlot(slotEl, campaign, slotName) {
    if (!campaign.imageUrl) return;

    const wrapper = document.createElement("div");
    wrapper.className = "br-ad-wrapper";

    const label = document.createElement("span");
    label.className = "br-ad-label";
    label.textContent = campaign.label || "Spazio Sponsorizzato";

    const link = document.createElement("a");
    link.className = "br-ad-link";
    link.href = campaign.targetUrl || "#";
    link.target = "_blank";
    link.rel = "sponsored noopener noreferrer";
    link.title = campaign.altText || campaign.client;

    const img = document.createElement("img");
    img.className = "br-ad-img";
    img.src = campaign.imageUrl;
    img.alt = campaign.altText || campaign.client;
    img.loading = "lazy";

    link.addEventListener("click", function () {
      trackEvent("ad_click", campaign, slotName);
    });

    link.appendChild(img);
    wrapper.appendChild(label);
    wrapper.appendChild(link);

    slotEl.innerHTML = "";
    slotEl.appendChild(wrapper);

    trackEvent("ad_impression", campaign, slotName);
  }

  async function initAds() {
    const slotElements = document.querySelectorAll(".br-ad-slot[data-slot]");
    if (slotElements.length === 0) return;

    injectStyles();

    try {
      const cacheKey = Math.floor(Date.now() / (2 * 60 * 1000));
      const response = await fetch(CONFIG_URL + "?v=" + cacheKey, { cache: "no-store" });
      if (!response.ok) return;

      const data = await response.json();
      const campaigns = Array.isArray(data.campaigns) ? data.campaigns : [];

      slotElements.forEach(function (el) {
        const slotName = el.getAttribute("data-slot");
        const eligible = campaigns.filter(function (c) {
          return (
            c.active === true &&
            Array.isArray(c.slots) &&
            c.slots.includes(slotName) &&
            isDateValid(c.startDate, c.endDate)
          );
        });

        const chosen = pickWeightedCampaign(eligible);
        if (chosen) {
          renderSlot(el, chosen, slotName);
        }
      });
    } catch (err) {
      console.warn("BR Ads Engine:", err);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAds);
  } else {
    initAds();
  }
})();
