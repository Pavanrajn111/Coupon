const express = require("express");
const router = express.Router();
const detailsDb = require("../db/detailsDb");

// GET /api/profile/check-username - Check whether a username is available
router.get("/check-username", (req, res) => {
  try {
    const username = String(req.query.username || "").trim().toLowerCase();
    const currentUserId = req.query.userId ? parseInt(req.query.userId, 10) : null;
    if (!username) {
      return res.status(400).json({ success: false, error: "Username is required" });
    }

    const existing = detailsDb.findUserByUsername(username);
    const available = !existing || (currentUserId && existing.id === currentUserId);
    return res.json({ success: true, available: Boolean(available) });
  } catch (error) {
    console.error("Username availability error:", error);
    return res.status(500).json({ success: false, error: "Server error" });
  }
});


// GET /api/profile/:userId - Get user profile with stats
router.get("/:userId", (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    if (!userId) {
      return res.status(400).json({ success: false, error: "Invalid user ID" });
    }

    const user = detailsDb.findUserByUsernameOrEmail(String(userId));
    // We need to find by ID, so let's use getAllUsers
    const allUsers = detailsDb.getAllUsers();
    const foundUser = allUsers.find((u) => u.id === userId);

    if (!foundUser) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const stats = detailsDb.getUserStats(userId);
    const coupons = detailsDb.getCouponsByUserId(userId);

    return res.json({
      success: true,
      user: {
        id: foundUser.id,
        fullName: foundUser.fullName,
        username: foundUser.username,
        email: foundUser.email,
        phoneNumber: foundUser.phoneNumber,
        bio: foundUser.bio || "",
        profilePhoto: foundUser.profilePhoto || "",
        isVerified: foundUser.isVerified,
        role: foundUser.role,
        balance: foundUser.balance || 0.0,
        createdAt: foundUser.createdAt,
      },
      stats,
      coupons,
    });
  } catch (error) {
    console.error("Profile error:", error);
    return res.status(500).json({ success: false, error: "Server error" });
  }
});

// PUT /api/profile/:userId - Update profile details
router.put("/:userId", (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    if (!userId) {
      return res.status(400).json({ success: false, error: "Invalid user ID" });
    }

    const result = detailsDb.updateUserProfile(userId, req.body);
    if (!result.success) {
      return res.status(409).json({ success: false, errors: result.errors });
    }

    return res.json({ success: true, message: "Profile updated successfully", user: result.user });
  } catch (error) {
    console.error("Profile update error:", error);
    return res.status(500).json({ success: false, error: "Server error" });
  }
});

// POST /api/profile/coupon - Create a new coupon listing
router.post("/coupon", (req, res) => {
  try {
    const {
      userId,
      brand,
      category,
      code,
      expiryDate,
      originalValue,
      askingPrice,
      description,
      image,
    } = req.body;

    if (
      !userId ||
      !brand ||
      !category ||
      !code ||
      !expiryDate ||
      !originalValue ||
      !askingPrice
    ) {
      return res
        .status(400)
        .json({ success: false, error: "Missing required fields" });
    }

    const couponId = detailsDb.createCoupon({
      userId: parseInt(userId),
      brand,
      category,
      code,
      expiryDate,
      originalValue: parseFloat(originalValue),
      askingPrice: parseFloat(askingPrice),
      description: description || "",
      image: image || "",
    });

    return res.status(201).json({
      success: true,
      message: "Coupon listed successfully!",
      couponId,
    });
  } catch (error) {
    console.error("Create coupon error:", error);
    return res.status(500).json({ success: false, error: "Server error" });
  }
});

// GET /api/profile/:userId/stats - Get user stats only
router.get("/:userId/stats", (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const stats = detailsDb.getUserStats(userId);
    return res.json({ success: true, stats });
  } catch (error) {
    console.error("Stats error:", error);
    return res.status(500).json({ success: false, error: "Server error" });
  }
});

// POST /api/profile/payout - Submit a withdrawal request
router.post("/payout", (req, res) => {
  try {
    const { userId, amount, bankDetails } = req.body;
    if (!userId || !amount || !bankDetails) {
      return res.status(400).json({ success: false, error: "Missing required fields" });
    }
    const payoutId = detailsDb.createPayout({
      userId: parseInt(userId),
      amount: parseFloat(amount),
      bankDetails
    });
    return res.status(201).json({ success: true, message: "Payout request submitted successfully!", payoutId });
  } catch (error) {
    console.error("Create payout error:", error);
    return res.status(400).json({ success: false, error: error.message || "Server error" });
  }
});

