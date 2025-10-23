I was sent a PRD as a coding challenge which you can find an initial PRD below in the section called `The PRD`, the goal is to implement everything within this but add additional flare through the features outlined in `Additional Features`. 

*IMPORTANT:* Please inquire for additional context before coding, verify requirements and ask for docs if needed. Ask for a verbose greenlight before engaging in coding.

# The PRD

Task: **Web3 Message Signer & Verifier**

React + Dynamic.xyz Headless Implementation (Frontend) | Node.js + Express (Backend)

## Objective
Build a full-stack Web3 app that allows a user to:

1. Authenticate using a **Dynamic.xyz embedded wallet headless implementation https://www.dynamic.xyz/docs 
Do not simply implement the Widget! Use the headless implementation

2. Enter and **sign a custom message** of the user's choosing

3. Send the signed message to a **Node.js + Express** backend

4. Backend verifies the signature and responds with validity + address

## :wrench: Requirements

### Frontend (React 18+)
* Integrate Dynamic.xyz Embedded Wallet
* After authentication:
   * Show connected wallet address
   * Provide a form to input a custom message
   * Let user sign the message
   * Submit `{ message, signature }` to backend
* Show result from backend:
   * Whether the signature is valid
   * Which wallet signed it
* Allow signing multiple messages (show a local history)

**Note:** How you structure the React app is up to you — but the app complexity is high enough that good React patterns will shine through.

### Backend (Node.js + Express – required)

* Create a REST API endpoint: `POST /verify-signature`

* Accept:
```json
{ "message": "string", "signature": "string" }
```
* Use `ethers.js` (or `viem`) to:
   * Recover the signer from the signature
   * Validate the signature

* Return:
```json
{ "isValid": true, "signer": "0xabc123...", "originalMessage": "..." }
```

## Behavior & Constraints
* Session state can be in-memory (no DB required)
* Message signing history should persist across React component state or localStorage
* No third-party signature validation services — use raw `ethers.js`, `viem` or similar in backend

## Submission Guidelines
* Submit your work to a **Github Repository**

* Include:
   * Setup instructions for both frontend and backend in a README.md file
   * Notes on any trade-offs made or areas you'd improve
   * A test suite with all tests passing

* Bonus: Implement headless **multi-factor auth** to secure the user
* Bonus: Link to deployed version (e.g., Vercel frontend, Render backend)

## Evaluation Focus
| Area | Evaluated On |
|------|-------------|
| **React architecture** | Component design, state flow, hooks, separation of concerns |
| **Dynamic.xyz usage** | Clean login, wallet context management, signing flow |
| **Node.js + Express** | REST API correctness, signature validation logic, modularity |
| **Code quality** | Readability, organization, error handling, TypeScript use |
| **User experience** | Clear flows, responsive feedback, intuitive UI |
| **Extensibility** | Evidence of scalable thought (e.g., room for auth, roles, message types) |
| **Design** | Beautiful UX design skills are important to us. Make the app look and feel great |

# Additional Features

The following features are to showcase further develop strategies by implementing the following in addition to the initial PRD:

## General

- Use PNPM & NX; Ensure types are shared across the two codebases.
   - Use a shared typescript configuration across the monorepo
   - NX Plugins can be used nx/react, nx/node as needed
   - Create: `ui`, `api`, and `utils` where utils in the shared package for keeping types and shared utility logic
   - The entire stack should be able to be ran with `pnpm dev` from root
   - Plan for ci/cd to be separate and include Dockerfiles for both `ui` and `api` projects with individual build commands for each to run in github actions
- Use ZOD for type safety

## Frontend / UX

