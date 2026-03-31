# MedWMS — Wholesale Management System

🌐 **Live Demo:** [Click here to view the project live](https://palak-2811.github.io/MedWMS/)

![MedWMS Dashboard](Screenshot%202026-03-31%20213519.png)

MedWMS is a modern, highly interactive wholesale distribution management platform built to handle the end-to-end flow of pharmaceutical orders. It features a complete modular architecture with zero backend dependencies, utilizing the browser's local storage for data persistence and HTML5 Canvas for real-time visualizations.

## ✨ Core Features

- **Premium UI & Theming:** Responsive glassmorphism design featuring a fully functional Dark/Light mode toggle that remembers user preferences.
- **Persistent Authentication:** Frontend login and sign-up flow backed by `localStorage` (`wms_users`), allowing users to create accounts and maintain their sessions.
- **Wholesaler Dashboard (`admin.html`):** A centralized command center featuring real-time KPIs, order tables, and dynamic chart visualizations.
- **Order Placement (`order.html`):** Retailer forms with automatic 18% GST calculation and a built-in digital signature pad.
- **Automated Invoicing (`bill.html`):** Instantly generates professional, print-ready GST invoices complete with a dynamic status watermark and embedded signature.
- **Animated Tracking (`track.html`):** Enter any Order ID to see a live visual journey of the shipment rendered dynamically via Canvas animations.

## 🛠 Tech Stack

Since this project was designed as a high-fidelity frontend prototype, there are explicitly **no backend dependencies** (no Node, no MongoDB, no installations required).

- **Structure:** HTML5
- **Styling:** Vanilla CSS3 (Custom properties, Flexbox/Grid, Animations)
- **Logic:** Vanilla ES6 JavaScript (Classes, Proxies, Intersection Observers)
- **Data Layer:** Browser `localStorage` (via custom Reactivity Proxy)
- **Visuals:** HTML5 `<canvas>` API (Signatures, Doughnut/Bar charts, Parallax Particles, Delivery tracking)

## 📁 Project Structure

```text
medwms/
├── index.html           # Landing & Feature Homepage
├── login.html           # Authentication & Sign-Up flow
├── admin.html           # Wholesaler Dashboard (KPIs & Charts)
├── order.html           # Retailer Order & Signature capture
├── bill.html            # GST Invoice Generation
├── track.html           # Shipment Tracker Visualization
├── style.css            # Global application styles & Dark Mode
├── landing.css          # Landing page specific styles
├── app.js               # Core Business Logic (OrderStore, Proxy DB)
├── landing.js           # Scroll animations & landing interactions
├── charts.js            # HTML5 Canvas Chart Rendering
├── animations.js        # Intersection Observers & Web Animations API
├── signature.js         # Canvas Signature Pad Logic
└── tracker-canvas.js    # Canvas shipment progression animation
```

## 🚀 How to Run Locally

You do not need to install anything to run this project!

1. Clone or download this repository to your local machine.
2. Open the enclosing folder.
3. Double click on `index.html` to open it in your web browser (Chrome, Firefox, Safari, Edge).
4. Click **"Sign In"** from the landing page.
5. Either use the **Demo Credentials** (`admin` / `medwms123`) or create a new account by clicking **"Sign up today"**.

## 📝 Usage Notes
- Because the data is stored in your specific browser's `localStorage`, orders and users will safely persist if you close and reopen the tab. However, they will reset if you clear your browser's site data or open the project in an entirely different browser/device.
- Designed optimally for desktop viewing but includes responsive CSS for mobile/tablet environments.

## 📄 License
This project was developed for academic/presentation submission purposes.