// GET /api/profile/:userId/payouts - Get payouts of a user
router.get("/:userId/payouts", (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const payouts = detailsDb.getPayoutsByUserId(userId);
    return res.json({ success: true, payouts });
  } catch (error) {
    console.error("Get payouts error:", error);
    return res.status(500).json({ success: false, error: "Server error" });
  }
});

// GET /api/admin/stats - Get dashboard overview statistics
router.get("/admin/stats", (req, res) => {
  try {
    const stats = detailsDb.getAdminStats();
    return res.json({ success: true, stats });
  } catch (error) {
    console.error("Admin stats error:", error);
    return res.status(500).json({ success: false, error: "Server error" });
  }
});

// GET /api/admin/verifications - Get pending coupons list
router.get("/admin/verifications", (req, res) => {
  try {
    const queue = detailsDb.getAllPendingCoupons();
    return res.json({ success: true, queue });
  } catch (error) {
    console.error("Admin verifications queue error:", error);
    return res.status(500).json({ success: false, error: "Server error" });
  }
});

// POST /api/admin/verify-coupon - Verify/Approve or Reject a coupon listing
router.post("/admin/verify-coupon", (req, res) => {
  try {
    const { couponId, action } = req.body; // action: 'approve' | 'reject'
    if (!couponId || !action) {
      return res.status(400).json({ success: false, error: "Missing required fields" });
    }
    
    if (action === 'approve') {
      const result = detailsDb.approveCoupon(parseInt(couponId));
      if (!result.success) {
        return res.status(400).json({ success: false, error: result.message });
      }
      return res.json({ success: true, message: "Coupon approved and credits transferred successfully!" });
    } else {
      detailsDb.updateCouponStatus(parseInt(couponId), 'rejected');
      return res.json({ success: true, message: "Coupon rejected successfully." });
    }
  } catch (error) {
    console.error("Verify coupon error:", error);
    return res.status(500).json({ success: false, error: "Server error" });
  }
});

// GET /api/admin/payments - Get pending topup requests
router.get("/admin/payments", (req, res) => {
  try {
    let queue = detailsDb.getAllPendingTopups();
    
    // Filter by method if specified (case insensitive)
    const method = req.query.method;
    if (method) {
      const targetMethod = method.trim().toLowerCase();
      queue = queue.filter(p => {
        const m = (p.paymentMethod || "").trim().toLowerCase();
        if (targetMethod === 'cards' || targetMethod === 'card') {
          return m === 'card' || m === 'cards';
        }
        return m === targetMethod;
      });
    }

    return res.json({ success: true, queue });
  } catch (error) {
    console.error("Admin payments queue error:", error);
    return res.status(500).json({ success: false, error: "Server error" });
  }
});

// GET /api/admin/payments/stats - Get payment statistics (pending reviews, daily approved in ₹)
router.get("/admin/payments/stats", (req, res) => {
  try {
    const stats = detailsDb.getAdminPaymentStats();
    return res.json({ success: true, stats });
  } catch (error) {
    console.error("Admin payments stats error:", error);
    return res.status(500).json({ success: false, error: "Server error" });
  }
});

// POST /api/admin/verify-payout - Approve or Reject a topup request
router.post("/admin/verify-payout", (req, res) => {
  try {
    const { payoutId, action, reason } = req.body; // action: 'approve' | 'reject'
    if (!payoutId || !action) {
      return res.status(400).json({ success: false, error: "Missing required fields" });
    }
    
    const status = action === 'approve' ? 'Approved' : 'Rejected';
    detailsDb.updateTopupStatus(parseInt(payoutId), status, "admin", reason || "");

    // Return updated stats so frontend can refresh counters immediately
    const updatedStats = detailsDb.getAdminPaymentStats();
    return res.json({ success: true, message: `Payment request ${action}d successfully!`, stats: updatedStats });
  } catch (error) {
    console.error("Verify payout error:", error);
    return res.status(500).json({ success: false, error: error.message || "Server error" });
  }
});

