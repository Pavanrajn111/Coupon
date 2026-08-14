const Database = require("better-sqlite3");
const path = require("path");
const bcrypt = require("bcryptjs");

const DB_PATH = path.join(__dirname, "details.db");

let db;

const getDb = () => {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
  }
  return db;
};

const ensureTableColumn = (database, tableName, columnName, definition) => {
  const columns = database.prepare(`PRAGMA table_info(${tableName})`).all();
  const hasColumn = columns.some((column) => column.name === columnName);
  if (!hasColumn) {
    database.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
};

const initDetailsDb = () => {
  const database = getDb();

  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fullName TEXT NOT NULL,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      phoneNumber TEXT NOT NULL,
      password TEXT NOT NULL,
      isVerified INTEGER DEFAULT 0,
      role TEXT DEFAULT 'user',
      status TEXT DEFAULT 'active',
      createdAt TEXT DEFAULT (datetime('now')),
      updatedAt TEXT DEFAULT (datetime('now'))
    )
  `);

  ensureTableColumn(database, "users", "bio", "TEXT DEFAULT ''");
  ensureTableColumn(database, "users", "profilePhoto", "TEXT DEFAULT ''");
  ensureTableColumn(database, "users", "balance", "REAL DEFAULT 0.0");
  ensureTableColumn(database, "users", "reservedBalance", "REAL DEFAULT 0.0");

  database.exec(`
    CREATE TABLE IF NOT EXISTS coupons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      brand TEXT NOT NULL,
      category TEXT NOT NULL,
      code TEXT NOT NULL,
      expiryDate TEXT NOT NULL,
      originalValue REAL NOT NULL,
      askingPrice REAL NOT NULL,
      description TEXT DEFAULT '',
      status TEXT DEFAULT 'pending',
      createdAt TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (userId) REFERENCES users(id)
    )
  `);

  // Add image column to coupons table if it doesn't exist
  ensureTableColumn(database, "coupons", "image", "TEXT DEFAULT ''");
  ensureTableColumn(database, "coupons", "status", "TEXT DEFAULT 'pending'");
  ensureTableColumn(database, "users", "balance", "REAL DEFAULT 0.0");

  database.exec(`
    CREATE TABLE IF NOT EXISTS purchases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      couponId INTEGER NOT NULL,
      buyerId INTEGER NOT NULL,
      sellerId INTEGER NOT NULL,
      amount REAL NOT NULL,
      purchasedAt TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (couponId) REFERENCES coupons(id),
      FOREIGN KEY (buyerId) REFERENCES users(id),
      FOREIGN KEY (sellerId) REFERENCES users(id)
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS payouts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      amount REAL NOT NULL,
      bankDetails TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      createdAt TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (userId) REFERENCES users(id)
    )
  `);

  // Preserve topups data across restarts (no DROP TABLE)
  database.exec(`
    CREATE TABLE IF NOT EXISTS topups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      requestId TEXT UNIQUE,
      userId INTEGER NOT NULL,
      userFullName TEXT,
      username TEXT,
      email TEXT,
      packageName TEXT,
      requestedCredits REAL NOT NULL,
      purchaseAmount REAL NOT NULL,
      discount REAL DEFAULT 0,
      totalAmount REAL NOT NULL,
      paymentMethod TEXT NOT NULL,
      paymentStatus TEXT DEFAULT 'Pending',
      requestStatus TEXT DEFAULT 'Pending',
      paymentReference TEXT,
      rejectionReason TEXT,
      approvedAt TEXT,
      approvedBy TEXT,
      createdAt TEXT DEFAULT (datetime('now')),
      updatedAt TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (userId) REFERENCES users(id)
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS identity_verifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      fullName TEXT NOT NULL,
      dob TEXT DEFAULT '',
      idNumber TEXT DEFAULT '',
      idFrontImage TEXT DEFAULT '',
      idBackImage TEXT DEFAULT '',
      selfieImage TEXT DEFAULT '',
      status TEXT DEFAULT 'pending',
      rejectionReason TEXT DEFAULT '',
      submittedAt TEXT DEFAULT (datetime('now')),
      updatedAt TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (userId) REFERENCES users(id)
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS disputes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      orderId INTEGER,
      reason TEXT NOT NULL,
      description TEXT DEFAULT '',
      status TEXT DEFAULT 'new',
      resolvedAt TEXT,
      resolvedBy TEXT,
      createdAt TEXT DEFAULT (datetime('now')),
      updatedAt TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (userId) REFERENCES users(id)
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS payout_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL UNIQUE,
      accountHolderName TEXT NOT NULL,
      bankName TEXT NOT NULL,
      accountNumber TEXT NOT NULL,
      ifscCode TEXT NOT NULL,
      upiId TEXT DEFAULT '',
      payoutMethod TEXT DEFAULT 'BANK_TRANSFER',
      status TEXT DEFAULT 'PENDING VERIFICATION',
      rejectionReason TEXT DEFAULT '',
      verifiedAt TEXT,
      verifiedBy TEXT,
      createdAt TEXT DEFAULT (datetime('now')),
      updatedAt TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (userId) REFERENCES users(id)
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      orderNumber TEXT UNIQUE NOT NULL,
      couponId INTEGER NOT NULL,
      buyerId INTEGER NOT NULL,
      sellerId INTEGER NOT NULL,
      grossAmount REAL NOT NULL,
      platformFee REAL NOT NULL,
      sellerNetAmount REAL NOT NULL,
      paymentStatus TEXT DEFAULT 'PAID',
      orderStatus TEXT DEFAULT 'COMPLETED',
      disputeId INTEGER,
      createdAt TEXT DEFAULT (datetime('now')),
      updatedAt TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (couponId) REFERENCES coupons(id),
      FOREIGN KEY (buyerId) REFERENCES users(id),
      FOREIGN KEY (sellerId) REFERENCES users(id)
    )
  `);

  ensureTableColumn(database, "orders", "verificationStatus", "TEXT DEFAULT 'PENDING'");
  ensureTableColumn(database, "orders", "couponReleased", "INTEGER DEFAULT 0");
  ensureTableColumn(database, "orders", "releasedAt", "TEXT DEFAULT ''");
  ensureTableColumn(database, "orders", "redemptionWindowEndsAt", "TEXT DEFAULT ''");
  ensureTableColumn(database, "orders", "buyerConfirmedAt", "TEXT DEFAULT ''");
  ensureTableColumn(database, "orders", "settlementEligibleAt", "TEXT DEFAULT ''");
  ensureTableColumn(database, "orders", "redemptionStatus", "TEXT DEFAULT 'PENDING'");
  ensureTableColumn(database, "orders", "disputeStatus", "TEXT DEFAULT 'NONE'");
  ensureTableColumn(database, "orders", "rejectionReason", "TEXT DEFAULT ''");

  database.exec(`
    CREATE TABLE IF NOT EXISTS credit_reservations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      orderId INTEGER NOT NULL,
      buyerId INTEGER NOT NULL,
      reservedAmount REAL NOT NULL,
      status TEXT DEFAULT 'ACTIVE',
      reservedAt TEXT DEFAULT (datetime('now')),
      consumedAt TEXT,
      refundedAt TEXT,
      FOREIGN KEY (orderId) REFERENCES orders(id),
      FOREIGN KEY (buyerId) REFERENCES users(id)
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS seller_earnings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sellerId INTEGER NOT NULL,
      orderId INTEGER NOT NULL UNIQUE,
      grossAmount REAL NOT NULL,
      platformFee REAL NOT NULL,
      sellerNetAmount REAL NOT NULL,
      status TEXT DEFAULT 'PENDING',
      createdAt TEXT DEFAULT (datetime('now')),
      updatedAt TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (sellerId) REFERENCES users(id),
      FOREIGN KEY (orderId) REFERENCES orders(id)
    )
  `);

  ensureTableColumn(database, "seller_earnings", "feeRate", "REAL DEFAULT 5.0");
  ensureTableColumn(database, "seller_earnings", "availableAt", "TEXT DEFAULT ''");

  database.exec(`
    CREATE TABLE IF NOT EXISTS payout_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      payoutNumber TEXT UNIQUE NOT NULL,
      sellerId INTEGER NOT NULL,
      amount REAL NOT NULL,
      payoutMethod TEXT NOT NULL,
      payoutAccountId INTEGER NOT NULL,
      status TEXT DEFAULT 'REQUESTED',
      failureReason TEXT DEFAULT '',
      providerPayoutId TEXT DEFAULT '',
      requestedAt TEXT DEFAULT (datetime('now')),
      processedAt TEXT,
      FOREIGN KEY (sellerId) REFERENCES users(id),
      FOREIGN KEY (payoutAccountId) REFERENCES payout_accounts(id)
    )
  `);

  ensureTableColumn(database, "payout_requests", "payoutReference", "TEXT DEFAULT ''");
  ensureTableColumn(database, "payout_requests", "processedBy", "TEXT DEFAULT ''");

  database.exec(`
    CREATE TABLE IF NOT EXISTS payout_request_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      payoutRequestId INTEGER NOT NULL,
      earningId INTEGER NOT NULL,
      amount REAL NOT NULL,
      FOREIGN KEY (payoutRequestId) REFERENCES payout_requests(id),
      FOREIGN KEY (earningId) REFERENCES seller_earnings(id)
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transactionId TEXT UNIQUE NOT NULL,
      userId INTEGER NOT NULL,
      orderId INTEGER,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT NOT NULL,
      balanceBefore REAL NOT NULL,
      balanceAfter REAL NOT NULL,
      status TEXT DEFAULT 'COMPLETED',
      description TEXT DEFAULT '',
      createdAt TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (userId) REFERENCES users(id)
    )
  `);

  ensureTableColumn(database, "transactions", "referenceType", "TEXT DEFAULT 'GENERAL'");
  ensureTableColumn(database, "transactions", "referenceId", "TEXT DEFAULT ''");

  database.exec(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      adminUsername TEXT NOT NULL,
      action TEXT NOT NULL,
      targetType TEXT NOT NULL,
      targetId INTEGER NOT NULL,
      details TEXT DEFAULT '',
      createdAt TEXT DEFAULT (datetime('now'))
    )
  `);

  // Create indexes for faster lookups
  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_coupons_userId ON coupons(userId);
    CREATE INDEX IF NOT EXISTS idx_coupons_status ON coupons(status);
    CREATE INDEX IF NOT EXISTS idx_purchases_buyerId ON purchases(buyerId);
    CREATE INDEX IF NOT EXISTS idx_purchases_sellerId ON purchases(sellerId);
    CREATE INDEX IF NOT EXISTS idx_payouts_userId ON payouts(userId);
    CREATE INDEX IF NOT EXISTS idx_payouts_status ON payouts(status);
    CREATE INDEX IF NOT EXISTS idx_topups_userId ON topups(userId);
    CREATE INDEX IF NOT EXISTS idx_topups_status ON topups(requestStatus);
    CREATE INDEX IF NOT EXISTS idx_topups_approvedAt ON topups(approvedAt);
    CREATE INDEX IF NOT EXISTS idx_identity_status ON identity_verifications(status);
    CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes(status);
    CREATE INDEX IF NOT EXISTS idx_payout_accounts_userId ON payout_accounts(userId);
    CREATE INDEX IF NOT EXISTS idx_orders_buyerId ON orders(buyerId);
    CREATE INDEX IF NOT EXISTS idx_orders_sellerId ON orders(sellerId);
    CREATE INDEX IF NOT EXISTS idx_seller_earnings_sellerId ON seller_earnings(sellerId);
    CREATE INDEX IF NOT EXISTS idx_payout_requests_sellerId ON payout_requests(sellerId);
    CREATE INDEX IF NOT EXISTS idx_transactions_userId ON transactions(userId);
  `);

  // Ensure initial verified payout account for Pavan Raj N (userId = 1)
  const existingAcc = database.prepare("SELECT * FROM payout_accounts WHERE userId = 1").get();
  if (!existingAcc) {
    database.prepare(`
      INSERT INTO payout_accounts (userId, accountHolderName, bankName, accountNumber, ifscCode, upiId, payoutMethod, status, verifiedBy, verifiedAt)
      VALUES (1, 'Pavan Raj N', 'HDFC Bank', '501002349182', 'HDFC0001234', 'pavanraj@upi', 'BANK_TRANSFER', 'VERIFIED', 'admin', datetime('now'))
    `).run();
  } else {
    database.prepare(`
      UPDATE payout_accounts
      SET status = 'VERIFIED', verifiedBy = 'admin', verifiedAt = datetime('now')
      WHERE userId = 1
    `).run();
  }

  console.log("SQLite details.db initialized successfully.");
  return database;
};

const createUser = (userData) => {
  const database = getDb();
  const { fullName, username, email, phoneNumber, password } = userData;

  const stmt = database.prepare(`
    INSERT INTO users (fullName, username, email, phoneNumber, password)
    VALUES (?, ?, ?, ?, ?)
  `);

  const result = stmt.run(fullName, username, email, phoneNumber, password);
  return result.lastInsertRowid;
};

const findUserByUsernameOrEmail = (usernameOrEmail) => {
  const database = getDb();
  const stmt = database.prepare(`
    SELECT * FROM users WHERE username = ? OR email = ?
  `);
  return stmt.get(usernameOrEmail.toLowerCase(), usernameOrEmail.toLowerCase());
};

const findUserByUsername = (username) => {
  const database = getDb();
  const stmt = database.prepare("SELECT * FROM users WHERE username = ?");
  return stmt.get((username || "").trim().toLowerCase());
};

const findUserByEmail = (email) => {
  const database = getDb();
  const stmt = database.prepare("SELECT * FROM users WHERE email = ?");
  return stmt.get(email.toLowerCase());
};

const verifyPassword = async (plainPassword, hashedPassword) => {
  return bcrypt.compare(plainPassword, hashedPassword);
};

const getAllUsers = () => {
  const database = getDb();
  const stmt = database.prepare(
    "SELECT id, fullName, username, email, phoneNumber, isVerified, role, status, bio, profilePhoto, balance, createdAt, updatedAt FROM users",
  );
  return stmt.all();
};

const updateUserProfile = (userId, updates = {}) => {
  const database = getDb();
  const currentUser = database
    .prepare("SELECT * FROM users WHERE id = ?")
    .get(userId);

  if (!currentUser) {
    return { success: false, errors: { general: "User not found" } };
  }

  const nextFullName = (updates.fullName !== undefined ? updates.fullName : (currentUser.fullName || "")).trim();
  const nextUsername = (updates.username !== undefined ? updates.username : (currentUser.username || "")).trim().toLowerCase();
  const nextPhone = (updates.phoneNumber !== undefined ? updates.phoneNumber : (currentUser.phoneNumber || "")).trim();
  const nextBio = updates.bio !== undefined ? updates.bio : (currentUser.bio || "");
  const nextPhoto = updates.profilePhoto !== undefined ? updates.profilePhoto : (currentUser.profilePhoto || "");

  if (!nextFullName || !nextUsername) {
    return {
      success: false,
      errors: { fullName: "Full name is required", username: "Username is required" },
    };
  }

  const existingByUsername = findUserByUsername(nextUsername);
  if (existingByUsername && existingByUsername.id !== userId) {
    return { success: false, errors: { username: "Username already taken" } };
  }

  const stmt = database.prepare(`
    UPDATE users
    SET fullName = ?, username = ?, phoneNumber = ?, bio = ?, profilePhoto = ?, updatedAt = datetime('now')
    WHERE id = ?
  `);
  stmt.run(nextFullName, nextUsername, nextPhone, nextBio, nextPhoto, userId);

  return {
    success: true,
    user: {
      id: currentUser.id,
      fullName: nextFullName,
      username: nextUsername,
      email: currentUser.email,
      phoneNumber: nextPhone,
      bio: nextBio,
      profilePhoto: nextPhoto,
      role: currentUser.role,
      isVerified: currentUser.isVerified,
      balance: currentUser.balance || 0.0,
      createdAt: currentUser.createdAt,
    },
  };
};


// ===== COUPON FUNCTIONS =====

const createCoupon = (couponData) => {
  const database = getDb();
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
  } = couponData;
  const stmt = database.prepare(`
    INSERT INTO coupons (userId, brand, category, code, expiryDate, originalValue, askingPrice, description, image)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    userId,
    brand,
    category,
    code,
    expiryDate,
    originalValue,
    askingPrice,
    description || "",
    image || "",
  );
  return result.lastInsertRowid;
};

