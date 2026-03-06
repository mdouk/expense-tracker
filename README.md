# Expense Tracker

A modern, elegant expense tracking application built with **React** and **Firebase**. This application allows users to manage projects and track expenses in real-time with a beautiful, responsive user interface.

## 🚀 Features

### 🔐 Authentication

- **Google Sign-In**: Secure and easy authentication using Firebase Auth.
- **Profile Management**: View the logged-in user's profile name.
- **Session Persistence**: Stays logged in across sessions.

### 📊 Dashboard

- **Total Overview**: View the grand total of all expenses across all projects.
- **Project Management**:
  - Create new projects with custom names.
  - **Custom Icons**: Assign emoji icons to projects (searchable picker).
  - **Categories**: Optional category labels for projects.
  - **Favorites**: Mark projects as favorites with a star toggle.
  - View project summaries including individual totals.
  - Delete projects with confirmation modal (cascading delete removes all expenses).

### 💰 Expense Management

- **Detailed Tracking**: Add expenses with:
  - Description.
  - Price (Total or Unit based).
  - Quantity.
  - Comments.
- **Flexible Pricing**: Toggle between 'Total Price' or 'Unit Price' input modes.
- **Real-time Updates**: Changes are reflected instantly across all connected clients via Firestore snapshots.
- **Transactions List**: View itemized expenses with user attribution.
- **Analysis View**: Interactive pie and bar charts showing spending by category, project, and user.

### 🎨 User Interface

- **Modern Design**: Clean aesthetics using Tailwind CSS (Zinc color palette).
- **Dark Mode**: Toggle between light and dark themes with localStorage persistence.
- **Interactive**: Smooth transitions, hover effects, and animated modals.
- **Responsive**: Fully optimized for mobile and desktop views with proper touch targets.

### 📶 Offline Support

- **Firestore Persistence**: Full offline support with IndexedDB caching.
- **Offline Indicator**: Visual indicator when the app is offline.
- **Auto-Sync**: Changes made offline are automatically synced when back online.

## 🛠 Tech Stack

- **Frontend**: React 19, Vite
- **Styling**: Tailwind CSS, PostCSS
- **Charts**: Recharts
- **Backend (BaaS)**: Firebase (Firestore, Authentication)
- **Icons**: Lucide React
- **Linting**: ESLint

## 🏗 Architecture

The application is built as a Single Page Application (SPA).

### Data Model (Firestore)

Data is structured under a specific `appId` path for multi-tenancy support (if needed in future variants).

- **Projects Collection**: Stores project metadata (name, creator, timestamp).
- **Expenses Collection**: Stores individual transaction records linked to a `projectId`.

### Component Structure

- **App (Root)**: Handles Routing (Dashboard vs Project View), Auth State, and Data Subscription.
  - **Navbar**: Global navigation, user profile, and sign-out.
  - **Dashboard View**: Displays the list of projects and grand totals.
  - **Project View**: Detailed view of a selected project with tabs for transactions and analysis.
  - **Modals**:
    - `isProjectModalOpen`: For creating new projects.
    - `isFormOpen`: For adding new expenses.
  - **Reusable Components**:
    - `Card`: A styled container for projects.
    - `Modal`: A generic wrapper for popup interactions.

## 💻 Installation & Setup

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd expense-tracker
   ```

2. **Install Dependencies**

   ```bash
   npm install
   ```

3. **Environment Setup**

   The project requires a Firebase configuration. Ensure your Firebase keys are correctly set up in `src/App.jsx` or moved to environment variables for better security.

4. **Run Locally**

   Start the development server:

   ```bash
   npm run dev
   ```

5. **Build for Production**

   Create a production-ready build:

   ```bash
   npm run deploy
   ```

## 📜 Scripts

- `npm run dev`: Starts the Vite development server locally.
- `npm run deploy`: Builds the app for production. See in package.json for the script hat combines npm run build && firebase deploy
- `npm run lint`: Runs ESLint to check for code quality issues.
- `npm run preview`: Previews the production build locally.
