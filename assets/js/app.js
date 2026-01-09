const supportedLangs = ["it", "en"];
const defaultLang = "it";

const scriptUrl = new URL(document.currentScript.src);
const rootUrl = new URL("../../", scriptUrl);
const dataUrl = new URL("data/", rootUrl);

const escapeHtml = (value) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");

const highlightAuthor = (text) => {
  const escaped = escapeHtml(text);
  const patterns = [
    /\b[A-Z]\.\s*Cardillo\b/gi,
    /\bCardillo\b\s*,?\s*[A-Z]\./gi,
    /\bCardillo\b/gi,
  ];
  return patterns.reduce(
    (acc, pattern) => acc.replace(pattern, (match) => `<strong>${match}</strong>`),
    escaped,
  );
};

const getValue = (obj, path) =>
  path.split(".").reduce((acc, key) => (acc ? acc[key] : undefined), obj);

const getPreferredLang = () => {
  const params = new URLSearchParams(window.location.search);
  const paramLang = params.get("lang");
  if (supportedLangs.includes(paramLang)) {
    localStorage.setItem("lang", paramLang);
    return paramLang;
  }
  const stored = localStorage.getItem("lang");
  if (supportedLangs.includes(stored)) {
    return stored;
  }
  return defaultLang;
};

const loadJson = async (url) => {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to load ${url}`);
  }
  return response.json();
};

const setLanguageButtons = (lang) => {
  document.querySelectorAll("[data-lang]").forEach((btn) => {
    const isActive = btn.dataset.lang === lang;
    btn.setAttribute("aria-pressed", isActive.toString());
  });
};

const applyI18n = (content) => {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    if (el.dataset.i18n === "sections.research.body") {
      return;
    }
    const value = getValue(content, el.dataset.i18n);
    if (typeof value === "string") {
      if (
        el.dataset.i18n === "hero.intro" ||
        el.dataset.i18n === "sections.supervision.bodyIntro" ||
        el.dataset.i18n === "sections.supervision.bodyDetail"
      ) {
        el.innerHTML = value;
        return;
      }
      el.textContent = value;
    }
  });
};

const applyProfile = (common) => {
  const profile = common.profile;

  const image = document.getElementById("profile-image");
  if (image) {
    image.src = new URL(profile.photo, rootUrl).toString();
    image.alt = profile.name;
  }

  document.querySelectorAll(".email-link").forEach((emailLink) => {
    emailLink.href = `mailto:${profile.email}`;
    emailLink.textContent = profile.email;
  });

  const addressText = document.getElementById("address-text");
  if (addressText) {
    addressText.textContent = profile.address;
  }

  const inafLink = document.getElementById("inaf-link");
  if (inafLink) {
    inafLink.href = profile.inaf_url;
  }

  const iapsLink = document.getElementById("iaps-link");
  if (iapsLink) {
    iapsLink.href = profile.iaps_url;
  }

  const orcidLink = document.getElementById("orcid-link");
  if (orcidLink && profile.orcid_url) {
    orcidLink.href = profile.orcid_url;
  }

  const linkedinLink = document.getElementById("linkedin-link");
  if (linkedinLink && profile.linkedin_url) {
    linkedinLink.href = profile.linkedin_url;
  }

  document.querySelectorAll("[data-link='cv']").forEach((link) => {
    link.href = new URL(profile.cv_file, rootUrl).toString();
  });
};

const renderTimeline = (container, items) => {
  if (!container || !items) return;
  container.innerHTML = items
    .map(
      (item) => `
      <li class="timeline-item">
        <div class="meta">${escapeHtml(item.period)}</div>
        <div><strong>${escapeHtml(item.title)}</strong></div>
        <div class="place">${escapeHtml(item.place)}</div>
      </li>
    `,
    )
    .join("");
};

const renderEducationExperience = (container, items) => {
  if (!container || !items) return;
  // Allow links in the education experience items.
  container.innerHTML = items
    .map((item) => `<li>${item.replace(/\\n|\n/g, "<br>")}</li>`)
    .join("");
};

const renderSimpleList = (container, items) => {
  if (!container || !items) return;
  container.innerHTML = items
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("");
};

const renderResearchBody = (content) => {
  const container = document.querySelector(
    '[data-i18n="sections.research.body"]',
  );
  if (!container) return;
  const raw = getValue(content, "sections.research.body");
  if (typeof raw !== "string") return;

  const lines = raw.split(/\r?\n/);
  const htmlParts = [];
  let paraLines = [];
  let listItems = [];

  const flushPara = () => {
    if (!paraLines.length) return;
    htmlParts.push(`<p>${paraLines.join(" ").trim()}</p>`);
    paraLines = [];
  };

  const flushList = () => {
    if (!listItems.length) return;
    htmlParts.push(
      `<ul class="research-list">${listItems
        .map((item) => `<li>${item}</li>`)
        .join("")}</ul>`,
    );
    listItems = [];
  };

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      flushPara();
      flushList();
      return;
    }
    if (trimmed.startsWith("- ")) {
      flushPara();
      listItems.push(trimmed.slice(2).trim());
      return;
    }
    flushList();
    paraLines.push(trimmed);
  });

  flushPara();
  flushList();

  container.innerHTML = htmlParts.join("");
};

const renderFocusSplit = (topList, otherList, topItems, otherItems) => {
  renderSimpleList(topList, topItems || []);
  renderSimpleList(otherList, otherItems || []);
};

const renderOngoing = (container, items, labels) => {
  if (!container || !items) return;
  container.innerHTML = items
    .map((item) => {
      return `
        <li>
          <span>${item.text || ""}</span>
        </li>
      `;
    })
    .join("");
};

const getSocialPlatformMeta = (hostname) => {
  if (hostname.includes("youtube.com") || hostname.includes("youtu.be")) {
    return {
      label: "YouTube",
      key: "youtube",
      icon: `
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <rect x="2.5" y="5" width="19" height="14" rx="4" fill="none" stroke="currentColor" stroke-width="1.8" />
          <path d="M10 9.2 16 12 10 14.8z" fill="currentColor" />
        </svg>
      `,
    };
  }
  if (hostname.includes("instagram.com")) {
    return {
      label: "Instagram",
      key: "instagram",
      icon: `
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="1.8" />
          <circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" stroke-width="1.8" />
          <circle cx="17" cy="7" r="1.2" fill="currentColor" />
        </svg>
      `,
    };
  }
  if (hostname.includes("facebook.com")) {
    return {
      label: "Facebook",
      key: "facebook",
      icon: `
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path
            d="M14.6 8.6V6.6c0-.9.6-1.4 1.5-1.4h1.5V2.6H16c-2.6 0-4.3 1.7-4.3 4.3v1.7H9.6v2.5h2.1V21h2.9v-9.9h2.3l.3-2.5h-2.6z"
            fill="currentColor"
          />
        </svg>
      `,
    };
  }
  const base = hostname.split(".")[0] || hostname;
  const label = base.charAt(0).toUpperCase() + base.slice(1);
  return {
    label,
    key: "generic",
    icon: `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path
          d="M8.8 12.2a3.6 3.6 0 0 1 0-5.1l2.1-2.1a3.6 3.6 0 0 1 5.1 5.1l-1 1"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M15.2 11.8a3.6 3.6 0 0 1 0 5.1l-2.1 2.1a3.6 3.6 0 0 1-5.1-5.1l1-1"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    `,
  };
};