const getCouponsByUserId = (userId) => {
  const database = getDb();
  const stmt = database.prepare(
    "SELECT * FROM coupons WHERE userId = ? AND status = ? ORDER BY createdAt DESC",
  );
  return stmt.all(userId, "active");
};

const getAllActiveCoupons = () => {
  const database = getDb();
  const stmt = database.prepare(`
    SELECT c.*, u.username, u.fullName FROM coupons c
    JOIN users u ON c.userId = u.id
    WHERE c.status = 'active'
    ORDER BY c.createdAt DESC
  `);
  return stmt.all();
};

const getCouponById = (couponId) => {
  const database = getDb();
  const stmt = database.prepare(`
    SELECT c.*, u.username, u.fullName FROM coupons c
    JOIN users u ON c.userId = u.id
    WHERE c.id = ?
  `);
  return stmt.get(couponId);
};

const updateCouponStatus = (couponId, status) => {
  const database = getDb();
  const stmt = database.prepare("UPDATE coupons SET status = ? WHERE id = ?");
  return stmt.run(status, couponId);
};

// ===== PURCHASE FUNCTIONS =====

const createPurchase = (purchaseData) => {
  const database = getDb();
  const { couponId, buyerId, sellerId, amount } = purchaseData;
  const stmt = database.prepare(`
    INSERT INTO purchases (couponId, buyerId, sellerId, amount)
    VALUES (?, ?, ?, ?)
  `);
  return stmt.run(couponId, buyerId, sellerId, amount);
};

const getPurchasesByBuyerId = (buyerId) => {
  const database = getDb();
  const stmt = database.prepare(`
    SELECT p.*, c.brand, c.category, c.code, c.originalValue, u.username as sellerUsername
    FROM purchases p
    JOIN coupons c ON p.couponId = c.id
    JOIN users u ON p.sellerId = u.id
    WHERE p.buyerId = ?
    ORDER BY p.purchasedAt DESC
  `);
  return stmt.all(buyerId);
};

