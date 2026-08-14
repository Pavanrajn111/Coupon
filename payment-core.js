// Centralized calculation engine and state management for CouponEx payments

/**
 * Calculates credit purchase details based on amount or selected package
 * @param {number|string} amount - The base amount entered or package price
 * @param {boolean} isPackage - True if it's a predefined package
 * @param {number} packCredits - Pre-calculated credits for package
 * @param {string} packageName - The name of the package
 * @returns {Object} Purchase details containing amount, discount, credits, total, name
 */
function calculateCreditPurchase(amount, isPackage = false, packCredits = 0, packageName = "") {
  const numericAmount = Math.max(0, parseInt(amount, 10) || 0);

  if (numericAmount <= 0) {
    return {
      name: isPackage ? packageName : "Custom Amount",
      amount: 0,
      discount: 0,
      credits: 0,
      total: 0
    };
  }

  if (isPackage) {
    return {
      name: packageName || "Predefined Pack",
      amount: numericAmount,
      discount: 0,
      credits: packCredits || numericAmount,
      total: numericAmount
    };
  }

  // Custom Amount Calculation Logic:
  // If amount <= 500: No discount
  // If amount > 500: 10% discount applied to the purchase price
  const hasDiscount = numericAmount > 500;
  const discount = hasDiscount ? Math.round(numericAmount * 0.10) : 0;
  const total = numericAmount - discount;
  const credits = numericAmount;

  return {
    name: "Custom Amount",
    amount: numericAmount,
    discount: discount,
    credits: credits,
    total: total
  };
}

/**
 * Saves current purchase selection to localStorage
 */
function savePurchaseSelection(selection) {
  if (!selection) return;
  localStorage.setItem("couponex-purchase-selection", JSON.stringify(selection));
}

/**
 * Loads current purchase selection from localStorage
 */
function loadPurchaseSelection() {
  const saved = localStorage.getItem("couponex-purchase-selection");
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed.total === 'number' && parsed.total > 0) {
        return parsed;
      }
    } catch (e) {
      console.error("Failed to parse purchase selection", e);
    }
  }
  // Default fallback (Starter Pack: ₹100 for 100 Credits)
  return {
    name: "Starter Pack",
    amount: 100,
    discount: 0,
    credits: 100,
    total: 100
  };
}

/**
 * Formats a number as INR currency
 */
function formatCurrency(val) {
  const num = parseFloat(val) || 0;
  return '₹' + num.toLocaleString('en-IN');
}

/**
 * Formats a number as Credits
 */
function formatCredits(val) {
  const num = parseInt(val, 10) || 0;
  return num.toLocaleString('en-IN') + ' C';
}

if (typeof window !== 'undefined') {
  window.calculateCreditPurchase = calculateCreditPurchase;
  window.savePurchaseSelection = savePurchaseSelection;
  window.loadPurchaseSelection = loadPurchaseSelection;
  window.formatCurrency = formatCurrency;
  window.formatCredits = formatCredits;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    calculateCreditPurchase,
    savePurchaseSelection,
    loadPurchaseSelection,
    formatCurrency,
    formatCredits
  };
}
