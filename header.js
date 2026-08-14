/**
 * CouponEx Shared Header Component
 * Handles header rendering, active navigation states, profile dropdown toggle,
 * outside-click dismissal, and user profile data population.
 */

(function () {
  function logoutUser() {
    localStorage.removeItem("couponex_user");
    window.location.href = "login.html";
  }
  window.logoutUser = logoutUser;

  function initHeader() {
    const headerContainer = document.getElementById("app-header");
    if (!headerContainer) return;

    const currentPath = window.location.pathname.split("/").pop() || "dashboard.html";

    const isHomeActive = currentPath === "dashboard.html" || currentPath === "";
    const isSearchActive = currentPath === "search.html";
    const isSellActive = currentPath === "sell.html";
    const isWalletActive = currentPath === "wallet.html";

    const getNavClass = (isActive) => (isActive ? "nav-link active" : "nav-link");

    const headerHTML = `
    <!-- Mobile Header -->
    <header class="mobile-header">
      <div class="shell">
        <button class="icon-button" type="button" aria-label="Go back" onclick="window.history.back()">
          <span class="material-symbols-outlined">arrow_back</span>
        </button>
        <h1 class="brand-title" onclick="location.href='dashboard.html'" style="cursor:pointer">CouponEx</h1>
        <button class="icon-button" type="button" aria-label="Notifications">
          <span class="material-symbols-outlined">notifications</span>
        </button>
      </div>
    </header>

    <!-- Desktop Header -->
    <header class="desktop-header">
      <div class="shell">
        <div class="header-left">
          <h1 class="brand-title" onclick="location.href='dashboard.html'" style="cursor:pointer">CouponEx</h1>
          <nav class="header-nav" aria-label="Dashboard navigation">
            <a class="${getNavClass(isHomeActive)}" href="dashboard.html">Home</a>
            <a class="${getNavClass(isSearchActive)}" href="search.html">Search</a>
            <a class="${getNavClass(isSellActive)}" href="sell.html">Sell</a>
          </nav>
        </div>
        <div class="header-right">
          <a class="${isWalletActive ? "header-action active" : "header-action"}" href="wallet.html">
            <span class="material-symbols-outlined" aria-hidden="true">account_balance_wallet</span>
            Wallet
          </a>
          <div class="profile-dropdown-wrap">
            <button class="header-action" id="profile-menu-btn" type="button" aria-expanded="false" aria-haspopup="dialog" style="background: none; border: none; cursor: pointer; display: flex; align-items: center; gap: 8px; color: var(--text-variant); font-family: inherit; font-size: inherit; font-weight: inherit; padding: 0;">
              <span class="material-symbols-outlined" aria-hidden="true">person</span>
              Profile
            </button>
            <div class="profile-dropdown-menu" id="profile-dropdown" role="dialog" aria-label="Profile menu">
              <div class="popup-user-header">
                <div class="popup-user-avatar" id="pop-avatar">
                  <span class="material-symbols-outlined avatar-icon">account_circle</span>
                </div>
                <div class="popup-user-meta">
                  <span class="popup-user-displayname" id="pop-user-name">Guest User</span>
                  <span class="popup-user-handle" id="pop-user-email">guest@couponex.com</span>
                  <span class="popup-user-badge">
                    <span class="material-symbols-outlined" style="font-size:11px;font-variation-settings:'FILL' 1">verified</span>
                    Member
                  </span>
                </div>
              </div>
              <div class="popup-menu-list">
                <a href="my-orders.html" class="profile-popup-row">
                  <div class="popup-icon-box"><span class="material-symbols-outlined">receipt_long</span></div>
                  <div class="popup-row-text">
                    <span class="popup-row-title">My Orders</span>
                    <span class="popup-row-subtitle">View and track recent orders</span>
                  </div>
                  <span class="material-symbols-outlined popup-chevron">chevron_right</span>
                </a>
                <a href="my-purchases.html" class="profile-popup-row">
                  <div class="popup-icon-box"><span class="material-symbols-outlined">confirmation_number</span></div>
                  <div class="popup-row-text">
                    <span class="popup-row-title">My Purchases</span>
                    <span class="popup-row-subtitle">Access digital goods and history</span>
                  </div>
                  <span class="material-symbols-outlined popup-chevron">chevron_right</span>
                </a>
                <a href="cart.html" class="profile-popup-row">
                  <div class="popup-icon-box"><span class="material-symbols-outlined">shopping_cart</span></div>
                  <div class="popup-row-text">
                    <span class="popup-row-title">Cart</span>
                    <span class="popup-row-subtitle">Items waiting for checkout</span>
                  </div>
                  <span class="material-symbols-outlined popup-chevron">chevron_right</span>
                </a>
                <a href="profile.html" class="profile-popup-row">
                  <div class="popup-icon-box"><span class="material-symbols-outlined">manage_accounts</span></div>
                  <div class="popup-row-text">
                    <span class="popup-row-title">Account Details</span>
                    <span class="popup-row-subtitle">Personal info and verification</span>
                  </div>
                  <span class="material-symbols-outlined popup-chevron">chevron_right</span>
                </a>
                <a href="personal-settings.html" class="profile-popup-row">
                  <div class="popup-icon-box"><span class="material-symbols-outlined">settings</span></div>
                  <div class="popup-row-text">
                    <span class="popup-row-title">Settings</span>
                    <span class="popup-row-subtitle">Preferences and security</span>
                  </div>
                  <span class="material-symbols-outlined popup-chevron">chevron_right</span>
                </a>
                <button type="button" class="profile-popup-row logout-row" onclick="logoutUser()" style="width: 100%; border: none; background: transparent; cursor: pointer; text-align: left;">
                  <div class="popup-icon-box danger"><span class="material-symbols-outlined">logout</span></div>
                  <div class="popup-row-text">
                    <span class="popup-row-title danger-text">Log Out</span>
                    <span class="popup-row-subtitle">Sign out of your session</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
    `;

    headerContainer.innerHTML = headerHTML;

    // Attach profile dropdown toggle events
    const profileBtn = document.getElementById("profile-menu-btn");
    const profileDropdown = document.getElementById("profile-dropdown");

    if (profileBtn && profileDropdown) {
      profileBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        const isOpen = profileDropdown.classList.toggle("show");
        profileBtn.setAttribute("aria-expanded", isOpen ? "true" : "false");
      });

      profileDropdown.addEventListener("click", function (e) {
        // Prevent closing when clicking inside popup, unless clicking a link
        if (!e.target.closest("a") && !e.target.closest("button")) {
          e.stopPropagation();
        }
      });

      document.addEventListener("click", function (e) {
        if (!profileBtn.contains(e.target) && !profileDropdown.contains(e.target)) {
          profileDropdown.classList.remove("show");
          profileBtn.setAttribute("aria-expanded", "false");
        }
      });
    }

    // Populate user profile info from localStorage
    function updateHeaderProfile(userData) {
      const usr = userData || (localStorage.getItem("couponex_user") ? JSON.parse(localStorage.getItem("couponex_user")) : null);
      if (!usr) return;
      try {
        const popName = document.getElementById("pop-user-name");
        const popEmail = document.getElementById("pop-user-email");
        const popAvatar = document.getElementById("pop-avatar");
        if (popName) popName.textContent = usr.fullName || usr.username || "User";
        if (popEmail) popEmail.textContent = usr.email || "";
        if (popAvatar) {
          const avatarUrl = usr.profilePhoto || usr.avatarUrl || usr.profileImage || usr.avatar || null;
          if (avatarUrl) {
            popAvatar.innerHTML = `<img src="${avatarUrl}" alt="Profile photo" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />`;
          } else {
            popAvatar.innerHTML = `<span class="material-symbols-outlined avatar-icon">account_circle</span>`;
          }
        }
      } catch (e) {
        console.error("Error loading user profile in header:", e);
      }
    }
    window.updateHeaderProfile = updateHeaderProfile;
    updateHeaderProfile();

  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initHeader);
  } else {
    initHeader();
  }
})();