const getPurchasesBySellerId = (sellerId) => {
  const database = getDb();
  const stmt = database.prepare(`
    SELECT p.*, c.brand, c.category, c.code, c.originalValue, u.username as buyerUsername
    FROM purchases p
    JOIN coupons c ON p.couponId = c.id
    JOIN users u ON p.buyerId = u.id
    WHERE p.sellerId = ?
    ORDER BY p.purchasedAt DESC
  `);
  return stmt.all(sellerId);
};

// ===== STATS FUNCTIONS =====

const getUserStats = (userId) => {
  const database = getDb();
  const offered = database
    .prepare("SELECT COUNT(*) as count FROM coupons WHERE userId = ?")
    .get(userId);
  const purchased = database
    .prepare("SELECT COUNT(*) as count FROM purchases WHERE buyerId = ?")
    .get(userId);
  const sold = database
    .prepare("SELECT COUNT(*) as count FROM purchases WHERE sellerId = ?")
    .get(userId);
  return {
    offered: offered.count,
    purchased: purchased.count,
    sold: sold.count,
  };
};

// ===== PAYOUT & ADMIN FUNCTIONS =====

const createPayout = (payoutData) => {
  const database = getDb();
  const { userId, amount, bankDetails } = payoutData;
  
  // Verify user has sufficient balance
  const user = database.prepare("SELECT balance FROM users WHERE id = ?").get(userId);
  if (!user || user.balance < amount) {
    throw new Error("Insufficient balance");
  }
  
  // Deduct from user balance
  database.prepare("UPDATE users SET balance = balance - ? WHERE id = ?").run(amount, userId);
  
  const stmt = database.prepare(`
    INSERT INTO payouts (userId, amount, bankDetails)
    VALUES (?, ?, ?)
  `);
  const result = stmt.run(userId, amount, bankDetails);
  return result.lastInsertRowid;
};

const getPayoutsByUserId = (userId) => {
  const database = getDb();
  const stmt = database.prepare("SELECT * FROM payouts WHERE userId = ? ORDER BY createdAt DESC");
  return stmt.all(userId);
};

const getAllPendingPayouts = () => {
  const database = getDb();
  const stmt = database.prepare(`
    SELECT p.*, u.username, u.fullName 
    FROM payouts p
    JOIN users u ON p.userId = u.id
    WHERE p.status = 'pending'
    ORDER BY p.createdAt DESC
  `);
  return stmt.all();
};

const updatePayoutStatus = (payoutId, status) => {
  const database = getDb();
  
  // If rejected, refund the user
  if (status === 'rejected') {
    const payout = database.prepare("SELECT userId, amount, status FROM payouts WHERE id = ?").get(payoutId);
    if (payout && payout.status === 'pending') {
      database.prepare("UPDATE users SET balance = balance + ? WHERE id = ?").run(payout.amount, payout.userId);
    }
  }
  
  const stmt = database.prepare("UPDATE payouts SET status = ? WHERE id = ?");
  return stmt.run(status, payoutId);
};

const getAllPendingCoupons = () => {
  const database = getDb();
  const stmt = database.prepare(`
    SELECT c.*, u.username, u.fullName
    FROM coupons c
    JOIN users u ON c.userId = u.id
    WHERE c.status = 'pending'
    ORDER BY c.createdAt DESC
  `);
  return stmt.all();
};

const approveCoupon = (couponId) => {
  const database = getDb();
  // Get the coupon details
  const coupon = database.prepare("SELECT userId, askingPrice, status FROM coupons WHERE id = ?").get(couponId);
  if (!coupon) throw new Error("Coupon not found");
  if (coupon.status !== 'pending') return { success: false, message: "Coupon is not pending" };
  
  // Mark coupon as active ONLY. Do NOT credit seller balance.
  database.prepare("UPDATE coupons SET status = 'active' WHERE id = ?").run(couponId);
  
  return { success: true };
};

const getAdminStats = () => {
  const database = getDb();
  const pendingCoupons = database.prepare("SELECT COUNT(*) as count FROM coupons WHERE status = 'pending'").get().count;
  const pendingPayouts = database.prepare("SELECT COUNT(*) as count FROM payout_requests WHERE status IN ('REQUESTED', 'PROCESSING')").get().count;
  const pendingOrderVerifications = database.prepare("SELECT COUNT(*) as count FROM orders WHERE verificationStatus = 'PENDING'").get().count;
  const activeSellers = database.prepare("SELECT COUNT(DISTINCT userId) as count FROM coupons").get().count;
  const voucherVolume = pendingCoupons;

  // Count active/new disputes
  const disputes = database.prepare(
    "SELECT COUNT(*) as count FROM disputes WHERE status = 'new' OR status = 'open'"
  ).get().count;

  // Daily total approved in ₹ (purchaseAmount, NOT requestedCredits)
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const dailyApprovedAmount = database.prepare(
    "SELECT COALESCE(SUM(purchaseAmount), 0) as total FROM topups WHERE requestStatus = 'Approved' AND approvedAt >= ?"
  ).get(todayStart).total;

  return {
    pendingCoupons,
    pendingPayouts,
    pendingOrderVerifications,
    activeSellers,
    voucherVolume,
    disputes,
    trustScore: 95,
    dailyApprovedAmount
  };
};

const getAllDisputes = () => {
  const database = getDb();
  return database.prepare(`
    SELECT d.id as disputeId, d.orderId, d.reason, d.description, d.status, d.createdAt, d.resolvedAt, d.resolvedBy,
           o.orderNumber, o.grossAmount, o.platformFee, o.sellerNetAmount, o.orderStatus, o.verificationStatus, o.redemptionStatus,
           c.brand, c.code,
           b.id as buyerId, b.username as buyerUsername, b.fullName as buyerName,
           s.id as sellerId, s.username as sellerUsername, s.fullName as sellerName,
           se.id as sellerEarningId, se.status as earningStatus
    FROM disputes d
    JOIN orders o ON d.orderId = o.id
    JOIN coupons c ON o.couponId = c.id
    JOIN users b ON d.userId = b.id
    JOIN users s ON o.sellerId = s.id
    LEFT JOIN seller_earnings se ON se.orderId = o.id
    ORDER BY d.id DESC
  `).all();
};

const getAdminPaymentStats = () => {
  const database = getDb();

  const pendingReviews = database.prepare(
    "SELECT COUNT(*) as count FROM topups WHERE requestStatus = 'Pending'"
  ).get().count;

  // Daily total approved in ₹ (uses purchaseAmount, NOT requestedCredits)
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const dailyApprovedAmount = database.prepare(
    "SELECT COALESCE(SUM(purchaseAmount), 0) as total FROM topups WHERE requestStatus = 'Approved' AND approvedAt >= ?"
  ).get(todayStart).total;

  return { pendingReviews, dailyApprovedAmount };
};

const addCredits = (userId, amount) => {
  const database = getDb();
  database.prepare("UPDATE users SET balance = balance + ? WHERE id = ?").run(amount, userId);
  const allUsers = getAllUsers();
  const updatedUser = allUsers.find(u => u.id === userId);
  return updatedUser;
};

const createTopup = (topupData) => {
  const database = getDb();
  const {
    requestId,
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
    paymentStatus,
    requestStatus,
    paymentReference
  } = topupData;

  const stmt = database.prepare(`
    INSERT INTO topups (
      requestId, userId, userFullName, username, email, packageName,
      requestedCredits, purchaseAmount, discount, totalAmount,
      paymentMethod, paymentStatus, requestStatus, paymentReference,
      createdAt, updatedAt
    ) VALUES (
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?,
      datetime('now'), datetime('now')
    )
  `);

  const generatedId = `CPX-PAY-${Date.now().toString(36).toUpperCase()}`;

  const result = stmt.run(
    requestId || generatedId,
    userId,
    userName || "",
    username || "",
    email || "",
    packageName || "Custom Amount",
    requestedCredits,
    purchaseAmount,
    discount || 0,
    totalAmount,
    paymentMethod,
    paymentStatus || "Pending",
    requestStatus || "Pending",
    paymentReference || ""
  );
  return result.lastInsertRowid;
};

const getAllPendingTopups = (filterMethod = null) => {
  const database = getDb();
  let query = `
    SELECT id, requestId, userId, userFullName AS userName, username, email, packageName,
           requestedCredits, purchaseAmount, discount, totalAmount, paymentMethod,
           paymentStatus, requestStatus, paymentReference, rejectionReason,
           approvedAt, approvedBy, createdAt, updatedAt
    FROM topups
    WHERE requestStatus = 'Pending'
  `;
  const params = [];

  if (filterMethod && filterMethod !== 'all') {
    query += ` AND LOWER(paymentMethod) LIKE ?`;
    params.push(`%${filterMethod.toLowerCase()}%`);
  }

  query += ` ORDER BY createdAt DESC`;
  const rows = database.prepare(query).all(...params);

  // Deduplicate duplicate requests for the same payment submission
  const seenSignatures = new Set();
  const uniqueRows = [];

  for (const r of rows) {
    const signature = `${r.userId}_${r.requestedCredits}_${r.totalAmount}_${(r.paymentMethod || "").toUpperCase()}_${(r.paymentReference || "").trim()}`;
    if (!seenSignatures.has(signature)) {
      seenSignatures.add(signature);
      uniqueRows.push(r);
    }
  }

  return uniqueRows;
};

const getTopupById = (id) => {
  const database = getDb();
  return database.prepare(`
    SELECT id, requestId, userId, userFullName AS userName, username, email, packageName,
           requestedCredits, purchaseAmount, discount, totalAmount, paymentMethod,
           paymentStatus, requestStatus, paymentReference, rejectionReason,
           approvedAt, approvedBy, createdAt, updatedAt
    FROM topups WHERE id = ?
  `).get(id);
};

