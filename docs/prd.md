# Product Requirement Document (PRD)

## Project: ReqLab (Browser-Based HTTP Client)

**Author:** Frontend Developer (10 YOE React / First-time Vue)  
**Version:** 1.0.0 (MVP)  
**Status:** Approved

---

## 1. Executive Summary & Objective

ReqLab is a lightweight, browser-based HTTP client designed for developers to quickly test APIs, inspect headers, and visualize payloads directly from their browser window. This project serves a dual purpose:

1. Providing a highly responsive, zero-install alternative to heavy desktop tools like Postman.
2. Serving as an intentional, high-fidelity production sandbox for an experienced React developer to learn and master **Vue 3**, **TypeScript**, and the **Composition API**.

---

## 2. Target Audience & Personas

- **Persona:** The Agile Frontend/Backend Engineer.
- **Core Need:** Wants to quickly shoot a request to a local or public endpoint without launching an entire Electron app, syncing workspaces, or dealing with cloud sign-ins.
- **Preferences:** Demands a dark-themed, keyboard-friendly UI with zero friction, instantaneous responses, and readable typography.

---

## 3. Technology Stack & Architecture

To maximize the Vue learning curve while avoiding unnecessary runtime overhead, the architecture explicitly avoids server-side complexity for the MVP.

- **Framework:** Vue 3 (Single Page Application via Vite)
- **Language:** TypeScript (`<script setup lang="ts">`)
- **Component Library:** `PrimeVue` (configured in Unstyled/Tailwind Mode) OR `shadcn-vue` (for direct architectural comparison to React's Radix implementations).
- **Styling:** Tailwind CSS + Scoped CSS/Sass (`<style lang="scss" scoped>`).
- **State Management:** Localized reactive composition stores using native Vue 3 `reactive` and `ref` primitives (no Pinia for MVP).
- **HTTP Layer:** Native Browser Web API (`fetch`).

---

## 4. Feature Requirements (MVP Scope)

### 4.1. Single-Page Interactive Layout

The interface must present a classic split-pane orientation optimized for large screens, shifting to a stacked layout on smaller viewport breaks.

- **FR-1.1 (Method Selector):** A dropdown supporting `GET`, `POST`, `PUT`, `DELETE`, and `PATCH`. Each method must render with its standardized REST color indicator (e.g., GET is green, POST is blue/yellow).
- **FR-1.2 (URL Bar):** A text input validating for well-formed URLs. Must execute the request on pressing `Cmd/Ctrl + Enter`.
- **FR-1.3 (Action Trigger):** A prominent "Send" button that transitions into a loading/cancel state during in-flight network activity.

### 4.2. Request Configuration Tabbed View

Below the URL bar, an expandable tab interface will house the request configurations:

- **FR-2.1 (Headers Grid):** A dynamic, key-value tabular interface allowing users to inject custom Request Headers.
  - _Interactivity:_ Clicking "Add Row" generates empty inputs. Empty lines are ignored upon execution.
- **FR-2.2 (Body Payload):** A multi-line textarea with raw text input.
  - _Constraint:_ Visually disabled and blocked when the active method is `GET`. Body is allowed for `DELETE`, `POST`, `PUT`, and `PATCH`.
  - _Validation:_ Basic client-side JSON format checks before dispatching.

### 4.3. Response Inspector

The layout's secondary region handles the visual presentation of results returned from the browser's fetch routine.

- **FR-3.1 (Metadata Sub-bar):** Displays critical status metrics upon response termination:
  - HTTP Status Code & Text (e.g., `200 OK` or `404 Not Found`), color-coded by status range (2xx green, 4xx/5xx red).
  - Request round-trip execution latency calculated in milliseconds (`ms`).
- **FR-3.2 (Payload Visualization):** An isolated display rendering pretty-printed JSON in monospace font with indentation, in a scrollable container for the MVP (no virtualization). If the response body is not valid JSON (or Content-Type is not `application/json`), display a clear inline message: _"Response is not JSON. Non-JSON rendering is not supported in MVP."_

---

### 4.4. Error States

All errors must be surfaced inline — no modal interruptions. Each error replaces the response panel content and is color-coded red.

- **FR-4.1 (Network Failure):** When the browser cannot reach the host (DNS failure, connection refused, timeout), display: _"Network Error: Unable to reach [host]. Check the URL and your connection."_
- **FR-4.2 (CORS Block):** When the browser blocks the request due to a CORS policy violation, display: _"CORS Error: The target server did not allow this request from the browser. See the CORS workaround guide above."_
- **FR-4.3 (Invalid URL):** If the URL field fails validation on send, highlight the input border red and display an inline field-level message: _"Invalid URL. Must start with http:// or https://"_. Request is not dispatched.
- **FR-4.4 (Invalid JSON Body):** If the body tab contains malformed JSON when sending a non-GET request, highlight the textarea border red and display: _"Request body is not valid JSON. Fix the syntax or clear the field."_. Request is not dispatched.
- **FR-4.5 (Request Timeout):** Requests that exceed 30 seconds are aborted. Display: _"Request timed out after 30s."_

---

## 5. Non-Functional & Structural Vue Learning Requirements

To validate proficiency in Vue 3 architectural mental models, the implementation must explicitly use:

- **NFR-1 (Composables Pattern):** All fetching operations, latency math, loading flags, and error states must decouple from structural view markups and live inside a reusable `useFetchClient.ts` composable.
- **NFR-2 (Two-Way Data Binding):** Forms, headers, and parameter grids must bind state properties via `v-model` mechanics to explore reactive mutations without declarative React `onChange` listeners.
- **NFR-3 (Native Isolation):** Custom layout features must utilize Vue Single-File Component (SFC) encapsulated scoped blocks (`<style scoped>`) to understand how Vite and Vue achieve local stylesheet compiling without secondary dependencies.
- **NFR-4 (Theme):** MVP theme mirrors the user's OS-level preference via the CSS `prefers-color-scheme` media query — no manual toggle. Post-release (v1.1): add a theme toggle button that overrides the system preference and persists the choice to `localStorage`.
- **NFR-5 (Post-MVP, not in scope for v1.0):**
  - Virtualized rendering for large JSON payloads in the response viewer (MVP uses plain scroll).
  - Display of response headers (in addition to request status/body), in a dedicated sub-tab or section.

---

## 6. Technical Constraints, Risks & Mitigation (CORS Strategy)

### 6.1. The Browser Same-Origin Challenge

Because this app executes completely inside the user's browser runtime environment, any API call initiated against domains lacking cross-origin resource sharing permissions will be halted by default browser security features.

### 6.2. MVP Mitigations

- **CORS System Alert:** A permanent, highly legible alert header must occupy the dashboard viewport. It must explicitly state: _"Browser Security Alert: Outbound target APIs must support CORS for direct browser clients."_
- **Developer Workaround Instructions:** Include an accessible informational icon that opens a documentation modal. This modal must outline a step-by-step developer workaround command allowing users to spin up temporary isolated debug profiles inside their local browsers (e.g., starting Google Chrome via terminal flags using `--disable-web-security --user-data-dir=...`).

### 6.3. Future Mitigation (Phase 2 Roadmap)

- **Dedicated Proxy Instance:** A secondary project phase will introduce a standalone, minimal Node.js/Express proxy microservice. When activated, the Vue client redirects target queries to its local proxy server, which executes requests server-side to completely bypass browser-level origin checks.

---

## 7. Out of Scope (Future Phases)

- User authentication protocols, accounts, and session recovery.
- Multi-tenant data sync or historical logging features.
- Shared endpoint workspaces for engineering teams.
- Configurable environments and configuration variables (e.g., `{{baseUrl}}`).
