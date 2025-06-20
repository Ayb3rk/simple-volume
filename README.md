# 🔊 Chrome Volume Controller

A beautiful Chrome extension that lets you control and boost the volume of each tab individually — or all tabs at once. Built with **React**, **Tailwind CSS**, and ❤️.

---

## 🚀 Features

- 🎚️ Per-tab volume control with audio boosting  
- 🔇 Mute/unmute individual tabs  
- 🔁 Persistent state across popup open/close  
- 🔉 Global volume slider for all tabs  
- 🧠 Smart global mute/unmute toggle  
- 🧼 Reset all tabs to default (100%) instantly  
- ⚡ Modern UI with Tailwind CSS  

---

## 📦 Setup (For Development)

1. **Clone the repo**

```bash
git clone https://github.com/Ayb3rk/chrome-volume-controller.git
cd chrome-volume-controller
```

2. **Install dependencies**

```bash
npm install
```

3. **Run Vite in watch mode**

```bash
npm run dev
```

4. **Load into Chrome**

- Open `chrome://extensions`
- Enable “Developer mode”
- Click **“Load unpacked”**
- Select the `dist` folder (after build or dev)

---

## 🛠 Build for Production

```bash
npm run build
```

This will generate the `dist` folder with your minified React + Tailwind extension.

---

## 📁 Folder Structure

```
chrome-volume-controller/
│
├── public/               # Static assets (e.g. icons)
├── src/
│   ├── App.jsx           # Main extension UI
│   └── index.css         # Tailwind config
├── manifest.json         # Chrome Extension config
├── tailwind.config.js
├── vite.config.js
└── ...
```

---

## 📸 Icon Credits

All icons used are stored in `public/icons/` and are free for non-commercial use.

---

## 🧪 Roadmap Ideas

- [ ] Per-tab volume presets  
- [ ] Audio peak visualization  
- [ ] Auto-detect new tabs with audio  
- [ ] Keyboard shortcuts  

---

## 💖 Built by

[@caju](https://github.com/Ayb3rk)