const updateTopupStatus = (topupId, status, adminUser = "admin", reason = "") => {
  const database = getDb();
  
  // Safe checks using sequential updates
  const topup = database.prepare("SELECT * FROM topups WHERE id = ?").get(topupId);
  if (!topup) {
    throw new Error("Payment request not found.");
  }
  if (topup.requestStatus !== 'Pending') {
    throw new Error("Payment request is already processed.");
  }

  const signature = `${topup.userId}_${topup.requestedCredits}_${topup.totalAmount}_${(topup.paymentMethod || "").toUpperCase()}_${(topup.paymentReference || "").trim()}`;

  if (status === 'Approved') {
    // Add credits to user wallet balance (once)
    database.prepare("UPDATE users SET balance = balance + ? WHERE id = ?").run(topup.requestedCredits, topup.userId);
    
    // Update target topup request status to Approved
    database.prepare(`
      UPDATE topups
      SET requestStatus = 'Approved', paymentStatus = 'Completed', approvedAt = datetime('now'), approvedBy = ?, updatedAt = datetime('now')
      WHERE id = ?
    `).run(adminUser, topupId);

    // Also update any duplicate pending records for the same payment submission
    const allPending = database.prepare("SELECT id, userId, requestedCredits, totalAmount, paymentMethod, paymentReference FROM topups WHERE requestStatus = 'Pending'").all();
    allPending.forEach(p => {
      const pSig = `${p.userId}_${p.requestedCredits}_${p.totalAmount}_${(p.paymentMethod || "").toUpperCase()}_${(p.paymentReference || "").trim()}`;
      if (pSig === signature && p.id !== topupId) {
        database.prepare(`
          UPDATE topups
          SET requestStatus = 'Approved', paymentStatus = 'Completed', approvedAt = datetime('now'), approvedBy = ?, updatedAt = datetime('now')
          WHERE id = ?
        `).run(adminUser, p.id);
      }
    });
  } else if (status === 'Rejected') {
    database.prepare(`
      UPDATE topups
      SET requestStatus = 'Rejected', paymentStatus = 'Failed', rejectionReason = ?, updatedAt = datetime('now')
      WHERE id = ?
    `).run(reason || "Rejected by admin", topupId);

    const allPending = database.prepare("SELECT id, userId, requestedCredits, totalAmount, paymentMethod, paymentReference FROM topups WHERE requestStatus = 'Pending'").all();
    allPending.forEach(p => {
      const pSig = `${p.userId}_${p.requestedCredits}_${p.totalAmount}_${(p.paymentMethod || "").toUpperCase()}_${(p.paymentReference || "").trim()}`;
      if (pSig === signature && p.id !== topupId) {
        database.prepare(`
          UPDATE topups
          SET requestStatus = 'Rejected', paymentStatus = 'Failed', rejectionReason = ?, updatedAt = datetime('now')
          WHERE id = ?
        `).run(reason || "Rejected by admin", p.id);
      }
    });
  }
  return true;
};

const saveIdentityVerification = (data) => {
  const database = getDb();
  const { userId, fullName, dob, idNumber, idFrontImage, idBackImage, selfieImage } = data;

  // Mark previous pending attempts as superseded if any
  database.prepare("UPDATE identity_verifications SET status = 'superseded' WHERE userId = ? AND status = 'pending'").run(userId);

  const stmt = database.prepare(`
    INSERT INTO identity_verifications (
      userId, fullName, dob, idNumber, idFrontImage, idBackImage, selfieImage, status, submittedAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', datetime('now'), datetime('now'))
  `);

  const result = stmt.run(
    userId,
    fullName || "",
    dob || "",
    idNumber || "",
    idFrontImage || "",
    idBackImage || "",
    selfieImage || ""
  );

  return result.lastInsertRowid;
};

const getAllPendingIdentityVerifications = () => {
  const database = getDb();
  const stmt = database.prepare(`
    SELECT v.*, u.username, u.email
    FROM identity_verifications v
    JOIN users u ON v.userId = u.id
    WHERE v.status = 'pending'
    ORDER BY v.submittedAt DESC
  `);
  return stmt.all();
};

const getIdentityVerificationById = (id) => {
  const database = getDb();
  return database.prepare(`
    SELECT v.*, u.username, u.email
    FROM identity_verifications v
    JOIN users u ON v.userId = u.id
    WHERE v.id = ?
  `).get(id);
};

const getUserLatestIdentityVerification = (userId) => {
  const database = getDb();
  return database.prepare(`
    SELECT v.*, u.username, u.email, u.isVerified
    FROM identity_verifications v
    JOIN users u ON v.userId = u.id
    WHERE v.userId = ?
    ORDER BY v.id DESC
    LIMIT 1
  `).get(userId);
};

const updateIdentityVerificationStatus = (id, status, reason = "") => {
  const database = getDb();
  const verification = database.prepare("SELECT * FROM identity_verifications WHERE id = ?").get(id);
  if (!verification) {
    throw new Error("Verification request not found");
  }

  const nextStatus = status === 'approved' ? 'approved' : 'rejected';
  
  database.prepare(`
    UPDATE identity_verifications
    SET status = ?, rejectionReason = ?, updatedAt = datetime('now')
    WHERE id = ?
  `).run(nextStatus, reason || "", id);

  if (nextStatus === 'approved') {
    // Update user verified flag and fullName if available
    database.prepare("UPDATE users SET isVerified = 1, fullName = COALESCE(NULLIF(?, ''), fullName) WHERE id = ?")
      .run(verification.fullName, verification.userId);
  }

  return true;
};

// --- PAYOUT ACCOUNT FUNCTIONS ---
const getPayoutAccountByUserId = (userId) => {
  const database = getDb();
  return database.prepare("SELECT * FROM payout_accounts WHERE userId = ?").get(userId);
};

const saveOrUpdatePayoutAccount = (userId, data) => {
  const database = getDb();
  const existing = database.prepare("SELECT * FROM payout_accounts WHERE userId = ?").get(userId);

  if (existing) {
    database.prepare(`
      UPDATE payout_accounts
      SET accountHolderName = ?, bankName = ?, accountNumber = ?, ifscCode = ?, upiId = ?, payoutMethod = ?, status = 'PENDING VERIFICATION', rejectionReason = '', updatedAt = datetime('now')
      WHERE userId = ?
    `).run(
      data.accountHolderName,
      data.bankName,
      data.accountNumber,
      data.ifscCode,
      data.upiId || "",
      data.payoutMethod || "BANK_TRANSFER",
      userId
    );
    return getPayoutAccountByUserId(userId);
  } else {
    database.prepare(`
      INSERT INTO payout_accounts (userId, accountHolderName, bankName, accountNumber, ifscCode, upiId, payoutMethod, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING VERIFICATION')
    `).run(
      userId,
      data.accountHolderName,
      data.bankName,
      data.accountNumber,
      data.ifscCode,
      data.upiId || "",
      data.payoutMethod || "BANK_TRANSFER"
    );
    return getPayoutAccountByUserId(userId);
  }
};

const getAllPendingPayoutAccounts = () => {
  const database = getDb();
  return database.prepare(`
    SELECT p.*, u.username, u.email, u.fullName
    FROM payout_accounts p
    JOIN users u ON p.userId = u.id
    WHERE p.status = 'PENDING VERIFICATION'
    ORDER BY p.updatedAt DESC
  `).all();
};

const getAllPayoutAccountsSummary = () => {
  const database = getDb();
  const allAccounts = database.prepare(`
    SELECT p.*, u.username, u.email, u.fullName
    FROM payout_accounts p
    JOIN users u ON p.userId = u.id
    ORDER BY p.updatedAt DESC
  `).all();

  const counts = database.prepare(`
    SELECT 
      SUM(CASE WHEN status = 'PENDING VERIFICATION' THEN 1 ELSE 0 END) as pendingCount,
      SUM(CASE WHEN status = 'VERIFIED' THEN 1 ELSE 0 END) as verifiedCount,
      SUM(CASE WHEN status = 'REJECTED' THEN 1 ELSE 0 END) as rejectedCount
    FROM payout_accounts
  `).get();

  return {
    allAccounts,
    pendingCount: counts ? (counts.pendingCount || 0) : 0,
    verifiedCount: counts ? (counts.verifiedCount || 0) : 0,
    rejectedCount: counts ? (counts.rejectedCount || 0) : 0,
    queue: allAccounts.filter(a => a.status === 'PENDING VERIFICATION')
  };
};

const updatePayoutAccountStatus = (accountId, status, adminUser = "admin", reason = "") => {
  const database = getDb();
  const account = database.prepare("SELECT * FROM payout_accounts WHERE id = ?").get(accountId);
  if (!account) throw new Error("Payout account not found");

  const nextStatus = status === 'VERIFIED' ? 'VERIFIED' : 'REJECTED';
  database.prepare(`
    UPDATE payout_accounts
    SET status = ?, rejectionReason = ?, verifiedBy = ?, verifiedAt = datetime('now'), updatedAt = datetime('now')
    WHERE id = ?
  `).run(nextStatus, reason || "", adminUser, accountId);

  return true;
};

