# Code Bounty Escrow Smart Contract

A secure escrow system for managing code bounties on the Stacks blockchain. This smart contract enables developers to post bounties for coding work and automatically handles fund escrow, submission verification, and payment release.

## 🚀 Features

- **Secure Escrow**: Funds are held in the contract until work is verified and approved
- **Flexible Verification**: Bounty creators or approved verifiers can validate submissions
- **Deadline Management**: Built-in deadline enforcement for timely completion
- **Submission Tracking**: Complete audit trail of all submissions and verifications
- **Refund Protection**: Creators can cancel open bounties and receive refunds
- **Multi-Verifier Support**: Contract owner can designate trusted third-party verifiers

## 🏗️ Contract Overview

### Core Components

1. **Bounty Management**: Create, track, and manage coding bounties
2. **Submission System**: Developers submit their completed work with documentation
3. **Verification Process**: Authorized parties verify and approve submissions
4. **Payment Release**: Automatic STX transfer upon successful verification
5. **Cancellation System**: Safe cancellation and refund mechanism

### Data Structures

- **Bounties**: Store bounty details, requirements, deadlines, and status
- **Submissions**: Track submitted work with URLs and verification status
- **Verifiers**: Manage approved third-party verifiers

## 📋 Contract Functions

### Public Functions

#### `create-bounty`
Creates a new bounty with escrowed STX funds.

```clarity
(create-bounty amount title description requirements deadline)
```

**Parameters:**
- `amount` (uint): STX amount in microSTX (1 STX = 1,000,000 microSTX)
- `title` (string-ascii 100): Brief bounty title
- `description` (string-ascii 500): Detailed bounty description
- `requirements` (string-ascii 1000): Technical requirements and deliverables
- `deadline` (uint): Block height deadline for submissions

#### `submit-work`
Submit completed work for a bounty.

```clarity
(submit-work bounty-id submission-url description)
```

**Parameters:**
- `bounty-id` (uint): ID of the target bounty
- `submission-url` (string-ascii 200): URL to the completed work (GitHub, etc.)
- `description` (string-ascii 500): Description of the submitted work

#### `verify-submission`
Verify and approve a submission (releases payment).

```clarity
(verify-submission bounty-id submitter)
```

**Parameters:**
- `bounty-id` (uint): ID of the bounty
- `submitter` (principal): Address of the submission author

#### `cancel-bounty`
Cancel an open bounty and receive refund.

```clarity
(cancel-bounty bounty-id)
```

**Parameters:**
- `bounty-id` (uint): ID of the bounty to cancel

#### `add-verifier` / `remove-verifier`
Manage approved verifiers (contract owner only).

```clarity
(add-verifier verifier-address)
(remove-verifier verifier-address)
```

### Read-Only Functions

- `get-bounty(bounty-id)`: Retrieve bounty details
- `get-submission(bounty-id, submitter)`: Get submission information
- `is-verifier(address)`: Check if address is an approved verifier
- `get-next-bounty-id()`: Get the next bounty ID
- `get-contract-owner()`: Get contract owner address
- `get-bounty-count()`: Get total number of bounties created

## 🔧 Setup and Deployment

### Prerequisites

- [Clarinet](https://github.com/hirosystems/clarinet) installed
- Stacks wallet for deployment
- Node.js for running tests

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd code-bounty-escrow
```

2. Initialize Clarinet project (if not already done):
```bash
clarinet new bounty-escrow
cd bounty-escrow
```

3. Add the contract to your `Clarinet.toml`:
```toml
[contracts.bounty-escrow]
path = "contracts/bounty-escrow.clar"
```

### Testing

Run the comprehensive test suite:

```bash
clarinet test
```

The test suite covers:
- Bounty creation and validation
- Work submission workflows
- Verification and payment processes
- Authorization and security checks
- Edge cases and error handling

### Deployment

1. **Testnet Deployment**:
```bash
clarinet deploy --testnet
```

2. **Mainnet Deployment**:
```bash
clarinet deploy --mainnet
```

## 💡 Usage Examples

### Creating a Bounty

```clarity
;; Create a 5 STX bounty for a React app
(contract-call? .bounty-escrow create-bounty 
    u5000000  ;; 5 STX in microSTX
    "React Todo App"
    "Build a responsive todo application with React and TypeScript"
    "Must include: React 18+, TypeScript, responsive design, unit tests, README"
    u1000)    ;; Deadline at block 1000
```

### Submitting Work

```clarity
;; Submit completed work
(contract-call? .bounty-escrow submit-work 
    u1  ;; Bounty ID
    "https://github.com/developer/react-todo-app"
    "Completed React todo app with all requirements. Includes comprehensive tests and documentation.")
```

### Verifying Submission

```clarity
;; Verify and release payment (as bounty creator or approved verifier)
(contract-call? .bounty-escrow verify-submission 
    u1  ;; Bounty ID
    'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM)  ;; Submitter address
```

## 🔒 Security Features

- **Escrow Protection**: Funds locked in contract until verification
- **Authorization Checks**: Only authorized parties can verify submissions
- **Deadline Enforcement**: Prevents submissions after deadlines
- **Duplicate Prevention**: One submission per address per bounty
- **Refund Safety**: Creators can safely cancel unused bounties

## 📊 Contract States

### Bounty Status
- `"open"`: Accepting submissions
- `"submitted"`: Work has been submitted
- `"completed"`: Work verified and payment released
- `"cancelled"`: Bounty cancelled and refunded

### Error Codes
- `u100`: Not authorized
- `u101`: Bounty not found
- `u102`: Bounty not open
- `u103`: Insufficient funds
- `u104`: Deadline passed
- `u105`: Already submitted
- `u106`: Not verifier
- `u107`: Submission not found
- `u108`: Invalid status

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in the GitHub repository
- Join our Discord community
- Check the [Stacks documentation](https://docs.stacks.co/)

## 🔮 Roadmap

- [ ] Multi-milestone bounties
- [ ] Reputation system for developers
- [ ] Integration with GitHub webhooks
- [ ] Mobile-friendly frontend
- [ ] Dispute resolution mechanism
- [ ] Category-based bounty filtering

---

**Built with ❤️ on Stacks blockchain**