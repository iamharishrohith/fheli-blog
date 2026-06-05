# Patent Specification Document
## SYSTEM AND METHOD FOR HARDWARE-AGNOSTIC CRYPTOGRAPHIC BIOMETRIC VERIFICATION USING SPATIAL CODED CORNEAL REFRACTOMETRY, OCULAR TREMOR TELEMETRY, AND HOMOMORPHIC ZK-SNARK CIRCUITS

---

## 1. Field of the Invention
This invention relates generally to biometric authentication systems, and more specifically to a hardware-agnostic, offline-capable mobile biometric system (**Fheli**) that performs zero-plaintext template matching, passive multi-dimensional liveness detection, and zero-knowledge log verification without exposing biometric templates or location tracking metrics to hardware memories or external servers.

---

## 2. Prior Art & Limitations

Current state-of-the-art biometric systems suffer from critical security, hardware dependency, and privacy issues:

1. **Hardware Dependency (e.g., Apple FaceID)**:
   - Uses active structured-light infrared (IR) dot projectors to map a 3D face mesh. This requires custom hardware components, rendering it incompatible with standard mid-range mobile front cameras.
2. **RAM Decryption Vulnerabilities (e.g., Android BiometricPrompt, SenseTime, Oosto)**:
   - Perform face comparison by loading the enrollment template and live captured template into RAM in plaintext to calculate Euclidean or Cosine distance. Attackers with root/kernel privileges can execute memory-scraping attacks to extract these raw biometric vectors.
3. **Active Liveness Defects**:
   - Systems checking for blinks or head turns can be bypassed using deepfake video playbacks on high-resolution displays.
4. **Data Leakage in Centralized Servers**:
   - Attendance logging requires uploading the user's ID, current time, and exact GPS coordinates to a central database. A breach of this central server compromises the physical tracking history of all personnel.

---

## 3. Summary of the Invention (The 4 Patentable Pillars)

To resolve these vulnerabilities, the present invention defines an offline-first biometric authentication architecture comprising four unique, interlinked components:

```
+-----------------------------------------------------------------------------------------------+
|                                         FHELI ENGINE                                          |
+-----------------------------------------------------------------------------------------------+
|  Pillar 1: Spatial Coded Chromatic Refractometry (SCCR)                                       |
|  - Projects dynamic multi-channel chromatic grids on display.                                 |
|  - Ray-traces specular corneal reflection to verify 3D convex geometry of the eye.            |
+-----------------------------------------------------------------------------------------------+
|  Pillar 2: Neuromorphic Ocular-Tremor Telemetry (NOTT)                                        |
|  - Tracks sub-pixel involuntary physiological nystagmus (pupil tremors at 30-80 Hz).          |
|  - Verifies neuromuscular signs of life, blocking screen playbacks and static masks.         |
+-----------------------------------------------------------------------------------------------+
|  Pillar 3: Single-Pass Homomorphic zk-SNARK Circuits                                          |
|  - Evaluates similarity metrics directly on CKKS homomorphic ciphertexts.                     |
|  - Generates ZK-Proofs of verification without decrypting biometric vectors in RAM or CPU.   |
+-----------------------------------------------------------------------------------------------+
|  Pillar 4: Bio-Derived Fuzzy Extractor Keys                                                   |
|  - Generates database encryption keys dynamically from face feature vectors using error codes.|
|  - DB keys do not exist on disk or Secure Enclave; keys exist ONLY when user is present.      |
+-----------------------------------------------------------------------------------------------+
```

---

## 4. Detailed Description of the Patented Pillars

### Pillar I: Spatial Coded Chromatic Refractometry (SCCR)
Instead of a simple full-screen color flash, the device screen is segmented into a dynamic $4\times4$ grid of coded color emitters. Each emitter cell projects a unique, high-frequency sequence of chromatic waves (e.g., varying across RGB wavelengths at 60 Hz).

```
                      SPATIAL CODED DISPLAY GRID
                      ┌─────┬─────┬─────┬─────┐
                      │ R1  │ G2  │ B3  │ R4  │  (RGB light waves projected
                      ├─────┼─────┼─────┼─────┤   at dynamic frequencies)
                      │ B5  │ R6  │ G7  │ B8  │
                      ├─────┼─────┼─────┼─────┤          │
                      │ G9  │ B10 │ R11 │ G12 │          ▼
                      ├─────┼─────┼─────┼─────┤    [ USER CORNEA ]
                      │ R13 │ G14 │ B15 │ R16 │  (Acts as convex mirror,
                      └─────┴─────┴─────┴─────┘   reflecting light ray path)
```

The camera captures the reflection of this grid on the cornea. The cornea behaves as a convex spherical mirror. Using ray-tracing mathematics, the system calculates the reflection projection vectors:
- **Corneal 3D Surface Reconstruction**:
  Let the screen grid coordinate be $S(x,y,c,t)$ where $c$ is the color channel and $t$ is the timestamp. The reflected coordinate captured on the sensor is $I(x',y',c,t)$. The surface normal $\mathbf{N}$ of the cornea is solved by:
  $$\mathbf{N}(x'', y'') = \frac{\mathbf{V}_{\text{incident}} + \mathbf{V}_{\text{reflected}}}{\|\mathbf{V}_{\text{incident}} + \mathbf{V}_{\text{reflected}}\|}$$
- If the target is a flat digital screen or a paper photo print, the reflection is flat, lacking the spherical distortion profile of a human eye.
- If the target is a 3D prosthetic mask, the material's refractive index ($n_{\text{mask}}$) differs from the fluid-filled human cornea ($n_{\text{cornea}} \approx 1.376$), causing refraction anomalies that trigger an immediate rejection.

