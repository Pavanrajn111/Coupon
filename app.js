const header = document.querySelector("[data-header]");
const navToggle = document.querySelector("[data-nav-toggle]");
const navMenu = document.querySelector("[data-nav-menu]");
const revealItems = document.querySelectorAll(".reveal");
const signupForm = document.querySelector(".signup-form");
const settingsToggle = document.querySelector("[data-settings-toggle]");
const settingsMenu = document.querySelector("[data-settings-menu]");
const settingsOptions = document.querySelectorAll("[data-theme-option]");

const applyTheme = (theme) => {
  const nextTheme = theme === "light" ? "light" : "dark";
  document.body.classList.toggle("theme-light", nextTheme === "light");
  document.body.dataset.theme = nextTheme;
  localStorage.setItem("couponex-theme", nextTheme);

  settingsOptions.forEach((option) => {
    const isActive = option.getAttribute("data-theme-option") === nextTheme;
    option.classList.toggle("is-active", isActive);
  });
};

const setHeaderState = () => {
  header?.classList.toggle("is-scrolled", window.scrollY > 20);
};

setHeaderState();
window.addEventListener("scroll", setHeaderState, { passive: true });

const savedTheme = localStorage.getItem("couponex-theme");
const initialTheme =
  savedTheme ||
  (window.matchMedia("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark");
applyTheme(initialTheme);

settingsToggle?.addEventListener("click", () => {
  const isOpen = settingsMenu?.classList.toggle("is-open");
  settingsToggle.setAttribute("aria-expanded", String(Boolean(isOpen)));
});

settingsOptions.forEach((option) => {
  option.addEventListener("click", () => {
    applyTheme(option.getAttribute("data-theme-option") || "dark");
    settingsMenu?.classList.remove("is-open");
    settingsToggle?.setAttribute("aria-expanded", "false");
  });
});

document.addEventListener("click", (event) => {
  if (!settingsToggle || !settingsMenu) return;
  if (
    !settingsToggle.contains(event.target) &&
    !settingsMenu.contains(event.target)
  ) {
    settingsMenu.classList.remove("is-open");
    settingsToggle.setAttribute("aria-expanded", "false");
  }
});

navToggle?.addEventListener("click", () => {
  const isOpen = navMenu?.classList.toggle("is-open");
  navToggle.setAttribute("aria-expanded", String(Boolean(isOpen)));
});

navMenu?.addEventListener("click", (event) => {
  if (event.target instanceof HTMLAnchorElement) {
    navMenu.classList.remove("is-open");
    navToggle?.setAttribute("aria-expanded", "false");
  }
});

// Global logout function fallback if header.js isn't present on landing page
if (typeof window.logoutUser === "undefined") {
  window.logoutUser = function () {
    localStorage.removeItem("couponex_user");
    window.location.href = "login.html";
  };
}

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.14, rootMargin: "0px 0px -40px 0px" },
);

revealItems.forEach((item) => revealObserver.observe(item));

document.querySelectorAll(".faq-item").forEach((item) => {
  item.addEventListener("toggle", () => {
    if (!item.open) return;
    document.querySelectorAll(".faq-item").forEach((otherItem) => {
      if (otherItem !== item) otherItem.removeAttribute("open");
    });
  });
});

signupForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const button = signupForm.querySelector("button");
  const input = signupForm.querySelector("input");
  if (!button || !input) return;

  const originalText = button.textContent;
  button.textContent = "Access Requested";
  button.setAttribute("disabled", "true");
  input.value = "";

  window.setTimeout(() => {
    button.textContent = originalText;
    button.removeAttribute("disabled");
  }, 2200);
});