// --- TRANSACTION LEDGER FUNCTIONS ---
const recordTransaction = (data) => {
  const database = getDb();
  const txnId = data.transactionId || `TXN-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

  database.prepare(`
    INSERT INTO transactions (transactionId, userId, orderId, type, amount, currency, balanceBefore, balanceAfter, referenceType, referenceId, status, description)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    txnId,
    data.userId,
    data.orderId || null,
    data.type,
    data.amount,
    data.currency || 'C',
    data.balanceBefore || 0,
    data.balanceAfter || 0,
    data.referenceType || 'GENERAL',
    data.referenceId || '',
    data.status || 'COMPLETED',
    data.description || ''
  );
  return txnId;
};

const getUserTransactions = (userId, typeFilter = null) => {
  const database = getDb();
  let query = "SELECT * FROM transactions WHERE userId = ?";
  const params = [userId];

  if (typeFilter && typeFilter !== 'ALL') {
    query += " AND type = ?";
    params.push(typeFilter);
  }

  query += " ORDER BY id DESC";
  return database.prepare(query).all(...params);
};

// --- ORDERS & SELLER EARNINGS FUNCTIONS ---
const createOrderWithEarnings = (couponId, buyerId) => {
  const database = getDb();
  const coupon = database.prepare("SELECT * FROM coupons WHERE id = ?").get(couponId);
  if (!coupon) throw new Error("Coupon not found");

  const buyer = database.prepare("SELECT * FROM users WHERE id = ?").get(buyerId);
  if (!buyer) throw new Error("Buyer not found");

  const grossAmount = coupon.askingPrice;
  const platformFee = Math.round(grossAmount * 0.05 * 100) / 100; // 5% platform fee
  const sellerNetAmount = grossAmount - platformFee;
  const orderNumber = `ORD-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

  // Create Order
  const orderResult = database.prepare(`
    INSERT INTO orders (orderNumber, couponId, buyerId, sellerId, grossAmount, platformFee, sellerNetAmount, paymentStatus, orderStatus)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'PAID', 'COMPLETED')
  `).run(orderNumber, couponId, buyerId, coupon.userId, grossAmount, platformFee, sellerNetAmount);

  const orderId = orderResult.lastInsertRowid;

  // Create Seller Earning record
  database.prepare(`
    INSERT INTO seller_earnings (sellerId, orderId, grossAmount, platformFee, sellerNetAmount, status)
    VALUES (?, ?, ?, ?, ?, 'AVAILABLE')
  `).run(coupon.userId, orderId, grossAmount, platformFee, sellerNetAmount);

  // Record buyer transaction
  recordTransaction({
    userId: buyerId,
    orderId,
    type: 'COUPON_PURCHASE',
    amount: grossAmount,
    currency: 'C',
    balanceBefore: buyer.balance,
    balanceAfter: buyer.balance - grossAmount,
    description: `Purchased ${coupon.brand} Coupon (${coupon.code})`
  });

  // Record seller earning transaction
  const seller = database.prepare("SELECT * FROM users WHERE id = ?").get(coupon.userId);
  recordTransaction({
    userId: coupon.userId,
    orderId,
    type: 'SELLER_EARNING',
    amount: sellerNetAmount,
    currency: 'INR',
    balanceBefore: seller ? seller.balance : 0,
    balanceAfter: seller ? seller.balance : 0,
    description: `Sale of ${coupon.brand} Coupon (Order #${orderNumber})`
  });

  return orderId;
};

const getSellerEarningsSummary = (sellerId) => {
  const database = getDb();
  
  const available = database.prepare(`
    SELECT COALESCE(SUM(sellerNetAmount), 0) as total
    FROM seller_earnings
    WHERE sellerId = ? AND status = 'AVAILABLE'
  `).get(sellerId).total;

  const pending = database.prepare(`
    SELECT COALESCE(SUM(sellerNetAmount), 0) as total
    FROM seller_earnings
    WHERE sellerId = ? AND status = 'PENDING'
  `).get(sellerId).total;

  const totalEarned = database.prepare(`
    SELECT COALESCE(SUM(sellerNetAmount), 0) as total
    FROM seller_earnings
    WHERE sellerId = ? AND status IN ('AVAILABLE', 'PAID', 'CONVERTED_TO_CREDITS')
  `).get(sellerId).total;

  const totalWithdrawn = database.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total
    FROM payout_requests
    WHERE sellerId = ? AND status = 'COMPLETED'
  `).get(sellerId).total;

  return { available, pending, totalEarned, totalWithdrawn };
};

const getSellerEarningsList = (sellerId, filterStatus = null) => {
  const database = getDb();
  let query = `
    SELECT e.*, o.orderNumber, o.redemptionStatus, o.redemptionWindowEndsAt, o.settlementEligibleAt, c.brand, c.code
    FROM seller_earnings e
    JOIN orders o ON e.orderId = o.id
    JOIN coupons c ON o.couponId = c.id
    WHERE e.sellerId = ?
  `;
  const params = [sellerId];

  if (filterStatus && filterStatus !== 'ALL') {
    query += " AND e.status = ?";
    params.push(filterStatus);
  }

  query += " ORDER BY e.id DESC";
  return database.prepare(query).all(...params);
};

const convertSellerEarningToCredits = (sellerId, amount) => {
  const database = getDb();
  const summary = getSellerEarningsSummary(sellerId);
  if (summary.available < amount) {
    throw new Error("Insufficient available seller earnings");
  }

  // 1:1 ratio seller earnings -> credits
  const creditsToAdd = amount;
  const user = database.prepare("SELECT * FROM users WHERE id = ?").get(sellerId);

  // Update user balance
  database.prepare("UPDATE users SET balance = balance + ? WHERE id = ?").run(creditsToAdd, sellerId);

  // Mark earnings as CONVERTED_TO_CREDITS up to amount
  let remaining = amount;
  const availableEarnings = database.prepare("SELECT * FROM seller_earnings WHERE sellerId = ? AND status = 'AVAILABLE' ORDER BY id ASC").all(sellerId);

  for (const e of availableEarnings) {
    if (remaining <= 0) break;
    if (e.sellerNetAmount <= remaining) {
      database.prepare("UPDATE seller_earnings SET status = 'CONVERTED_TO_CREDITS', updatedAt = datetime('now') WHERE id = ?").run(e.id);
      remaining -= e.sellerNetAmount;
    } else {
      // Partial conversion split if needed
      database.prepare("UPDATE seller_earnings SET sellerNetAmount = sellerNetAmount - ?, updatedAt = datetime('now') WHERE id = ?").run(remaining, e.id);
      remaining = 0;
    }
  }

  // Record Ledger Transaction
  recordTransaction({
    userId: sellerId,
    type: 'SELLER_CREDIT_CONVERSION',
    amount: creditsToAdd,
    currency: 'C',
    balanceBefore: user.balance,
    balanceAfter: user.balance + creditsToAdd,
    description: `Converted ₹${amount} seller earnings to ${creditsToAdd}C credits`
  });

  return true;
};

const requestSellerPayout = (sellerId, amount) => {
  const database = getDb();

  // Check payout account verification
  const account = getPayoutAccountByUserId(sellerId);
  if (!account || account.status !== 'VERIFIED') {
    throw new Error("Your payout account must be verified by an admin before you can withdraw money.");
  }

  // Check available earnings balance
  const summary = getSellerEarningsSummary(sellerId);
  if (summary.available < amount) {
    throw new Error("Insufficient available earnings for payout.");
  }

  const payoutNumber = `PO-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

  // Create Payout Request
  const res = database.prepare(`
    INSERT INTO payout_requests (payoutNumber, sellerId, amount, payoutMethod, payoutAccountId, status)
    VALUES (?, ?, ?, ?, ?, 'REQUESTED')
  `).run(payoutNumber, sellerId, amount, account.payoutMethod || 'BANK_TRANSFER', account.id);

  // Mark corresponding earnings as PAYOUT_REQUESTED
  let remaining = amount;
  const availableEarnings = database.prepare("SELECT * FROM seller_earnings WHERE sellerId = ? AND status = 'AVAILABLE' ORDER BY id ASC").all(sellerId);
  for (const e of availableEarnings) {
    if (remaining <= 0) break;
    if (e.sellerNetAmount <= remaining) {
      database.prepare("UPDATE seller_earnings SET status = 'PAYOUT_REQUESTED', updatedAt = datetime('now') WHERE id = ?").run(e.id);
      remaining -= e.sellerNetAmount;
    } else {
      database.prepare("UPDATE seller_earnings SET sellerNetAmount = sellerNetAmount - ?, updatedAt = datetime('now') WHERE id = ?").run(remaining, e.id);
      remaining = 0;
    }
  }

  return res.lastInsertRowid;
};