- Lets support two login methods, OTP Headless as requested through Dynamic (https://www.dynamic.xyz/docs/react-native/signup-login/email-and-sms-verification#headless-mode) as well as WalletConnect v3, so I can with metamask as well, allow two login types on the main screen one says "Login with Dynamic" and another says "Login With WalletConnect" have Dyamic be the primary colored button 

- Use tailwind to create a seamless user experience; make sure we abstract our components and stylize them within their files and do not litter styles needlessly across the repository, **emphasize DRY**, make sure we setup a tailwind style as well

- Include a dark mode toggle, default to a dark mode theme, have the primary palette be:

   Dark Mode BG: 351E29 (Dark Purple), Primary: 28502E (Poly Green), Secondary: 80ADA0 (Cambridge Blue), you are allowed to modify these if necessary

- Login UX Flow (Dynamic) (I will supply dynamic environment variables from my dev account)
   - User clicks option to `Login With Dynamic`
   - Use follows OTP requests to login with Dynamic
   - When a user is successfully logged in with Dynamic ask them to sign message `login` and send to our API, ensure the user knows why
   - Finish login sequence on backend and return the user session from the `/auth` endpoint

- Login UX Flow (WalletConnect)
   - User clicks option to `Login With WalletConnect`
   - User is prompted with WCwidget and selects login wallet
   - When a user is successfully logged in ask them to sign message `login` and send to our API, ensure the user knows why
   - Finish login sequence on backend and return the user session from the `/auth` endpoint

If a user does not sign the follow up message request the primary showing CTA should change to "Finish Login" which will display the reasoning behind requesting the additional signature which is "You must sign a login message to login to this web application"

- Modify signing on the front end by doing the following while still showcasing the request api endpoint from the PRD verbatim:
   - A user should be able to swith between single sign, and batch signing modes via a mode select at the top of the UI
      - Single sign allows a user to add and send a single message to `/verify-signature` as defined in the PRD
         - UX Flow:
            - User had an input available to enter a message for signature
            - User clicks a primary "sign" to request a signature from connected wallet
            - It is automatically submitted to the api for validation
            - Make sure we give user feedback, use toasts or UI updates (react-toastify)
      - Batch sign allows a user to add multiple signatures to an array of `{ "message": "string", "signature": "string" }` objects 
            - User has an input available to enter a message for signature
            - Use clicks "Add Signature" to request a signature from connected wallet
            - Signed message is added to an array for sending to API
            - User has an additional button called `Validate Signatures` which calls `/validate-message-multi` with the array of signatures/messages
            - Make sure we give user feedback, use toasts or UI updates (react-toastify)
         - This array will be sent to `/verify-signature-multi` which will iterate each array and only add them to the DB and send a valid response *if all* signatures are correct. If any signature fails, fall fast and hard. 
         - Use the same utility functions for verification from the single sign make sure they are abstract; Emphasize DRY modular code.
   - Both modes should use as similar a layout as possible 

- Provide a logout button that ends the session on the server and disconnects the wallet

- Message history should be displayed as a paginated table at the lower portion of the application, it should be slim line and easily readable, `auth` will return the latest 10 messages, and `/messages` can be paginated via POST parameters

- Design should be mobile first, but work in browser, cap width at 1440px

## Backend / API

- Use sqlite as a database w/ prisma on top of express to define our schemas (api/db/database.db)
    - Define a schema that includes at minimum signer(string), valid(bool), message(string), and timestamp(date) 
    - For session management use express-session with an SQLite Store, include schema for session management so they persist
    - INclude DB migrations for development only for now (They will essentially be the same, this is a POC application)

- Lets allow a user to login in the backend by sending a message w/ the text "login" after the wallet is connected and track these sessions in the server and db, this /auth endpoint will return the previous signed messages their validity and who signed them, as well as the user profile. `/auth` can additionally be called if a session is active to get user info again, if auth is called after a session reject and client should handle accordingly.

- Create `/validate-signature` as defined in the PRD

- Create `/validate-signature-multi` as defined the additional requests

- Create `/auth/logout` to logout session, client should handle wallet disconnect

- Create routes as described in MFA for optional multi factor auth

- We will add ci/ci for GCP at the end, but an additional prompt will focus for this, do not include in the primary response, just ensure Docker containers can be built for each service.

- CORS origins should be set through an environment variable

- Response structs should include: {error(String||""), status(Int), success(Bool)}

## DB Thoughts

Potential DB Schemas:

user: contains id, address, role (default to 'user'), mfa(bool), awaiting_mfa
auth: relates to user.id, contains mfa, awaiting_mfa, and mfa_timeout_timestamp, mfa_authenticator_subset
message: relate to user.id, contains message, signature

### Notes

`awaiting_mfa` boolean refers to a user who is mid-mf-enable but has not submitted the verification message to `/auth/mfa/verify`
once a user has verified `awaitig_mfa` should be false and mfa should be set to true.

`mfa_timeout_timestamp` is timestamped when a user logs in *if* they have MFA enabled, if MFA verify is called 5 mins after this timestamp the user must attempt to log back in, the error should refer to an expired MFA window

`mfa_bonus_phrase` is a temporary additional secret that is returned with /auth when a user logs in if they have MFA enabled, this secret must be returned with the `/auth/mfa` and is a random string generated at login

## MFA

The login endpoint response when MFA is enabled will be {success: bool, mfa: true}

Headless MFA should use an OTP that we generate using the user's address and a server side salt, we can use otplib for the OTP generation and the generated secret should be regenerated on the fly as we will know the users address and salt, this means we can use a deterministic on the fly generation for the TOTP so we do not need to store it in the DB

The server side MFA secret should be set as an environment variable

The following routes are needed

`/auth/mfa/initialize` - A user must submit a signature of the message `enableMFA`, this will return the qr code for a user to scan and verify
mfa will not switch to enabled until a user called `/auth/mfa/enable/verify` to verify the MFA code
`/auth/mfa/verify` - A user submits a generated MFA code as {mfa_code: string} to fully enable MFA

`/auth/mfa` - must be called after `login` with {mfa_code, mfa_bonus_phrase}, for users that have MFA enabled to finish login

## Testing

- Testing should be inclusive but not overbearing, ensure integration testing of each route, as well as decent init test coverage

- E2E tests can be included in the front-end to ensure user flow completion
   - E2E tests can use a test wallet since we are not issuing TXs, we can use any random private key

- Jest can be used and aim for 70% coverage

## Dockerfiles

Include dockerfiles in `api/Dockerfile` and `ui/Dockerfile` that can build their respective apps for deployment

## Environment

Please provide a comprehensive .env.example file to fill out

# Summary

Remember, please read the entire document and ask questions first, no coding yet, seek clarification.