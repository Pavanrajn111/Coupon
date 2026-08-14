const assert = require("assert");
const detailsDb = require("../src/db/detailsDb");

function runEscrowTests() {
  console.log("Starting CouponEx Complete Escrow & Settlement Automated Tests...\n");

  // Initialize DB
  detailsDb.initDetailsDb();
  const db = detailsDb.getDb();

  // Create unique test users
  const timestamp = Date.now();
  const sellerId = detailsDb.createUser({
    fullName: "Test Seller",
    username: `seller_${timestamp}`,
    email: `seller_${timestamp}@test.com`,
    phoneNumber: "9876543210",
    password: "Password@123"
  });

  const buyerId = detailsDb.createUser({
    fullName: "Test Buyer",
    username: `buyer_${timestamp}`,
    email: `buyer_${timestamp}@test.com`,
    phoneNumber: "9876543211",
    password: "Password@123"
  });

  // Add credits to buyer
  detailsDb.addCredits(buyerId, 1000);
  let buyer = db.prepare("SELECT * FROM users WHERE id = ?").get(buyerId);
  let seller = db.prepare("SELECT * FROM users WHERE id = ?").get(sellerId);
  assert.strictEqual(buyer.balance, 1000, "Buyer should have 1000 credits");

  // TEST 1: Listing approval does NOT credit seller
  console.log("TEST 1: Coupon Listing Approval (No Auto-Credit to Seller)");
  const couponId = detailsDb.createCoupon({
    userId: sellerId,
    brand: "Amazon",
    category: "Shopping",
    code: `AMZ-${timestamp}`,
    expiryDate: "2026-12-31",
    originalValue: 500,
    askingPrice: 400,
    description: "Amazon gift card"
  });

  const sellerBalanceBeforeApproval = db.prepare("SELECT balance FROM users WHERE id = ?").get(sellerId).balance;
  detailsDb.approveCoupon(couponId);
  const sellerBalanceAfterApproval = db.prepare("SELECT balance FROM users WHERE id = ?").get(sellerId).balance;
  assert.strictEqual(sellerBalanceAfterApproval, sellerBalanceBeforeApproval, "Seller balance MUST NOT change when listing is approved");
  const approvedCoupon = detailsDb.getCouponById(couponId);
  assert.strictEqual(approvedCoupon.status, "active", "Coupon status should be active");
  console.log("  ✓ Passed: Seller balance remained unchanged on listing approval.\n");

  // TEST 2: Purchase creates reservation
  console.log("TEST 2: Buyer Credit Reservation & Coupon Locking");
  const purchaseRes = detailsDb.reserveCouponAndPurchase(couponId, buyerId);
  const orderId = purchaseRes.orderId;
  buyer = db.prepare("SELECT * FROM users WHERE id = ?").get(buyerId);
  assert.strictEqual(buyer.reservedBalance, 400, "Buyer reservedBalance should be 400");
  assert.strictEqual(buyer.balance, 1000, "Buyer total balance should still be 1000 before verification");
  const reservedCoupon = detailsDb.getCouponById(couponId);
  assert.strictEqual(reservedCoupon.status, "reserved", "Coupon status should be reserved");
  console.log("  ✓ Passed: Credits reserved and coupon locked to 'reserved'.\n");

  // TEST 3: Duplicate purchase fails
  console.log("TEST 3: Duplicate Purchase Prevention");
  assert.throws(() => {
    detailsDb.reserveCouponAndPurchase(couponId, buyerId);
  }, /no longer available/, "Duplicate purchase must fail cleanly");
  console.log("  ✓ Passed: Duplicate purchase rejected.\n");

  // TEST 4: Admin Approval & Initial PENDING Seller Earning
  console.log("TEST 4: Admin Order Verification & Initial PENDING Seller Earning");
  detailsDb.verifyAndReleaseOrder(orderId, "admin");
  buyer = db.prepare("SELECT * FROM users WHERE id = ?").get(buyerId);
  assert.strictEqual(buyer.balance, 600, "Buyer balance should now be 600 (1000 - 400)");
  assert.strictEqual(buyer.reservedBalance, 0, "Buyer reservedBalance should now be 0");
  
  const earning = db.prepare("SELECT * FROM seller_earnings WHERE orderId = ?").get(orderId);
  assert.ok(earning, "Seller earning record must exist");
  assert.strictEqual(earning.status, "PENDING", "Seller earning status MUST initially be PENDING");
  assert.strictEqual(earning.grossAmount, 400, "Gross amount should be 400");
  assert.strictEqual(earning.platformFee, 20, "Platform fee (5%) should be 20");
  assert.strictEqual(earning.sellerNetAmount, 380, "Net seller amount should be 380");
  console.log("  ✓ Passed: Order verified, credits consumed, seller earning starts as PENDING.\n");

  // TEST 5: Redemption Confirmation transitions PENDING -> AVAILABLE
  console.log("TEST 5: Buyer Confirmation transitions Seller Earning PENDING -> AVAILABLE");
  detailsDb.confirmOrderRedemption(orderId, buyerId);
  const confirmedEarning = db.prepare("SELECT * FROM seller_earnings WHERE orderId = ?").get(orderId);
  assert.strictEqual(confirmedEarning.status, "AVAILABLE", "Seller earning should now be AVAILABLE");
  console.log("  ✓ Passed: Seller earning became AVAILABLE after buyer confirmation.\n");

  // TEST 6: Unverified Payout Account blocks Money Payout
  console.log("TEST 6: Payout Account Verification Enforcement");
  assert.throws(() => {
    detailsDb.requestSellerPayoutDetailed(sellerId, [confirmedEarning.id]);
  }, /must be verified/, "Money payout without verified payout account must be blocked");
  console.log("  ✓ Passed: Unverified payout account blocked payout.\n");

  // TEST 7: Verified Payout Account permits Payout Request & Multi-item linking
  console.log("TEST 7: Verified Payout Request & Item Linking");
  detailsDb.saveOrUpdatePayoutAccount(sellerId, {
    accountHolderName: "Test Seller",
    bankName: "HDFC Bank",
    accountNumber: "1234567890",
    ifscCode: "HDFC0001234"
  });
  detailsDb.updatePayoutAccountStatus(1, "VERIFIED", "admin");
  db.prepare("UPDATE payout_accounts SET status = 'VERIFIED' WHERE userId = ?").run(sellerId);

  const payoutReq = detailsDb.requestSellerPayoutDetailed(sellerId, [confirmedEarning.id]);
  const reqEarning = db.prepare("SELECT * FROM seller_earnings WHERE id = ?").get(confirmedEarning.id);
  assert.strictEqual(reqEarning.status, "PAYOUT_REQUESTED", "Earning status should be PAYOUT_REQUESTED");
  console.log("  ✓ Passed: Payout request created and earning status updated.\n");

  // TEST 8: Same Earning cannot belong to two active payout requests
  console.log("TEST 8: Duplicate Payout Request Prevention");
  assert.throws(() => {
    detailsDb.requestSellerPayoutDetailed(sellerId, [confirmedEarning.id]);
  }, /No available earnings selected/, "Cannot request payout on already requested earning");
  console.log("  ✓ Passed: Duplicate payout request blocked.\n");

  // TEST 9: Payout Processing & Completion
  console.log("TEST 9: Payout Processing Lifecycle");
  detailsDb.processSellerPayoutDetailed(payoutReq.payoutRequestId, "process", "admin");
  let pr = db.prepare("SELECT * FROM payout_requests WHERE id = ?").get(payoutReq.payoutRequestId);
  assert.strictEqual(pr.status, "PROCESSING", "Payout request should be PROCESSING");

  detailsDb.processSellerPayoutDetailed(payoutReq.payoutRequestId, "complete", "admin");
  pr = db.prepare("SELECT * FROM payout_requests WHERE id = ?").get(payoutReq.payoutRequestId);
  assert.strictEqual(pr.status, "COMPLETED", "Payout request should be COMPLETED");
  const paidEarning = db.prepare("SELECT * FROM seller_earnings WHERE id = ?").get(confirmedEarning.id);
  assert.strictEqual(paidEarning.status, "PAID", "Seller earning should now be PAID");
  console.log("  ✓ Passed: Payout completed and earning marked PAID.\n");

  // TEST 10: Convert Earning to Credits
  console.log("TEST 10: Seller Credits Conversion");
  const coupon2Id = detailsDb.createCoupon({
    userId: sellerId,
    brand: "Swiggy",
    category: "Food",
    code: `SWG-${timestamp}`,
    expiryDate: "2026-12-31",
    originalValue: 300,
    askingPrice: 200,
    description: "Swiggy voucher"
  });
  detailsDb.approveCoupon(coupon2Id);
  const p2 = detailsDb.reserveCouponAndPurchase(coupon2Id, buyerId);
  detailsDb.verifyAndReleaseOrder(p2.orderId, "admin");
  detailsDb.confirmOrderRedemption(p2.orderId, buyerId);
  const earning2 = db.prepare("SELECT * FROM seller_earnings WHERE orderId = ?").get(p2.orderId);

  const sellerBalBeforeConv = db.prepare("SELECT balance FROM users WHERE id = ?").get(sellerId).balance;
  detailsDb.convertSingleEarningToCredits(sellerId, earning2.id);
  const sellerBalAfterConv = db.prepare("SELECT balance FROM users WHERE id = ?").get(sellerId).balance;
  assert.strictEqual(sellerBalAfterConv, sellerBalBeforeConv + earning2.sellerNetAmount, "Seller wallet should increase by net amount");
  const convEarning = db.prepare("SELECT * FROM seller_earnings WHERE id = ?").get(earning2.id);
  assert.strictEqual(convEarning.status, "CONVERTED_TO_CREDITS", "Earning status should be CONVERTED_TO_CREDITS");
  console.log("  ✓ Passed: Earning converted to credits and wallet updated.\n");

  // TEST 11: Dispute Creation & Resolution (Buyer Wins -> COUPON_PURCHASE_DISPUTE_REFUND)
  console.log("TEST 11: Dispute Lifecycle & Buyer Refund");
  const coupon3Id = detailsDb.createCoupon({
    userId: sellerId,
    brand: "Zomato",
    category: "Food",
    code: `ZOM-${timestamp}`,
    expiryDate: "2026-12-31",
    originalValue: 100,
    askingPrice: 100,
    description: "Zomato coupon"
  });
  detailsDb.approveCoupon(coupon3Id);
  const p3 = detailsDb.reserveCouponAndPurchase(coupon3Id, buyerId);
  detailsDb.verifyAndReleaseOrder(p3.orderId, "admin");

  // Raise dispute
  detailsDb.raiseOrderDispute(p3.orderId, buyerId, "Coupon Code Invalid", "Code was already redeemed");
  const disputedEarning = db.prepare("SELECT * FROM seller_earnings WHERE orderId = ?").get(p3.orderId);
  assert.strictEqual(disputedEarning.status, "ON_HOLD", "Seller earning must be ON_HOLD during dispute");

  // Resolve in Buyer Favor
  const buyerBalBeforeRefund = db.prepare("SELECT balance FROM users WHERE id = ?").get(buyerId).balance;
  detailsDb.resolveOrderDispute(p3.orderId, "admin", "buyer", "Invalid code confirmed");
  const buyerBalAfterRefund = db.prepare("SELECT balance FROM users WHERE id = ?").get(buyerId).balance;
  assert.strictEqual(buyerBalAfterRefund, buyerBalBeforeRefund + 100, "Buyer should receive full 100 credit refund");

  const refundedEarning = db.prepare("SELECT * FROM seller_earnings WHERE orderId = ?").get(p3.orderId);
  assert.strictEqual(refundedEarning.status, "CANCELLED", "Seller earning should be CANCELLED");

  const refundTxn = db.prepare("SELECT * FROM transactions WHERE orderId = ? AND type = 'COUPON_PURCHASE_DISPUTE_REFUND'").get(p3.orderId);
  assert.ok(refundTxn, "COUPON_PURCHASE_DISPUTE_REFUND transaction ledger entry must exist");
  console.log("  ✓ Passed: Dispute resolved in buyer favor, refund logged, earning cancelled.\n");

  console.log("=================================================");
  console.log("ALL 11 AUTOMATED ESCROW & SETTLEMENT TESTS PASSED!");
  console.log("=================================================\n");
}

try {
  runEscrowTests();
} catch (error) {
  console.error("Test failed:", error);
  process.exit(1);
}
