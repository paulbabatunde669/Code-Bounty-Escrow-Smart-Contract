import { describe, expect, it } from "vitest";

const accounts = simnet.getAccounts();
const address1 = accounts.get("wallet_1")!;
const address2 = accounts.get("wallet_2")!;
const address3 = accounts.get("wallet_3")!;
const deployer = accounts.get("deployer")!;

describe("Code Bounty Escrow Contract", () => {
  
  describe("Bounty Creation", () => {
    it("should create a bounty successfully", () => {
      const amount = 1000000; // 1 STX
      const title = "Build a todo app";
      const description = "Create a simple todo application with React";
      const requirements = "Must use React, have tests, and be responsive";
      const deadline = 1000; // Future block height
      
      const response = simnet.callPublicFn(
        "bounty-escrow",
        "create-bounty",
        [
          types.uint(amount),
          types.ascii(title),
          types.ascii(description),
          types.ascii(requirements),
          types.uint(deadline)
        ],
        address1
      );
      
      expect(response.result).toBeOk(types.uint(1));
      
      // Check bounty was created correctly
      const bounty = simnet.callReadOnlyFn(
        "bounty-escrow",
        "get-bounty",
        [types.uint(1)],
        address1
      );
      
      expect(bounty.result).toBeSome(
        types.tuple({
          creator: types.principal(address1),
          amount: types.uint(amount),
          title: types.ascii(title),
          description: types.ascii(description),
          requirements: types.ascii(requirements),
          deadline: types.uint(deadline),
          status: types.ascii("open"),
          winner: types.none(),
          "submission-url": types.none(),
          "created-at": types.uint(simnet.blockHeight)
        })
      );
    });

    it("should fail when deadline is in the past", () => {
      const response = simnet.callPublicFn(
        "bounty-escrow",
        "create-bounty",
        [
          types.uint(1000000),
          types.ascii("Test bounty"),
          types.ascii("Test description"),
          types.ascii("Test requirements"),
          types.uint(0) // Past deadline
        ],
        address1
      );
      
      expect(response.result).toBeErr(types.uint(104)); // ERR-DEADLINE-PASSED
    });

    it("should fail with insufficient funds", () => {
      const largeAmount = 999999999999; // More than account balance
      
      const response = simnet.callPublicFn(
        "bounty-escrow",
        "create-bounty",
        [
          types.uint(largeAmount),
          types.ascii("Expensive bounty"),
          types.ascii("This costs too much"),
          types.ascii("Need more STX"),
          types.uint(1000)
        ],
        address1
      );
      
      expect(response.result).toBeErr(types.uint(103)); // ERR-INSUFFICIENT-FUNDS
    });
  });

  describe("Work Submission", () => {
    it("should allow work submission for open bounty", () => {
      // First create a bounty
      simnet.callPublicFn(
        "bounty-escrow",
        "create-bounty",
        [
          types.uint(1000000),
          types.ascii("Test bounty"),
          types.ascii("Test description"),
          types.ascii("Test requirements"),
          types.uint(1000)
        ],
        address1
      );
      
      // Submit work
      const response = simnet.callPublicFn(
        "bounty-escrow",
        "submit-work",
        [
          types.uint(1),
          types.ascii("https://github.com/user/repo"),
          types.ascii("Completed the todo app as requested")
        ],
        address2
      );
      
      expect(response.result).toBeOk(types.bool(true));
      
      // Check submission was recorded
      const submission = simnet.callReadOnlyFn(
        "bounty-escrow",
        "get-submission",
        [types.uint(1), types.principal(address2)],
        address1
      );
      
      expect(submission.result).toBeSome(
        types.tuple({
          "submission-url": types.ascii("https://github.com/user/repo"),
          description: types.ascii("Completed the todo app as requested"),
          "submitted-at": types.uint(simnet.blockHeight),
          verified: types.bool(false)
        })
      );
    });

    it("should prevent duplicate submissions", () => {
      // Create bounty
      simnet.callPublicFn(
        "bounty-escrow",
        "create-bounty",
        [
          types.uint(1000000),
          types.ascii("Test bounty 2"),
          types.ascii("Test description"),
          types.ascii("Test requirements"),
          types.uint(1000)
        ],
        address1
      );
      
      // First submission
      simnet.callPublicFn(
        "bounty-escrow",
        "submit-work",
        [
          types.uint(2),
          types.ascii("https://github.com/user/repo1"),
          types.ascii("First submission")
        ],
        address2
      );
      
      // Second submission from same address should fail
      const response = simnet.callPublicFn(
        "bounty-escrow",
        "submit-work",
        [
          types.uint(2),
          types.ascii("https://github.com/user/repo2"),
          types.ascii("Second submission")
        ],
        address2
      );
      
      expect(response.result).toBeErr(types.uint(105)); // ERR-ALREADY-SUBMITTED
    });

    it("should fail submission to non-existent bounty", () => {
      const response = simnet.callPublicFn(
        "bounty-escrow",
        "submit-work",
        [
          types.uint(999),
          types.ascii("https://github.com/user/repo"),
          types.ascii("Submission to nowhere")
        ],
        address2
      );
      
      expect(response.result).toBeErr(types.uint(101)); // ERR-BOUNTY-NOT-FOUND
    });
  });

  describe("Verification and Payment", () => {
    it("should allow bounty creator to verify submission", () => {
      // Create bounty
      simnet.callPublicFn(
        "bounty-escrow",
        "create-bounty",
        [
          types.uint(1000000),
          types.ascii("Verification test"),
          types.ascii("Test description"),
          types.ascii("Test requirements"),
          types.uint(1000)
        ],
        address1
      );
      
      // Submit work
      simnet.callPublicFn(
        "bounty-escrow",
        "submit-work",
        [
          types.uint(3),
          types.ascii("https://github.com/user/completed"),
          types.ascii("Work completed successfully")
        ],
        address2
      );
      
      // Get initial balance
      const initialBalance = simnet.getStxBalance(address2);
      
      // Verify submission (as creator)
      const response = simnet.callPublicFn(
        "bounty-escrow",
        "verify-submission",
        [types.uint(3), types.principal(address2)],
        address1
      );
      
      expect(response.result).toBeOk(types.bool(true));
      
      // Check payment was made
      const finalBalance = simnet.getStxBalance(address2);
      expect(finalBalance).toBe(initialBalance + 1000000);
      
      // Check bounty status updated
      const bounty = simnet.callReadOnlyFn(
        "bounty-escrow",
        "get-bounty",
        [types.uint(3)],
        address1
      );
      
      const bountyData = bounty.result.expectSome();
      expect(bountyData.data.status).toStrictEqual(types.ascii("completed"));
      expect(bountyData.data.winner).toStrictEqual(types.some(types.principal(address2)));
    });

    it("should allow approved verifier to verify submission", () => {
      // Add verifier
      simnet.callPublicFn(
        "bounty-escrow",
        "add-verifier",
        [types.principal(address3)],
        deployer
      );
      
      // Create bounty
      simnet.callPublicFn(
        "bounty-escrow",
        "create-bounty",
        [
          types.uint(1000000),
          types.ascii("Verifier test"),
          types.ascii("Test description"),
          types.ascii("Test requirements"),
          types.uint(1000)
        ],
        address1
      );
      
      // Submit work
      simnet.callPublicFn(
        "bounty-escrow",
        "submit-work",
        [
          types.uint(4),
          types.ascii("https://github.com/user/verified"),
          types.ascii("Work for verifier approval")
        ],
        address2
      );
      
      // Verify with approved verifier
      const response = simnet.callPublicFn(
        "bounty-escrow",
        "verify-submission",
        [types.uint(4), types.principal(address2)],
        address3
      );
      
      expect(response.result).toBeOk(types.bool(true));
    });

    it("should prevent unauthorized verification", () => {
      // Create bounty
      simnet.callPublicFn(
        "bounty-escrow",
        "create-bounty",
        [
          types.uint(1000000),
          types.ascii("Auth test"),
          types.ascii("Test description"),
          types.ascii("Test requirements"),
          types.uint(1000)
        ],
        address1
      );
      
      // Submit work
      simnet.callPublicFn(
        "bounty-escrow",
        "submit-work",
        [
          types.uint(5),
          types.ascii("https://github.com/user/unauthorized"),
          types.ascii("Unauthorized verification attempt")
        ],
        address2
      );
      
      // Try to verify with unauthorized address
      const response = simnet.callPublicFn(
        "bounty-escrow",
        "verify-submission",
        [types.uint(5), types.principal(address2)],
        address3 // Not creator or approved verifier
      );
      
      expect(response.result).toBeErr(types.uint(100)); // ERR-NOT-AUTHORIZED
    });
  });

  describe("Bounty Cancellation", () => {
    it("should allow creator to cancel open bounty", () => {
      // Create bounty
      simnet.callPublicFn(
        "bounty-escrow",
        "create-bounty",
        [
          types.uint(1000000),
          types.ascii("Cancel test"),
          types.ascii("Test description"),
          types.ascii("Test requirements"),
          types.uint(1000)
        ],
        address1
      );
      
      const initialBalance = simnet.getStxBalance(address1);
      
      // Cancel bounty
      const response = simnet.callPublicFn(
        "bounty-escrow",
        "cancel-bounty",
        [types.uint(6)],
        address1
      );
      
      expect(response.result).toBeOk(types.bool(true));
      
      // Check refund
      const finalBalance = simnet.getStxBalance(address1);
      expect(finalBalance).toBe(initialBalance + 1000000);
    });

    it("should prevent non-creator from cancelling", () => {
      // Create bounty
      simnet.callPublicFn(
        "bounty-escrow",
        "create-bounty",
        [
          types.uint(1000000),
          types.ascii("Auth cancel test"),
          types.ascii("Test description"),
          types.ascii("Test requirements"),
          types.uint(1000)
        ],
        address1
      );
      
      // Try to cancel with different address
      const response = simnet.callPublicFn(
        "bounty-escrow",
        "cancel-bounty",
        [types.uint(7)],
        address2
      );
      
      expect(response.result).toBeErr(types.uint(100)); // ERR-NOT-AUTHORIZED
    });
  });

  describe("Verifier Management", () => {
    it("should allow contract owner to add verifier", () => {
      const response = simnet.callPublicFn(
        "bounty-escrow",
        "add-verifier",
        [types.principal(address1)],
        deployer
      );
      
      expect(response.result).toBeOk(types.bool(true));
      
      // Check verifier was added
      const isVerifier = simnet.callReadOnlyFn(
        "bounty-escrow",
        "is-verifier",
        [types.principal(address1)],
        deployer
      );
      
      expect(isVerifier.result).toStrictEqual(types.bool(true));
    });

    it("should allow contract owner to remove verifier", () => {
      // First add verifier
      simnet.callPublicFn(
        "bounty-escrow",
        "add-verifier",
        [types.principal(address2)],
        deployer
      );
      
      // Then remove
      const response = simnet.callPublicFn(
        "bounty-escrow",
        "remove-verifier",
        [types.principal(address2)],
        deployer
      );
      
      expect(response.result).toBeOk(types.bool(true));
      
      // Check verifier was removed
      const isVerifier = simnet.callReadOnlyFn(
        "bounty-escrow",
        "is-verifier",
        [types.principal(address2)],
        deployer
      );
      
      expect(isVerifier.result).toStrictEqual(types.bool(false));
    });

    it("should prevent non-owner from managing verifiers", () => {
      const response = simnet.callPublicFn(
        "bounty-escrow",
        "add-verifier",
        [types.principal(address3)],
        address1 // Not the owner
      );
      
      expect(response.result).toBeErr(types.uint(100)); // ERR-NOT-AUTHORIZED
    });
  });

  describe("Read-only Functions", () => {
    it("should return correct bounty count", () => {
      const initialCount = simnet.callReadOnlyFn(
        "bounty-escrow",
        "get-bounty-count",
        [],
        address1
      );
      
      // Create a bounty
      simnet.callPublicFn(
        "bounty-escrow",
        "create-bounty",
        [
          types.uint(1000000),
          types.ascii("Count test"),
          types.ascii("Test description"),
          types.ascii("Test requirements"),
          types.uint(1000)
        ],
        address1
      );
      
      const finalCount = simnet.callReadOnlyFn(
        "bounty-escrow",
        "get-bounty-count",
        [],
        address1
      );
      
      expect(finalCount.result).toStrictEqual(
        types.uint(initialCount.result.expectUint() + 1n)
      );
    });

    it("should return contract owner", () => {
      const owner = simnet.callReadOnlyFn(
        "bounty-escrow",
        "get-contract-owner",
        [],
        address1
      );
      
      expect(owner.result).toStrictEqual(types.principal(deployer));
    });
  });
});