const renderSocial = (container, items) => {
  if (!container || !items) return;
  container.innerHTML = items
    .map((item) => {
      const url = new URL(item.url);
      const hostname = url.hostname.replace(/^www\./, "");
      const platform = getSocialPlatformMeta(hostname);
      const preview = item.preview_image
        ? new URL(item.preview_image, rootUrl).toString()
        : `https://www.google.com/s2/favicons?domain=${hostname}&sz=128`;
      return `
      <li>
        <a class="social-card" href="${escapeHtml(item.url)}" target="_blank" rel="noopener">
          <div class="social-preview">
            <div class="social-meta">
              <span class="social-platform social-platform--${platform.key}">
                ${platform.icon}
              </span>
              <span class="social-label">${escapeHtml(item.label)}</span>
            </div>
            <img src="${preview}" alt="" loading="lazy" />
          </div>
        </a>
      </li>
    `;
    })
    .join("");
};

const renderYearGroups = (container, groups, labels) => {
  if (!container || !groups) return;
  const formatText = (text) => {
    if (container.id === "outreach-list") {
      return text || "";
    }
    if (container.id && container.id.includes("publications")) {
      return highlightAuthor(text);
    }
    return escapeHtml(text);
  };
  const listTag = container.id === "outreach-list" ? "ul" : "ol";
  const years = Object.keys(groups).sort((a, b) => {
    const aNum = parseInt(a.split("-")[0], 10);
    const bNum = parseInt(b.split("-")[0], 10);
    if (Number.isNaN(aNum) || Number.isNaN(bNum)) {
      return b.localeCompare(a);
    }
    return bNum - aNum;
  });
  container.innerHTML = years
    .map((year, idx) => {
      const items = groups[year];
      const listItems = items
        .map((item) => {
          const text = formatText(item.text);
          const links = (item.links || [])
            .map((link) => {
              const label = link.includes("doi.org")
                ? labels.doi
                : labels.link;
              return `<a href="${escapeHtml(link)}" target="_blank" rel="noopener">${escapeHtml(label)}</a>`;
            })
            .join("");
          return `
            <li>
              <span>${text}</span>
              ${links ? `<span class="link-tags">${links}</span>` : ""}
            </li>
          `;
        })
        .join("");

      return `
        <details class="year-group" ${idx === 0 ? "open" : ""}>
          <summary>
            <span>${escapeHtml(year)}</span>
            <span class="count">${items.length}</span>
          </summary>
          <${listTag} class="stacked-list">${listItems}</${listTag}>
        </details>
      `;
    })
    .join("");
};