// POST /api/profile/topup - Create a new topup request
router.post("/topup", (req, res) => {
  try {
    const {
      userId,
      userName,
      username,
      email,
      packageName,
      requestedCredits,
      purchaseAmount,
      discount,
      totalAmount,
      paymentMethod,
      paymentReference
    } = req.body;

    if (!userId || !requestedCredits || !totalAmount || !paymentMethod) {
      return res.status(400).json({ success: false, error: "Missing required fields" });
    }

    // Resolve user info if missing
    let resolvedUserName = userName;
    let resolvedUsername = username;
    let resolvedEmail = email;

    const allUsers = detailsDb.getAllUsers();
    const user = allUsers.find(u => u.id === parseInt(userId));
    if (user) {
      if (!resolvedUserName) resolvedUserName = user.fullName;
      if (!resolvedUsername) resolvedUsername = user.username;
      if (!resolvedEmail) resolvedEmail = user.email;
    }

    const topupId = detailsDb.createTopup({
      userId: parseInt(userId),
      userName: resolvedUserName || "",
      username: resolvedUsername || "",
      email: resolvedEmail || "",
      packageName: packageName || "Custom Amount",
      requestedCredits: parseFloat(requestedCredits),
      purchaseAmount: parseFloat(purchaseAmount || totalAmount),
      discount: parseFloat(discount || 0),
      totalAmount: parseFloat(totalAmount),
      paymentMethod,
      paymentStatus: "Pending",
      requestStatus: "Pending",
      paymentReference: paymentReference || ""
    });

    return res.status(201).json({ success: true, message: "Payment request submitted successfully!", topupId });
  } catch (error) {
    console.error("Create topup error:", error);
    return res.status(500).json({ success: false, error: "Server error" });
  }
});

// GET /api/profile/:userId/topups - Get approved topup transactions for a user
router.get("/:userId/topups", (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const db = detailsDb.getDb();
    const topups = db.prepare(`
      SELECT id, requestId, totalAmount AS amount, requestedCredits AS credits, paymentMethod AS method, requestStatus AS status, createdAt
      FROM topups
      WHERE userId = ? AND requestStatus = 'Approved'
      ORDER BY createdAt DESC
    `).all();
    return res.json({ success: true, topups });
  } catch (error) {
    console.error("Get user topups error:", error);
    return res.status(500).json({ success: false, error: "Server error" });
  }
});

// POST /api/profile/add-credits - Add credits to a user's wallet
router.post("/add-credits", (req, res) => {
  try {
    const { userId, amount } = req.body;
    if (!userId || !amount) {
      return res.status(400).json({ success: false, error: "Missing required fields" });
    }
    const user = detailsDb.addCredits(parseInt(userId), parseFloat(amount));
    return res.json({ success: true, message: "Credits added successfully!", balance: user.balance });
  } catch (error) {
    console.error("Add credits error:", error);
    return res.status(500).json({ success: false, error: "Server error" });
  }
});

// POST /api/profile/verify-identity - Submit identity verification
router.post("/verify-identity", (req, res) => {
  try {
    const { userId, fullName, dob, idNumber, idFrontImage, idBackImage, selfieImage } = req.body;

    if (!userId || !fullName) {
      return res.status(400).json({ success: false, error: "User ID and Full Name are required" });
    }

    const verificationId = detailsDb.saveIdentityVerification({
      userId: parseInt(userId, 10),
      fullName: String(fullName).trim(),
      dob: String(dob || "").trim(),
      idNumber: String(idNumber || "").trim(),
      idFrontImage: idFrontImage || "",
      idBackImage: idBackImage || "",
      selfieImage: selfieImage || "",
    });

    return res.status(201).json({
      success: true,
      message: "Identity verification request submitted successfully!",
      verificationId,
    });
  } catch (error) {
    console.error("Submit verify identity error:", error);
    return res.status(500).json({ success: false, error: "Server error" });
  }
});

// GET /api/profile/verification-status/:userId - Get latest verification request status for user
router.get("/verification-status/:userId", (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    const record = detailsDb.getUserLatestIdentityVerification(userId);
    return res.json({ success: true, verification: record || null });
  } catch (error) {
    console.error("Get verification status error:", error);
    return res.status(500).json({ success: false, error: "Server error" });
  }
});

// GET /api/admin/identity-verifications - Get pending identity verification requests
router.get("/admin/identity-verifications", (req, res) => {
  try {
    const queue = detailsDb.getAllPendingIdentityVerifications();
    return res.json({ success: true, queue });
  } catch (error) {
    console.error("Admin identity verifications queue error:", error);
    return res.status(500).json({ success: false, error: "Server error" });
  }
});

// POST /api/admin/verify-identity - Approve or Reject identity verification request
router.post("/admin/verify-identity", (req, res) => {
  try {
    const { verificationId, action, reason } = req.body; // action: 'approve' | 'reject'
    if (!verificationId || !action) {
      return res.status(400).json({ success: false, error: "Missing verification ID or action" });
    }

    const status = action === 'approve' ? 'approved' : 'rejected';
    detailsDb.updateIdentityVerificationStatus(parseInt(verificationId, 10), status, reason || "");
    return res.json({ success: true, message: `Identity request ${status} successfully!` });
  } catch (error) {
    console.error("Admin verify identity error:", error);
    return res.status(500).json({ success: false, error: error.message || "Server error" });
  }
});

