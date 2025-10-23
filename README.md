# Web3Signer

A small full scale application deployed on Cloud Run to demonstrate full stack software engineering

- [Web3SignerUI](https://web3-signer-ui-dev-200826395872.us-central1.run.app/)
- [Web3SignerAPI](https://web3-signer-api-dev-200826395872.us-central1.run.app)

## Pre Amble

To whom it may concern, I got a little carried away when I was having fun building this.None the less served as a good proof of concept for full stack development alongside web3 principles with infrastrucure deployment. Tried to make sure the bare bones got hit and this acted as a good exercise to keep me fresh regardless.

Additionally I included a file called initial_prompt.md as a discussion with Barney surmised how much vibe coding was almost a requirement in the industry these days so I thought it may be interesting to see how I go about starting a PRD off with LLMs. I of course prompted much more, but that prompt served as the primary guard rail and PRD that I would use to reset the LLM conversation context on.

This was made using a various pieces of what I consider the modern js/ts stack including NX with PNPM. Developers should be able to follow this readme to get things going fairly easily. If you have issues, please add them to the issues or message me. For what it's worth I ran and developed this primarily on an x64 Linux distro and deployed on GCP Cloud Run.

As a last tidbit I included things I surmised from my QA session in the fixes section at the bottom. This kind of acts more of a guide as to how I think and look for improvements.

## Primary Features

- Headless API capable of: 
    - Authentication and lite user management through decentralized Web3 Wallet
    - In house multi factor authentication using TOTP pattern
    - Message signature verification endpoints
    
- Streamlines UI with:
    - Headless, no hassle sign in through dynamic w/ email
    - Multiple Web3 Wallet Sign Through Web3Connect
    - Interactions for seting up MFA

## Getting Started

### Run DB

A local psql server should be ran, to do this quickly use docker:

`docker run --name local-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=web3signer -p 5432:5432 -d postgres:15`

This would allow the following database env: `DATABASE_URL="postgresql://postgres:postgres@localhost:5432/web3signer"`

### Run App

To run tasks with Nx use:

1. Install dependencies: `pnpm install`*

*If no pnpm run `npm i -g pnpm` first.

2. Copy example envs `cp apps/api/.env.example apps/api/.env && cp apps/ui/.env.example apps/ui/.env` 

3. Fill out ENVs with required keys. 

Mainly: `VITE_DYNAMIC_ENVIRONMENT_ID` && `VITE_WALLETCONNECT_PROJECT_ID` && `` in UI

They are both optional, however if nither ENV is filled, no option will not be available for sign in

4. Ensure a psql docker is running locally and the DATABASE_URL is set in ENV (If .env.example was copied you should be good)

3. Run generations and migration `pnpm api:prisma:generate` && `pnpm api:prisma:migrate`

4. `pnpm dev` to run the nx runner*; 

*`pnpm dev:ui` and `pnpm dev:api` are also provided as sometimes the TUI causes issues so I just run them in two terminals or byobu for dev

## Test Suite

The API currently has a test suite for the most critical things and can be run with `pnpm nx run api:test` from the project root after database setup

## QA Session 

Tested primarily in Chrome with some Firefox sprinkled in

MFA Tested with *Google Authenticator* only

- [x] User can login with Dynamic 
    - [x] Rejection of signature doesnt allow login
    - [x] User can sign and verify a message with a Dynamic Wallet
    - [x] User can sign batch messages for verification with a Dynamic Wallet
    - [x] User can setup MFA
    - [x] User can login using MFA with Dynamic base login
    - [x] User can logout with Dynamic Wallet
- [x] User can login with Metamask using Web3Connect (Other wallets not tested)
    - [x] Rejection of signature doesnt allow login
    - [x] User can sign and verify a message with Metamask
    - [x] User can sign batch messages for verification with Metamask
    - [x] User can setup MFA with Metamask
    - [x] User can login Using MFA with Metamask base login
    - [x] User can logout with Metamask

## Known Bugs Things To Add / Patch Checklist (From My QA Session)

### Bugs

[] - Metamask Login can fail to present message signature if wallet is locked in the middle, or timeout locked, refresh solves.
[] - Metamask Signature can sometimes hide itself, add UX to remind the user to check in browser wallet notifications
[] - Dynamic has hanged for me at times on login and doesnt send signature request, however I have had trouble reproducing it well enough to test it, refresh solves generally
[] - Fix double sending toast message on some actions 
[] - If a dynamic login is left incompleted and user tries to switch to webconnect login, dynamic will continue to prompt for signature.
    - This seems to happen if a user leaves after signing the login but not completing 2FA check

### UX Tweaks

[] - Fix light version, it is ugly, initial dev prioritized dark
[] - Provide UI feedback between wallet connect and sign (slight lag, needs assurance text and loader)

### General

[] - Clean up extra prisma files (only need psql at this point other than for testing, scripts need updated, default to prisma.schema)
[] - Clean up log vomit from debugging
[] - Clean up overly verbose LLM commentary from assisted dev
[] - Optimize API Dockerfile (Building twice for a multi-build step, probably unnecessary)
[] - Dry up some repetition that I created when cleaning up LLM components, namely between the UI MFA and OTP components
[] - Add E2E testing in addition to the unit testing in the API
[] - Add UI testing
[] - Setup branch protections to follow protocol on modern CI/CD patterns (deploy dev@main and prod@production) 
[] - Add test suite to ci/cd pipeline as a prerequisite

### Feature Goals

[] - Add swagger
[] - Allow deleting messages (API is done, neeed to implement UI...)
[] - Unify types between front and back-end by abstracting to an external package
[] - Auto accept email OTP code entry (DO same checks that are in OTP component or abstract)
[] - Remove multiple contexts in exchange for redux or similar reducers in UI code 
[] - Allow removing multi factor auth

### Stretch goals

[] - If really ambitious add terraform to deploy on minikube and GCP for quick up/down