const renderPublicationsList = (container, items, labels) => {
  if (!container || !items) return;
  container.innerHTML = items
    .map((item) => {
      const text = highlightAuthor(item.text || "");
      const links = (item.links || [])
        .map((link) => {
          const label = link.includes("doi.org") ? labels.doi : labels.link;
          return `<a href="${escapeHtml(link)}" target="_blank" rel="noopener">${escapeHtml(label)}</a>`;
        })
        .join("");
      return `
        <li>
          <span>${text}</span>
          ${links ? `<span class="link-tags">${links}</span>` : ""}
        </li>
      `;
    })
    .join("");
};

const getPrimaryCardilloItems = (byYear) => {
  const years = Object.keys(byYear || {}).sort((a, b) => {
    const aNum = parseInt(a.split("-")[0], 10);
    const bNum = parseInt(b.split("-")[0], 10);
    if (Number.isNaN(aNum) || Number.isNaN(bNum)) {
      return b.localeCompare(a);
    }
    return bNum - aNum;
  });
  const results = [];
  years.forEach((year) => {
    const items = byYear[year] || [];
    items.forEach((item) => {
      const text = item.text || "";
      const authorsPart = text.split(":")[0];
      const tokens = authorsPart
        .replace(/\bet al\.?/gi, "")
        .split(/,|&| and /i)
        .map((token) => token.trim())
        .filter(Boolean);
      const cardilloIndex = tokens.findIndex((token) =>
        token.toLowerCase().includes("cardillo"),
      );
      if (cardilloIndex > -1 && cardilloIndex < 5) {
        results.push(item);
      }
    });
  });
  return results;
};

const renderNews = (container, items, labels) => {
  if (!container || !items) return;
  container.innerHTML = items
    .map((item) => {
      const link =
        item.link &&
        `<a href="${escapeHtml(item.link)}" target="_blank" rel="noopener">${escapeHtml(labels.open)}</a>`;
      return `
        <li class="news-item">
          <div class="news-meta">
            <span class="tag">${escapeHtml(item.category)}</span>
            <span class="count">${escapeHtml(item.year)}</span>
          </div>
          <h3>${escapeHtml(item.title)}</h3>
          <p>${escapeHtml(item.body)}</p>
          ${link || ""}
        </li>
      `;
    })
    .join("");
};

const applyContent = (common, content) => {
  document.documentElement.lang = content.lang;
  const page = document.body.dataset.page;
  const pageTitles = {
    publications: content.publicationsPage?.title,
    outreach: content.outreachPage?.title,
    news: content.newsPage?.title,
  };
  const pageTitle = page && pageTitles[page];
  document.title = pageTitle
    ? `${pageTitle} | ${content.siteTitle}`
    : content.siteTitle;

  applyI18n(content);
  applyProfile(common);
  renderResearchBody(content);

  renderEducationExperience(
    document.getElementById("education-experience-list"),
    getValue(content, "sections.educationExperience.items"),
  );
  renderFocusSplit(
    document.getElementById("focus-top-list"),
    document.getElementById("focus-other-list"),
    getValue(content, "sections.research.focusTop"),
    getValue(content, "sections.research.focusOther"),
  );
  renderSocial(document.getElementById("social-list"), common.social);

  renderTimeline(
    document.getElementById("teaching-list"),
    getValue(content, "teaching.items"),
  );

  if (page !== "publications") {
    renderYearGroups(
      document.getElementById("publications-list"),
      common.publications.byYear,
      content.labels,
    );
  }
  if (page === "publications") {
    const byYear = common.publications.byYear || {};
    const cardilloItems = getPrimaryCardilloItems(byYear);
    renderPublicationsList(
      document.getElementById("publications-cardillo-list"),
      cardilloItems,
      content.labels,
    );
    const featuredSet = new Set(cardilloItems.map((item) => item.text));
    const filteredByYear = Object.fromEntries(
      Object.entries(byYear).map(([year, items]) => [
        year,
        (items || []).filter((item) => !featuredSet.has(item.text)),
      ]),
    );
    renderYearGroups(
      document.getElementById("publications-list"),
      filteredByYear,
      content.labels,
    );
  }
  renderYearGroups(
    document.getElementById("outreach-list"),
    common.outreach.byYear,
    content.labels,
  );
  renderOngoing(
    document.getElementById("outreach-ongoing"),
    common.outreach.ongoing || [],
    content.labels,
  );

  renderNews(
    document.getElementById("news-list"),
    content.news.items,
    content.labels,
  );

  setLanguageButtons(content.lang);
};