const processSellerPayout = (payoutRequestId, status, failureReason = "") => {
  const database = getDb();
  const payout = database.prepare("SELECT * FROM payout_requests WHERE id = ?").get(payoutRequestId);
  if (!payout) throw new Error("Payout request not found");

  const nextStatus = status === 'COMPLETED' ? 'COMPLETED' : 'FAILED';

  database.prepare(`
    UPDATE payout_requests
    SET status = ?, failureReason = ?, processedAt = datetime('now')
    WHERE id = ?
  `).run(nextStatus, failureReason || "", payoutRequestId);

  const user = database.prepare("SELECT * FROM users WHERE id = ?").get(payout.sellerId);

  if (nextStatus === 'COMPLETED') {
    // Record Payout Transaction
    recordTransaction({
      userId: payout.sellerId,
      type: 'SELLER_PAYOUT',
      amount: payout.amount,
      currency: 'INR',
      balanceBefore: user ? user.balance : 0,
      balanceAfter: user ? user.balance : 0,
      description: `Monetary payout processed (#${payout.payoutNumber})`
    });
  } else if (nextStatus === 'FAILED') {
    // Restore earnings status to AVAILABLE
    database.prepare(`
      UPDATE seller_earnings
      SET status = 'AVAILABLE', updatedAt = datetime('now')
      WHERE sellerId = ? AND status = 'PAYOUT_REQUESTED'
    `).run(payout.sellerId);
  }

  return true;
};

const getUserSalesDetailed = (sellerId) => {
  const database = getDb();
  return database.prepare(`
    SELECT o.id as orderId, o.orderNumber, o.grossAmount, o.platformFee, o.sellerNetAmount,
           o.orderStatus, o.createdAt as saleDate,
           c.brand, c.category, c.code,
           b.username as buyerUsername, b.fullName as buyerName,
           COALESCE(e.status, 'PENDING') as payoutStatus
    FROM orders o
    JOIN coupons c ON o.couponId = c.id
    JOIN users b ON o.buyerId = b.id
    LEFT JOIN seller_earnings e ON e.orderId = o.id
    WHERE o.sellerId = ?
    ORDER BY o.id DESC
  `).all(sellerId);
};

const getUserPurchasesDetailed = (buyerId) => {
  const database = getDb();
  return database.prepare(`
    SELECT o.id as orderId, o.orderNumber, o.grossAmount as amount, o.paymentStatus, o.orderStatus,
           o.verificationStatus, o.couponReleased, o.redemptionStatus, o.disputeStatus,
           CASE WHEN o.couponReleased = 1 AND o.verificationStatus = 'APPROVED' THEN c.code ELSE '••••••••' END as code,
           o.createdAt as purchaseDate,
           c.brand, c.category, c.originalValue, c.askingPrice,
           s.username as sellerUsername, s.fullName as sellerName
    FROM orders o
    JOIN coupons c ON o.couponId = c.id
    JOIN users s ON o.sellerId = s.id
    WHERE o.buyerId = ?
    ORDER BY o.id DESC
  `).all(buyerId);
};

// --- CENTRALIZED ESCROW CONFIGURATION ---
const REDEMPTION_WINDOW_HOURS = 24;
const PLATFORM_FEE_PERCENT = 5.0;
const convertInrToCredits = (inrAmount) => inrAmount * 1.0;

// --- ESCROW & ORDER WORKFLOW FUNCTIONS ---

const reserveCouponAndPurchase = (couponId, buyerId) => {
  const database = getDb();
  return database.transaction(() => {
    const coupon = database.prepare("SELECT * FROM coupons WHERE id = ?").get(couponId);
    if (!coupon) throw new Error("Coupon not found");
    if (coupon.status !== 'active') throw new Error("Coupon is no longer available for purchase");
    if (coupon.userId === buyerId) throw new Error("Sellers cannot purchase their own coupons");

    const buyer = database.prepare("SELECT * FROM users WHERE id = ?").get(buyerId);
    if (!buyer) throw new Error("Buyer not found");

    const availableBalance = (buyer.balance || 0) - (buyer.reservedBalance || 0);
    if (availableBalance < coupon.askingPrice) {
      throw new Error("Insufficient available credits in wallet");
    }

    database.prepare("UPDATE users SET reservedBalance = COALESCE(reservedBalance, 0) + ? WHERE id = ?").run(coupon.askingPrice, buyerId);
    database.prepare("UPDATE coupons SET status = 'reserved' WHERE id = ?").run(couponId);

    const orderNumber = `ORD-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
    const grossAmount = coupon.askingPrice;
    const platformFee = Math.round(grossAmount * (PLATFORM_FEE_PERCENT / 100) * 100) / 100;
    const sellerNetAmount = Math.round((grossAmount - platformFee) * 100) / 100;

    const orderRes = database.prepare(`
      INSERT INTO orders (orderNumber, couponId, buyerId, sellerId, grossAmount, platformFee, sellerNetAmount, paymentStatus, orderStatus, verificationStatus, redemptionStatus)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'RESERVED', 'PENDING_VERIFICATION', 'PENDING', 'PENDING')
    `).run(orderNumber, couponId, buyerId, coupon.userId, grossAmount, platformFee, sellerNetAmount);
    const orderId = orderRes.lastInsertRowid;

    database.prepare(`
      INSERT INTO credit_reservations (orderId, buyerId, reservedAmount, status, reservedAt)
      VALUES (?, ?, ?, 'ACTIVE', datetime('now'))
    `).run(orderId, buyerId, coupon.askingPrice);

    recordTransaction({
      userId: buyerId,
      orderId,
      type: 'COUPON_PURCHASE_RESERVED',
      amount: coupon.askingPrice,
      currency: 'C',
      balanceBefore: buyer.balance,
      balanceAfter: buyer.balance,
      referenceType: 'ORDER',
      referenceId: orderNumber,
      description: `Reserved ${coupon.askingPrice}C for ${coupon.brand} Coupon (Order #${orderNumber})`
    });

    return { orderId, orderNumber };
  })();
};

const verifyAndReleaseOrder = (orderId, adminUsername = "admin") => {
  const database = getDb();
  return database.transaction(() => {
    const order = database.prepare("SELECT * FROM orders WHERE id = ?").get(orderId);
    if (!order) throw new Error("Order not found");
    if (order.verificationStatus !== 'PENDING') throw new Error("Order is already verified or processed");

    const reservation = database.prepare("SELECT * FROM credit_reservations WHERE orderId = ? AND status = 'ACTIVE'").get(orderId);
    if (!reservation) throw new Error("Active credit reservation not found for this order");

    const coupon = database.prepare("SELECT * FROM coupons WHERE id = ?").get(order.couponId);
    if (!coupon) throw new Error("Coupon not found");

    const buyer = database.prepare("SELECT * FROM users WHERE id = ?").get(order.buyerId);
    if (!buyer) throw new Error("Buyer not found");

    database.prepare("UPDATE credit_reservations SET status = 'CONSUMED', consumedAt = datetime('now') WHERE id = ?").run(reservation.id);
    database.prepare("UPDATE users SET balance = balance - ?, reservedBalance = reservedBalance - ? WHERE id = ?")
      .run(order.grossAmount, order.grossAmount, order.buyerId);

    database.prepare("UPDATE coupons SET status = 'sold' WHERE id = ?").run(order.couponId);

    const windowEndsAt = database.prepare(`SELECT datetime('now', '+' || ? || ' hours') as val`).get(REDEMPTION_WINDOW_HOURS).val;
    database.prepare(`
      UPDATE orders
      SET paymentStatus = 'PAID', orderStatus = 'VERIFIED', verificationStatus = 'APPROVED', couponReleased = 1, releasedAt = datetime('now'), redemptionWindowEndsAt = ?, updatedAt = datetime('now')
      WHERE id = ?
    `).run(windowEndsAt, orderId);

    database.prepare(`
      INSERT INTO seller_earnings (sellerId, orderId, grossAmount, feeRate, platformFee, sellerNetAmount, status)
      VALUES (?, ?, ?, ?, ?, ?, 'PENDING')
    `).run(order.sellerId, orderId, order.grossAmount, PLATFORM_FEE_PERCENT, order.platformFee, order.sellerNetAmount);

    const updatedBuyer = database.prepare("SELECT balance FROM users WHERE id = ?").get(order.buyerId);
    recordTransaction({
      userId: order.buyerId,
      orderId,
      type: 'COUPON_PURCHASE_CONSUMED',
      amount: order.grossAmount,
      currency: 'C',
      balanceBefore: buyer.balance,
      balanceAfter: updatedBuyer.balance,
      referenceType: 'ORDER',
      referenceId: order.orderNumber,
      description: `Finalized purchase for ${coupon.brand} Coupon (Order #${order.orderNumber})`
    });

    database.prepare(`
      INSERT INTO audit_logs (adminUsername, action, targetType, targetId, details)
      VALUES (?, 'VERIFY_ORDER_APPROVE', 'ORDER', ?, ?)
    `).run(adminUsername, orderId, `Approved order ${order.orderNumber} and released coupon`);

    return { success: true };
  })();
};