// GET /api/profile/:userId/summary - Get complete profile ecosystem summary
router.get("/:userId/summary", (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    if (!userId) {
      return res.status(400).json({ success: false, error: "Invalid user ID" });
    }

    const allUsers = detailsDb.getAllUsers();
    const user = allUsers.find(u => u.id === userId);
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const stats = detailsDb.getUserStats(userId);
    const earningsSummary = detailsDb.getSellerEarningsSummary(userId);
    const payoutAccount = detailsDb.getPayoutAccountByUserId(userId);
    const purchases = detailsDb.getUserPurchasesDetailed(userId);
    const sales = detailsDb.getUserSalesDetailed(userId);
    const transactions = detailsDb.getUserTransactions(userId);

    return res.json({
      success: true,
      user: {
        id: user.id,
        fullName: user.fullName,
        username: user.username,
        email: user.email,
        phoneNumber: user.phoneNumber,
        bio: user.bio || "",
        profilePhoto: user.profilePhoto || "",
        balance: user.balance || 0,
        isVerified: user.isVerified || 0,
        role: user.role || 'user'
      },
      stats: {
        followers: 12,
        following: 8,
        couponsOffered: stats.offered || sales.length || 0,
        couponsPurchased: stats.purchased || purchases.length || 0
      },
      wallet: {
        credits: user.balance || 0,
        availableEarnings: earningsSummary.available || 0,
        pendingEarnings: earningsSummary.pending || 0,
        totalEarned: earningsSummary.totalEarned || 0,
        totalWithdrawn: earningsSummary.totalWithdrawn || 0
      },
      payoutAccount: payoutAccount ? {
        id: payoutAccount.id,
        accountHolderName: payoutAccount.accountHolderName,
        bankName: payoutAccount.bankName,
        accountNumberMasked: payoutAccount.accountNumber ? `••••${payoutAccount.accountNumber.slice(-4)}` : "",
        ifscCode: payoutAccount.ifscCode,
        upiId: payoutAccount.upiId,
        payoutMethod: payoutAccount.payoutMethod,
        status: payoutAccount.status,
        rejectionReason: payoutAccount.rejectionReason || ""
      } : null,
      purchasesCount: purchases.length,
      salesCount: sales.length,
      recentTransactions: transactions.slice(0, 5)
    });
  } catch (error) {
    console.error("Profile summary error:", error);
    return res.status(500).json({ success: false, error: "Server error" });
  }
});

// GET /api/profile/payout-account/:userId - Get payout account details
router.get("/payout-account/:userId", (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    const account = detailsDb.getPayoutAccountByUserId(userId);
    return res.json({ success: true, account: account || null });
  } catch (error) {
    console.error("Get payout account error:", error);
    return res.status(500).json({ success: false, error: "Server error" });
  }
});

// POST /api/profile/payout-account - Save/update payout account (status reverts to PENDING VERIFICATION)
router.post("/payout-account", (req, res) => {
  try {
    const { userId, accountHolderName, bankName, accountNumber, ifscCode, upiId, payoutMethod } = req.body;
    if (!userId || !accountHolderName || !bankName || !accountNumber || !ifscCode) {
      return res.status(400).json({ success: false, error: "Account holder name, bank name, account number, and IFSC code are required." });
    }

    const account = detailsDb.saveOrUpdatePayoutAccount(parseInt(userId, 10), {
      accountHolderName,
      bankName,
      accountNumber,
      ifscCode,
      upiId: upiId || "",
      payoutMethod: payoutMethod || "BANK_TRANSFER"
    });

    return res.json({ success: true, message: "Payout details submitted for verification successfully!", account });
  } catch (error) {
    console.error("Save payout account error:", error);
    return res.status(500).json({ success: false, error: error.message || "Server error" });
  }
});

// GET /api/profile/seller-earnings/:userId - Get seller earnings breakdown and history
router.get("/seller-earnings/:userId", (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    const summary = detailsDb.getSellerEarningsSummary(userId);
    const list = detailsDb.getSellerEarningsList(userId, req.query.status);
    return res.json({ success: true, summary, earnings: list });
  } catch (error) {
    console.error("Get seller earnings error:", error);
    return res.status(500).json({ success: false, error: "Server error" });
  }
});