### Pillar II: Neuromorphic Ocular-Tremor Telemetry (NOTT)
Live human eyes display involuntary, micro-movements to keep the retina refreshed. These micro-movements include **physiological nystagmus** (high-frequency ocular tremors ranging from **30 Hz to 80 Hz**, with an amplitude of $1$ to $5$ microns).

1. **Sub-Pixel Tracking**: The C++ JSI layer tracks the center of the pupil ($P_{x,y}$) with sub-pixel interpolation ($0.05$ pixel precision) at 60 FPS.
2. **Frequency Analysis**: The system computes the Fast Fourier Transform (FFT) of the pupil coordinates over a rolling 1-second window:
   $$\mathcal{F}(P)(\omega) = \int_{-\infty}^{\infty} P(t) e^{-i\omega t} dt$$
3. **Validation**: The system verifies the presence of energy spikes in the **$30\text{ Hz} \le \omega \le 80\text{ Hz}$** band.
   - A video replay screen or 3D mask will either have static pupils (no movement) or display low-frequency tracking patterns (e.g., panning or blinks under 10 Hz). The high-frequency neurological tremor signature is absent, exposing spoof attempts.

### Pillar III: Single-Pass Homomorphic zk-SNARK Circuits
Standard Zero-Knowledge Proofs require the inputs (such as facial vectors) to be fed in plaintext to the arithmetic circuit to generate the proof, meaning the biometric template must be decrypted inside the prover's RAM memory.

This invention uses a **Single-Pass Homomorphic zk-SNARK** architecture:
- We map the CKKS homomorphic ciphertext operations directly as arithmetic constraints inside a zk-SNARK circuit (compiled via Circom to Groth16 r1cs format).
- The circuit takes the encrypted enrollment template ciphertext ($\mathbf{C}_{\text{enroll}}$) and the live encrypted template ciphertext ($\mathbf{C}_{\text{live}}$) as inputs.
- The circuit evaluates the similarity dot product and checks the threshold constraint *entirely within the encrypted ciphertext space*:
  $$\text{Circuit Check: } \text{Decrypt}(\mathbf{C}_{\text{enroll}} \odot \mathbf{C}_{\text{live}}, \text{KeyShare}) \ge \text{Threshold}$$
- The output of the local prover is a **256-byte proof** ($\pi$) showing that a matching template was found, without ever exposing the plain text biometric vectors in the device RAM or CPU register blocks.

### Pillar IV: Biometrically-Derived Fuzzy Extractor Keys
Storing database decryption keys in hardware keystores leaves them vulnerable to physical memory-probing or chip-level side-channel attacks on rooted devices.

This invention derives the database decryption key **directly from the user's face itself** using a cryptographic **Fuzzy Extractor**:
1. **Enrollment**: The system processes the face embedding ($\mathbf{V}_{\text{enroll}}$) through a fuzzy extractor generator, which outputs a helper string ($\mathbf{H}$) and a uniform database decryption key ($\mathbf{K}_{\text{DB}}$):
   $$\text{Generate}(\mathbf{V}_{\text{enroll}}) \rightarrow (\mathbf{K}_{\text{DB}}, \mathbf{H})$$
   Only the public helper string $\mathbf{H}$ is stored in the app config. The key $\mathbf{K}_{\text{DB}}$ is discarded.
2. **Verification**: When the employee scans their face, the system captures the noisy live embedding ($\mathbf{V}_{\text{live}}$) and reconstructs the key $\mathbf{K}_{\text{DB}}$ using the helper string:
   $$\text{Reproduce}(\mathbf{V}_{\text{live}}, \mathbf{H}) \rightarrow \mathbf{K}_{\text{DB}}$$
3. **Fuzzy Correction**: The fuzzy extractor corrects minor coordinate noise (caused by lighting or facial expression differences) using error-correcting codes.
4. **Key Ephemerality**: If the computed key is correct, SQLCipher decrypts the database in memory for matching. Once the check completes, the key is wiped from RAM. **If the user is not physically present, the decryption key does not exist on the device.**

---

## 5. Patent Claims (The Legal Shield)

The invention claims:

1. A method for hardware-agnostic biometric authentication on a mobile device, comprising:
   - Projecting a spatially coded, multi-channel chromatic light grid on a display of said mobile device;
   - Capturing, via a camera, specular reflections of said light grid on a cornea of a user;
   - Ray-tracing said reflections to reconstruct a 3D surface geometry of said cornea;
   - Rejecting authentication if said 3D surface geometry does not match a spherical convex model.
2. The method of Claim 1, further comprising:
   - Tracking, at sub-pixel resolution, pupil coordinates of said user's eyes;
   - Applying a Fourier Transform to said pupil coordinates over a rolling time window;
   - Verifying the presence of involuntary physiological nystagmus in a frequency band of 30 Hz to 80 Hz;
   - Rejecting authentication if said nystagmus frequency signature is absent.
3. The method of Claim 1, further comprising:
   - Storing a biometric template as a homomorphic ciphertext in a local database;
   - Generating a live biometric template as a homomorphic ciphertext;
   - Computing a matching similarity score directly on said ciphertexts using Fully Homomorphic Encryption;
   - Generating a zero-knowledge proof of matching validation using a zk-SNARK circuit.
4. The method of Claim 3, further comprising:
   - Deriving a local database decryption key dynamically from a live captured face embedding using a fuzzy extractor helper string, wherein no decryption key is persistently stored on said mobile device.