const rejectOrderPurchase = (orderId, adminUsername = "admin", reason = "") => {
  const database = getDb();
  return database.transaction(() => {
    const order = database.prepare("SELECT * FROM orders WHERE id = ?").get(orderId);
    if (!order) throw new Error("Order not found");
    if (order.verificationStatus !== 'PENDING') throw new Error("Order is already processed");

    const reservation = database.prepare("SELECT * FROM credit_reservations WHERE orderId = ? AND status = 'ACTIVE'").get(orderId);
    if (!reservation) throw new Error("Active reservation not found");

    const buyer = database.prepare("SELECT * FROM users WHERE id = ?").get(order.buyerId);

    database.prepare("UPDATE credit_reservations SET status = 'REFUNDED', refundedAt = datetime('now') WHERE id = ?").run(reservation.id);
    database.prepare("UPDATE users SET reservedBalance = reservedBalance - ? WHERE id = ?").run(order.grossAmount, order.buyerId);
    database.prepare("UPDATE coupons SET status = 'active' WHERE id = ?").run(order.couponId);

    database.prepare(`
      UPDATE orders
      SET orderStatus = 'REJECTED', verificationStatus = 'REJECTED', rejectionReason = ?, updatedAt = datetime('now')
      WHERE id = ?
    `).run(reason || "Rejected by admin", orderId);

    recordTransaction({
      userId: order.buyerId,
      orderId,
      type: 'COUPON_PURCHASE_RESERVATION_REFUND',
      amount: order.grossAmount,
      currency: 'C',
      balanceBefore: buyer ? buyer.balance : 0,
      balanceAfter: buyer ? buyer.balance : 0,
      referenceType: 'ORDER',
      referenceId: order.orderNumber,
      description: `Reservation refunded for rejected Order #${order.orderNumber}`
    });

    database.prepare(`
      INSERT INTO audit_logs (adminUsername, action, targetType, targetId, details)
      VALUES (?, 'VERIFY_ORDER_REJECT', 'ORDER', ?, ?)
    `).run(adminUsername, orderId, `Rejected order ${order.orderNumber}: ${reason}`);

    return { success: true };
  })();
};

const confirmOrderRedemption = (orderId, buyerId) => {
  const database = getDb();
  return database.transaction(() => {
    const order = database.prepare("SELECT * FROM orders WHERE id = ?").get(orderId);
    if (!order) throw new Error("Order not found");
    if (order.buyerId !== buyerId) throw new Error("Unauthorized order confirmation");
    if (order.orderStatus !== 'VERIFIED') throw new Error("Order is not eligible for redemption confirmation");
    if (order.disputeStatus === 'DISPUTED') throw new Error("Order has an active dispute");

    if (order.redemptionStatus === 'CONFIRMED' || order.redemptionStatus === 'EXPIRED') {
      return { success: true, message: "Order redemption already settled" };
    }

    database.prepare(`
      UPDATE orders
      SET redemptionStatus = 'CONFIRMED', buyerConfirmedAt = datetime('now'), settlementEligibleAt = datetime('now'), updatedAt = datetime('now')
      WHERE id = ?
    `).run(orderId);

    const earning = database.prepare("SELECT * FROM seller_earnings WHERE orderId = ?").get(orderId);
    if (earning && earning.status === 'PENDING') {
      database.prepare(`
        UPDATE seller_earnings
        SET status = 'AVAILABLE', availableAt = datetime('now'), updatedAt = datetime('now')
        WHERE id = ?
      `).run(earning.id);
    }

    return { success: true };
  })();
};

const processRedemptionSettlementCheck = () => {
  const database = getDb();
  const eligibleOrders = database.prepare(`
    SELECT * FROM orders
    WHERE verificationStatus = 'APPROVED'
      AND couponReleased = 1
      AND redemptionStatus = 'PENDING'
      AND disputeStatus = 'NONE'
      AND redemptionWindowEndsAt IS NOT NULL
      AND redemptionWindowEndsAt <= datetime('now')
  `).all();

  let settledCount = 0;
  for (const order of eligibleOrders) {
    database.transaction(() => {
      database.prepare(`
        UPDATE orders
        SET redemptionStatus = 'EXPIRED', settlementEligibleAt = datetime('now'), updatedAt = datetime('now')
        WHERE id = ?
      `).run(order.id);

      const earning = database.prepare("SELECT * FROM seller_earnings WHERE orderId = ?").get(order.id);
      if (earning && earning.status === 'PENDING') {
        database.prepare(`
          UPDATE seller_earnings
          SET status = 'AVAILABLE', availableAt = datetime('now'), updatedAt = datetime('now')
          WHERE id = ?
        `).run(earning.id);
        settledCount++;
      }
    })();
  }
  return settledCount;
};

const raiseOrderDispute = (orderId, buyerId, reason, description = "") => {
  const database = getDb();
  return database.transaction(() => {
    const order = database.prepare("SELECT * FROM orders WHERE id = ?").get(orderId);
    if (!order) throw new Error("Order not found");
    if (order.buyerId !== buyerId) throw new Error("Unauthorized dispute request");
    if (order.verificationStatus !== 'APPROVED' || order.couponReleased !== 1) {
      throw new Error("Only released coupons can be disputed");
    }
    if (order.disputeStatus === 'DISPUTED') throw new Error("A dispute is already active for this order");
    if (order.orderStatus === 'REFUNDED' || order.orderStatus === 'REJECTED') {
      throw new Error("Cannot dispute a refunded or rejected order");
    }

    const earning = database.prepare("SELECT * FROM seller_earnings WHERE orderId = ?").get(orderId);
    if (earning && (earning.status === 'PAID' || earning.status === 'CONVERTED_TO_CREDITS')) {
      throw new Error("Cannot dispute an order whose earnings have already been paid out or converted");
    }

    database.prepare(`
      UPDATE orders
      SET disputeStatus = 'DISPUTED', redemptionStatus = 'DISPUTED', updatedAt = datetime('now')
      WHERE id = ?
    `).run(orderId);

    if (earning) {
      database.prepare(`
        UPDATE seller_earnings
        SET status = 'ON_HOLD', updatedAt = datetime('now')
        WHERE id = ?
      `).run(earning.id);
    }

    const res = database.prepare(`
      INSERT INTO disputes (userId, orderId, reason, description, status)
      VALUES (?, ?, ?, ?, 'new')
    `).run(buyerId, orderId, reason, description);

    return res.lastInsertRowid;
  })();
};

const resolveOrderDispute = (orderId, adminUsername = "admin", winner = "seller", notes = "") => {
  const database = getDb();
  return database.transaction(() => {
    const order = database.prepare("SELECT * FROM orders WHERE id = ?").get(orderId);
    if (!order) throw new Error("Order not found");
    if (order.disputeStatus !== 'DISPUTED') throw new Error("Order has no active dispute to resolve");

    const earning = database.prepare("SELECT * FROM seller_earnings WHERE orderId = ?").get(orderId);
    if (earning && (earning.status === 'PAID' || earning.status === 'CONVERTED_TO_CREDITS')) {
      throw new Error("Earning has already been processed");
    }

    if (winner === 'seller') {
      database.prepare(`
        UPDATE orders
        SET disputeStatus = 'RESOLVED_SELLER_WINS', redemptionStatus = 'CONFIRMED', updatedAt = datetime('now')
        WHERE id = ?
      `).run(orderId);

      if (earning) {
        database.prepare(`
          UPDATE seller_earnings
          SET status = 'AVAILABLE', availableAt = datetime('now'), updatedAt = datetime('now')
          WHERE id = ?
        `).run(earning.id);
      }

      database.prepare("UPDATE disputes SET status = 'resolved_seller_wins', resolvedAt = datetime('now'), resolvedBy = ? WHERE orderId = ?")
        .run(adminUsername, orderId);

      database.prepare(`
        INSERT INTO audit_logs (adminUsername, action, targetType, targetId, details)
        VALUES (?, 'RESOLVE_DISPUTE_SELLER_WINS', 'ORDER', ?, ?)
      `).run(adminUsername, orderId, `Resolved dispute in seller favor: ${notes}`);

    } else if (winner === 'buyer') {
      database.prepare(`
        UPDATE orders
        SET disputeStatus = 'RESOLVED_BUYER_WINS', orderStatus = 'REFUNDED', redemptionStatus = 'REFUNDED', updatedAt = datetime('now')
        WHERE id = ?
      `).run(orderId);

      if (earning) {
        database.prepare(`
          UPDATE seller_earnings
          SET status = 'CANCELLED', updatedAt = datetime('now')
          WHERE id = ?
        `).run(earning.id);
      }

      const buyer = database.prepare("SELECT * FROM users WHERE id = ?").get(order.buyerId);
      database.prepare("UPDATE users SET balance = balance + ? WHERE id = ?").run(order.grossAmount, order.buyerId);

      const updatedBuyer = database.prepare("SELECT balance FROM users WHERE id = ?").get(order.buyerId);
      recordTransaction({
        userId: order.buyerId,
        orderId,
        type: 'COUPON_PURCHASE_DISPUTE_REFUND',
        amount: order.grossAmount,
        currency: 'C',
        balanceBefore: buyer ? buyer.balance : 0,
        balanceAfter: updatedBuyer.balance,
        referenceType: 'ORDER',
        referenceId: order.orderNumber,
        description: `Dispute refund for Order #${order.orderNumber}`
      });

      database.prepare("UPDATE disputes SET status = 'resolved_buyer_wins', resolvedAt = datetime('now'), resolvedBy = ? WHERE orderId = ?")
        .run(adminUsername, orderId);

      database.prepare(`
        INSERT INTO audit_logs (adminUsername, action, targetType, targetId, details)
        VALUES (?, 'RESOLVE_DISPUTE_BUYER_WINS', 'ORDER', ?, ?)
      `).run(adminUsername, orderId, `Resolved dispute in buyer favor with refund: ${notes}`);
    }

    return { success: true };
  })();
};