// POST /api/profile/convert-earnings-to-credits - Convert seller earnings to C credits (1:1 ratio)
router.post("/convert-earnings-to-credits", (req, res) => {
  try {
    const { userId, amount } = req.body;
    if (!userId || !amount || amount <= 0) {
      return res.status(400).json({ success: false, error: "Valid user ID and amount are required." });
    }

    detailsDb.convertSellerEarningToCredits(parseInt(userId, 10), parseFloat(amount));
    const summary = detailsDb.getSellerEarningsSummary(parseInt(userId, 10));
    return res.json({ success: true, message: `Successfully converted ₹${amount} into credits!`, summary });
  } catch (error) {
    console.error("Convert earnings to credits error:", error);
    return res.status(400).json({ success: false, error: error.message || "Server error" });
  }
});

// POST /api/profile/request-payout - Request monetary payout of seller earnings
router.post("/request-payout", (req, res) => {
  try {
    const { userId, amount } = req.body;
    if (!userId || !amount || amount <= 0) {
      return res.status(400).json({ success: false, error: "Valid user ID and amount are required." });
    }

    const payoutId = detailsDb.requestSellerPayout(parseInt(userId, 10), parseFloat(amount));
    return res.json({ success: true, message: "Payout request submitted successfully!", payoutId });
  } catch (error) {
    console.error("Request seller payout error:", error);
    return res.status(400).json({ success: false, error: error.message || "Server error" });
  }
});

// GET /api/profile/transactions/:userId - Get user transaction ledger
router.get("/transactions/:userId", (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    const transactions = detailsDb.getUserTransactions(userId, req.query.type);
    return res.json({ success: true, transactions });
  } catch (error) {
    console.error("Get transactions error:", error);
    return res.status(500).json({ success: false, error: "Server error" });
  }
});

// GET /api/profile/sales/:userId - Get seller sales history
router.get("/sales/:userId", (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    const sales = detailsDb.getUserSalesDetailed(userId);
    return res.json({ success: true, sales });
  } catch (error) {
    console.error("Get sales error:", error);
    return res.status(500).json({ success: false, error: "Server error" });
  }
});

// GET /api/profile/purchases/:userId - Get buyer purchases history
router.get("/purchases/:userId", (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    const purchases = detailsDb.getUserPurchasesDetailed(userId);
    return res.json({ success: true, purchases });
  } catch (error) {
    console.error("Get purchases error:", error);
    return res.status(500).json({ success: false, error: "Server error" });
  }
});

// POST /api/profile/buy-coupon - Purchase coupon and generate seller earning
router.post("/buy-coupon", (req, res) => {
  try {
    const { couponId, buyerId } = req.body;
    if (!couponId || !buyerId) {
      return res.status(400).json({ success: false, error: "Coupon ID and Buyer ID are required." });
    }

    const orderId = detailsDb.createOrderWithEarnings(parseInt(couponId, 10), parseInt(buyerId, 10));
    return res.json({ success: true, message: "Coupon purchased successfully!", orderId });
  } catch (error) {
    console.error("Buy coupon error:", error);
    return res.status(400).json({ success: false, error: error.message || "Server error" });
  }
});

// GET /api/admin/payout-accounts - Get seller payout account verifications summary and queue
router.get("/admin/payout-accounts", (req, res) => {
  try {
    const summary = detailsDb.getAllPayoutAccountsSummary();
    return res.json({
      success: true,
      queue: summary.queue,
      allAccounts: summary.allAccounts,
      pendingCount: summary.pendingCount,
      verifiedCount: summary.verifiedCount,
      rejectedCount: summary.rejectedCount
    });
  } catch (error) {
    console.error("Admin payout accounts queue error:", error);
    return res.status(500).json({ success: false, error: "Server error" });
  }
});

// POST /api/admin/verify-payout-account - Approve (VERIFIED) or Reject (REJECTED) seller payout account
router.post("/admin/verify-payout-account", (req, res) => {
  try {
    const { accountId, action, reason } = req.body; // action: 'approve' | 'reject'
    if (!accountId || !action) {
      return res.status(400).json({ success: false, error: "Account ID and action are required." });
    }

    const status = action === 'approve' ? 'VERIFIED' : 'REJECTED';
    detailsDb.updatePayoutAccountStatus(parseInt(accountId, 10), status, "admin", reason || "");
    return res.json({ success: true, message: `Payout account ${status.toLowerCase()} successfully!` });
  } catch (error) {
    console.error("Verify payout account error:", error);
    return res.status(500).json({ success: false, error: error.message || "Server error" });
  }
});

module.exports = router;

