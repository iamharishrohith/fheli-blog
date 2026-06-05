# Fheli: Sovereign Edge Biometrics & Liveness System

Fheli is a hardware-agnostic, entirely offline biometric facial verification, passive 3D liveness detection, and decentralized zk-SNARK attendance proof system. It is designed to integrate seamlessly with highway authority client applications (such as NHAI Datalake 3.0) to prevent proxy attendance and field spoofing cheats in remote, offline environments.

This repository hosts the **Fheli Landing Page, Interactive Liveness Simulator, and Developer Blog**, along with the integrated prototype source code.

## 🚀 Live Demo & Blog
Experience the interactive prototype, live MediaPipe Face Mesh scanner, and read the developer blog detailing our security R&D:
👉 **[Fheli Live Portal & Blog](https://iamharishrohith.github.io/fheli-blog/)**

---

## 🛠️ Features & Pillars
1. **Fully Homomorphic Encryption (FHE)**: Matches face embeddings directly inside the ciphertext space (CKKS scheme via OpenFHE), keeping biometric templates private even if device RAM is compromised.
2. **Passive Corneal Color-Glow Liveness**: Flashes chromatic grids at 100ms intervals to verify the 3D curvature of the cornea via specular reflection matching.
3. **3D Parallax Optical Flow**: Tracks natural hand tremors to measure depth velocity variance of the nose relative to the ears, blocking flat photo/video spoofing attempts.
4. **Decentralized zk-SNARK Proofs**: Generates Groth16 proofs on-device to verify shift times and geofenced coordinates without uploading raw GPS or worker IDs to AWS.
5. **Quantized Edge Optimization**: BlazeFace + MediaPipe Face Mesh + MobileFaceNet compressed to **8.45 MB** using INT8 Post-Training Quantization (PTQ), achieving **~107ms** latency on budget mobile processors.

---

## 📁 Repository Structure
* `/index.html`, `/style.css`, `/script.js`: Interactive landing page, blog, and live camera simulator (MediaPipe Face Mesh).
* `/src/`: Full React Native integration module source code (components, JSI C++ bridges, database managers, ZKProver, mathematical utility files).
* `/docs/`: In-depth R&D specifications, latency benchmarks, pitch deck outlines, integration guides, and patent specifications.
* `FheliProposal.zip`: Ready-to-submit consolidated package containing source files, slide deck, proposal document, and setup configurations.

---

## 🖥️ Local Development / Viewing
1. Clone this repository:
   ```bash
   git clone https://github.com/iamharishrohith/fheli-blog.git
   cd fheli-blog
   ```
2. Run a local development server (necessary for webcam permissions due to browser `file://` security restrictions):
   ```bash
   # Using python
   python -m http.server 8000
   # Or using node
   npx http-server -p 8000
   ```
3. Open `http://localhost:8000` in your browser.

---
Built by **Team Fheli** for the NHAI Hackathon 7.0.
