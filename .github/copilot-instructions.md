# Copilot Instructions for dyannaturner_vercepttakehome

## Project Overview
This is a single-page React application bootstrapped with Create React App. The codebase follows standard React conventions and is organized for clarity and maintainability.

## Key Files & Structure
- `src/App.js`: Main application component. Entry point for UI logic.
- `src/index.js`: ReactDOM render entry. Integrates the app with the HTML root.
- `public/index.html`: HTML template for the SPA.
- `src/App.css`, `src/index.css`: Styling for components and global styles.
- `src/reportWebVitals.js`: Optional performance reporting.
- `src/setupTests.js`, `src/App.test.js`: Testing setup and sample tests.

## Developer Workflows
- **Start Development Server:**
  - `npm start` (hot reload, runs at http://localhost:3000)
- **Run Tests:**
  - `npm test` (Jest, watch mode)
- **Build for Production:**
  - `npm run build` (outputs to `build/`)
- **Eject (Advanced):**
  - `npm run eject` (irreversible, exposes config)

## Patterns & Conventions
- Components are function-based and use hooks (see `App.js`).
- CSS modules are not used; styles are global or imported directly.
- No custom routing, state management, or API integration is present by default.
- All assets (images, icons) are stored in `public/`.
- Tests use Jest and React Testing Library (see `App.test.js`).
- No TypeScript or advanced configuration unless ejected.

## Integration Points
- No external APIs or backend services are integrated by default.
- To add new dependencies, use `npm install <package>` and import in `src/` files.
- For performance monitoring, see `reportWebVitals.js` (optional).

## Example: Adding a New Component
1. Create `src/MyComponent.js`:
   ```js
   import React from 'react';
   function MyComponent() {
     return <div>Hello!</div>;
   }
   export default MyComponent;
   ```
2. Import and use in `App.js`:
   ```js
   import MyComponent from './MyComponent';
   // ...existing code...
   <MyComponent />
   ```

## References
- [Create React App Docs](https://facebook.github.io/create-react-app/docs/getting-started)
- [React Docs](https://reactjs.org/)

---
**Feedback:** Please review and suggest updates for any missing or unclear sections.