const requestSellerPayoutDetailed = (sellerId, earningIds = []) => {
  const database = getDb();
  return database.transaction(() => {
    const account = getPayoutAccountByUserId(sellerId);
    if (!account || account.status !== 'VERIFIED') {
      throw new Error("Your payout account must be verified by an admin before you can withdraw money.");
    }

    let availableEarnings;
    if (earningIds && earningIds.length > 0) {
      const placeholders = earningIds.map(() => '?').join(',');
      availableEarnings = database.prepare(`
        SELECT * FROM seller_earnings
        WHERE sellerId = ? AND status = 'AVAILABLE' AND id IN (${placeholders})
      `).all(sellerId, ...earningIds);
    } else {
      availableEarnings = database.prepare(`
        SELECT * FROM seller_earnings
        WHERE sellerId = ? AND status = 'AVAILABLE'
      `).all(sellerId);
    }

    if (!availableEarnings || availableEarnings.length === 0) {
      throw new Error("No available earnings selected for payout.");
    }

    const totalAmount = availableEarnings.reduce((acc, e) => acc + e.sellerNetAmount, 0);
    const payoutNumber = `PO-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

    const res = database.prepare(`
      INSERT INTO payout_requests (payoutNumber, sellerId, amount, payoutMethod, payoutAccountId, status)
      VALUES (?, ?, ?, ?, ?, 'REQUESTED')
    `).run(payoutNumber, sellerId, totalAmount, account.payoutMethod || 'BANK_TRANSFER', account.id);
    const payoutRequestId = res.lastInsertRowid;

    for (const e of availableEarnings) {
      database.prepare(`
        INSERT INTO payout_request_items (payoutRequestId, earningId, amount)
        VALUES (?, ?, ?)
      `).run(payoutRequestId, e.id, e.sellerNetAmount);

      database.prepare(`
        UPDATE seller_earnings
        SET status = 'PAYOUT_REQUESTED', updatedAt = datetime('now')
        WHERE id = ?
      `).run(e.id);
    }

    return { payoutRequestId, payoutNumber, amount: totalAmount };
  })();
};

const processSellerPayoutDetailed = (payoutRequestId, action, adminUsername = "admin", reason = "") => {
  const database = getDb();
  return database.transaction(() => {
    const payout = database.prepare("SELECT * FROM payout_requests WHERE id = ?").get(payoutRequestId);
    if (!payout) throw new Error("Payout request not found");

    const items = database.prepare("SELECT * FROM payout_request_items WHERE payoutRequestId = ?").all(payoutRequestId);

    if (action === 'process') {
      database.prepare("UPDATE payout_requests SET status = 'PROCESSING' WHERE id = ?").run(payoutRequestId);
      for (const item of items) {
        database.prepare("UPDATE seller_earnings SET status = 'PROCESSING', updatedAt = datetime('now') WHERE id = ?").run(item.earningId);
      }
    } else if (action === 'complete') {
      database.prepare("UPDATE payout_requests SET status = 'COMPLETED', processedBy = ?, processedAt = datetime('now') WHERE id = ?")
        .run(adminUsername, payoutRequestId);
      for (const item of items) {
        database.prepare("UPDATE seller_earnings SET status = 'PAID', updatedAt = datetime('now') WHERE id = ?").run(item.earningId);
      }
      const seller = database.prepare("SELECT * FROM users WHERE id = ?").get(payout.sellerId);
      recordTransaction({
        userId: payout.sellerId,
        type: 'SELLER_PAYOUT_COMPLETED',
        amount: payout.amount,
        currency: 'INR',
        balanceBefore: seller ? seller.balance : 0,
        balanceAfter: seller ? seller.balance : 0,
        referenceType: 'PAYOUT',
        referenceId: payout.payoutNumber,
        description: `Monetary payout completed (#${payout.payoutNumber})`
      });
    } else if (action === 'fail' || action === 'reject') {
      const nextStatus = action === 'fail' ? 'FAILED' : 'REJECTED';
      database.prepare("UPDATE payout_requests SET status = ?, failureReason = ?, processedBy = ?, processedAt = datetime('now') WHERE id = ?")
        .run(nextStatus, reason || "Failed/Rejected", adminUsername, payoutRequestId);
      for (const item of items) {
        database.prepare("UPDATE seller_earnings SET status = 'AVAILABLE', updatedAt = datetime('now') WHERE id = ?").run(item.earningId);
      }
    }

    return { success: true };
  })();
};

const convertSingleEarningToCredits = (sellerId, earningId) => {
  const database = getDb();
  return database.transaction(() => {
    const earning = database.prepare("SELECT * FROM seller_earnings WHERE id = ? AND sellerId = ?").get(earningId, sellerId);
    if (!earning) throw new Error("Earning not found or unauthorized");
    if (earning.status !== 'AVAILABLE') throw new Error("Earning is not available for conversion");

    const creditsToAdd = convertInrToCredits(earning.sellerNetAmount);
    const seller = database.prepare("SELECT * FROM users WHERE id = ?").get(sellerId);

    database.prepare("UPDATE users SET balance = balance + ? WHERE id = ?").run(creditsToAdd, sellerId);
    database.prepare("UPDATE seller_earnings SET status = 'CONVERTED_TO_CREDITS', updatedAt = datetime('now') WHERE id = ?").run(earningId);

    const updatedSeller = database.prepare("SELECT balance FROM users WHERE id = ?").get(sellerId);
    recordTransaction({
      userId: sellerId,
      type: 'SELLER_EARNING_CONVERSION',
      amount: creditsToAdd,
      currency: 'C',
      balanceBefore: seller ? seller.balance : 0,
      balanceAfter: updatedSeller.balance,
      referenceType: 'EARNING',
      referenceId: String(earningId),
      description: `Converted ₹${earning.sellerNetAmount} earning to ${creditsToAdd}C credits`
    });

    return { success: true, creditsAdded: creditsToAdd };
  })();
};

const getAllPendingOrderVerifications = () => {
  const database = getDb();
  return database.prepare(`
    SELECT o.id as orderId, o.orderNumber, o.grossAmount, o.platformFee, o.sellerNetAmount,
           o.paymentStatus, o.orderStatus, o.verificationStatus, o.createdAt,
           c.id as couponId, c.brand, c.category, c.originalValue, c.askingPrice,
           b.id as buyerId, b.username as buyerUsername, b.fullName as buyerName,
           s.id as sellerId, s.username as sellerUsername, s.fullName as sellerName
    FROM orders o
    JOIN coupons c ON o.couponId = c.id
    JOIN users b ON o.buyerId = b.id
    JOIN users s ON o.sellerId = s.id
    WHERE o.verificationStatus = 'PENDING'
    ORDER BY o.id DESC
  `).all();
};

const getAllPendingPayoutVerifications = () => {
  const database = getDb();
  const requests = database.prepare(`
    SELECT pr.*, u.username, u.fullName, u.email,
           pa.accountHolderName, pa.bankName, pa.accountNumber, pa.ifscCode, pa.upiId, pa.status as accountStatus
    FROM payout_requests pr
    JOIN users u ON pr.sellerId = u.id
    JOIN payout_accounts pa ON pr.payoutAccountId = pa.id
    WHERE pr.status IN ('REQUESTED', 'PROCESSING')
    ORDER BY pr.id DESC
  `).all();

  for (const r of requests) {
    r.items = database.prepare(`
      SELECT pri.*, se.orderId, o.orderNumber, c.brand
      FROM payout_request_items pri
      JOIN seller_earnings se ON pri.earningId = se.id
      JOIN orders o ON se.orderId = o.id
      JOIN coupons c ON o.couponId = c.id
      WHERE pri.payoutRequestId = ?
    `).all(r.id);
  }

  return requests;
};

module.exports = {
  REDEMPTION_WINDOW_HOURS,
  PLATFORM_FEE_PERCENT,
  convertInrToCredits,
  addCredits,
  initDetailsDb,
  getDb,
  createUser,
  findUserByUsernameOrEmail,
  findUserByUsername,
  findUserByEmail,
  verifyPassword,
  getAllUsers,
  updateUserProfile,
  createCoupon,
  getCouponsByUserId,
  getAllActiveCoupons,
  getCouponById,
  updateCouponStatus,
  createPurchase,
  getPurchasesByBuyerId,
  getPurchasesBySellerId,
  getUserStats,
  createPayout,
  getPayoutsByUserId,
  getAllPendingPayouts,
  updatePayoutStatus,
  getAllPendingCoupons,
  approveCoupon,
  getAdminStats,
  getAdminPaymentStats,
  createTopup,
  getAllPendingTopups,
  getTopupById,
  updateTopupStatus,
  saveIdentityVerification,
  getAllPendingIdentityVerifications,
  getIdentityVerificationById,
  getUserLatestIdentityVerification,
  updateIdentityVerificationStatus,
  getPayoutAccountByUserId,
  saveOrUpdatePayoutAccount,
  getAllPendingPayoutAccounts,
  getAllPayoutAccountsSummary,
  updatePayoutAccountStatus,
  recordTransaction,
  getUserTransactions,
  createOrderWithEarnings,
  getSellerEarningsSummary,
  getSellerEarningsList,
  convertSellerEarningToCredits,
  requestSellerPayout,
  processSellerPayout,
  getUserSalesDetailed,
  getUserPurchasesDetailed,
  reserveCouponAndPurchase,
  verifyAndReleaseOrder,
  rejectOrderPurchase,
  confirmOrderRedemption,
  processRedemptionSettlementCheck,
  raiseOrderDispute,
  resolveOrderDispute,
  requestSellerPayoutDetailed,
  processSellerPayoutDetailed,
  convertSingleEarningToCredits,
  getAllPendingOrderVerifications,
  getAllPendingPayoutVerifications,
  getAllDisputes,
};