const setupDropdowns = () => {
  const dropdowns = Array.from(document.querySelectorAll(".nav-dropdown"));
  if (!dropdowns.length) return;

  const closeAll = () => {
    dropdowns.forEach((dropdown) => {
      dropdown.classList.remove("is-open");
      const button = dropdown.querySelector(".nav-button");
      if (button) {
        button.setAttribute("aria-expanded", "false");
      }
    });
  };

  const openDropdown = (dropdown) => {
    dropdown.classList.add("is-open");
    const button = dropdown.querySelector(".nav-button");
    if (button) {
      button.setAttribute("aria-expanded", "true");
    }
  };

  const toggleDropdown = (dropdown) => {
    const isOpen = dropdown.classList.contains("is-open");
    if (isOpen) {
      closeAll();
      return;
    }
    closeAll();
    openDropdown(dropdown);
  };

  dropdowns.forEach((dropdown) => {
    const button = dropdown.querySelector(".nav-button");
    const menu = dropdown.querySelector(".dropdown-menu");
    if (!button) return;
    let closeTimer;

    const scheduleClose = () => {
      clearTimeout(closeTimer);
      closeTimer = setTimeout(() => {
        dropdown.classList.remove("is-open");
        const btn = dropdown.querySelector(".nav-button");
        if (btn) {
          btn.setAttribute("aria-expanded", "false");
        }
      }, 150);
    };

    const cancelClose = () => {
      clearTimeout(closeTimer);
    };

    dropdown.addEventListener("mouseenter", () => {
      cancelClose();
      openDropdown(dropdown);
    });

    if (button.dataset.homeLink === "true") {
      button.addEventListener("click", (event) => {
        if (document.body.dataset.page === "home") {
          event.preventDefault();
          toggleDropdown(dropdown);
          return;
        }
        event.preventDefault();
        const target =
          button.getAttribute("href") ||
          button.getAttribute("data-home-href") ||
          "index.html";
        window.location.href = target;
      });
    }

    dropdown.addEventListener("mouseleave", () => {
      scheduleClose();
    });

    if (menu) {
      menu.addEventListener("mouseenter", () => {
        cancelClose();
        openDropdown(dropdown);
      });

      menu.addEventListener("mouseleave", () => {
        scheduleClose();
      });
    }
  });

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".nav-dropdown")) {
      closeAll();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeAll();
    }
  });

  document.querySelectorAll(".dropdown-menu a").forEach((link) => {
    link.addEventListener("click", () => {
      closeAll();
    });
  });
};

const init = async () => {
  const lang = getPreferredLang();
  try {
    const commonFile = lang === "en" ? "common_en.json" : "common.json";
    const [common, content] = await Promise.all([
      loadJson(new URL(commonFile, dataUrl)),
      loadJson(new URL(`${lang}.json`, dataUrl)),
    ]);
    applyContent(common, content);
  } catch (error) {
    console.error(error);
  }
};

document.querySelectorAll("[data-lang]").forEach((btn) => {
  btn.addEventListener("click", async () => {
    const lang = btn.dataset.lang;
    if (!supportedLangs.includes(lang)) return;
    localStorage.setItem("lang", lang);
    const commonFile = lang === "en" ? "common_en.json" : "common.json";
    const [common, content] = await Promise.all([
      loadJson(new URL(commonFile, dataUrl)),
      loadJson(new URL(`${lang}.json`, dataUrl)),
    ]);
    applyContent(common, content);
  });
});

setupDropdowns();
init();
