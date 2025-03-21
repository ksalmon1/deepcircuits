**Project Requirements Document**

## **📌 Overview**

This project involves building a web-based, interactive 2D electronics and microcontroller circuit simulator for hobbyists and students. The application allows users to design, simulate, and collaborate on electronic circuits, including analog and digital components and microcontrollers, within an intuitive visual environment.

---

## **✅ Objectives**

* Provide an intuitive, interactive circuit-building environment.  
* Accurately simulate circuit behavior with real-time feedback.  
* Enable users to write and compile code for microcontrollers.  
* Facilitate collaboration, versioning, and sharing of projects.  
* Support Free and Premium subscription plans with additional advanced features.

---

## **🎯 Target Audience**

* Electronics hobbyists  
* Engineering students  
* Educational institutions teaching electronics and microcontroller programming

---

## **🛠 Technical Requirements**

### **Frontend**

* **Framework**: React (TypeScript)  
* **Build Tool**: Vite  
* **Component Library**: wokwi-elements (SVG-based components)  
* **UI Library**: React Konva for interactive canvas and circuit drawing  
* **Code Editor**: Monaco Editor

### **Backend**

* **Platform**: Supabase (Auth, Database, Storage, Real-Time)  
* **Code Compilation**: Supabase Edge Functions or Docker containers (microcontroller code compilation)

### **Deployment**

* **Hosting**: Vercel (Frontend), Supabase cloud (Backend)  
* **Payments**: Stripe (billing/subscription management)

---

## **🚩 Core Features & Functional Requirements**

### **1\. Circuit Editor & Simulation**

* **Drag-and-drop components** (resistors, LEDs, capacitors, batteries, motors, microcontrollers)  
* **Interactive wiring**: snap wires to component pins with intuitive placement  
* **Real-time simulation** of circuit behavior (voltage, current, component states)  
* **Top-down 2D workspace** with panning, zooming, and rotating components

### **2\. Microcontroller Programming**

* **Code editor**: Users write Arduino/ESP32-compatible code  
* **Compilation and debugging**: Real-time code compilation and output displayed via integrated serial monitor  
* **Error logs and debugging output**: Clear and accessible in UI

### **3\. Component Management (Admin Only)**

* **Admin Component Library**: Add, edit, preview, remove components via an admin interface  
* **Custom pin configuration**: Define or override pinInfo for accurate wiring behavior  
* **Component categorization**: Organize by type/function for easy user access  
* **Impact alerts**: Inform users if components they used are modified or removed

### **4\. Authentication & User Management**

* **Supabase Auth Integration**:  
  * Social logins (Google, GitHub, etc.)  
  * Email/password authentication  
* **Secure session management**: JWT tokens, secure cookies, and session expiry handling  
* **User account management**: Profile updates, password resets, and subscription details

### **5\. Billing & Subscriptions (Stripe Integration)**

* **Plans**:  
  * **Free Plan**: Basic circuit editing and simulation features  
  * **Premium Plan**: Includes collaboration, version control, project export/import  
* **Subscription management**:  
  * Self-service upgrades/downgrades/cancellations  
  * Real-time plan updates through Stripe webhooks  
* **Secure payment handling**: Stripe checkout for PCI compliance

### **6\. Version Control (Premium Users Only)**

* **Automatic project autosave** with incremental JSON snapshots  
* **Version history**: Users can view and revert to previous states  
* **Collaborative conflict resolution**: Manage simultaneous edits gracefully

### **7\. Real-Time Collaboration (Premium Users Only)**

* **Simultaneous editing**: Real-time synchronization of circuit changes  
* **Collaborative sessions**: Invite and manage team members for shared editing  
* **Conflict management**: Real-time concurrency resolution to avoid data conflicts

### **8\. Project Export/Import (Premium Users Only)**

* **Export**: JSON-based export of complete project state (circuits, code, version history)  
* **Import**: Secure and validated import process ensuring data integrity and preventing malicious inputs

---

## **🎨 UI/UX Design Guidelines**

### **Visual Style & Layout**

* **Modern, minimalist, user-friendly** interface  
* **Responsive** design for desktop and mobile  
* **Accessible and intuitive** navigation and user interactions

### **Color Palette**

* Primary: `#4C72F4` (Electric Blue)  
* Secondary: `#F4C95D` (Warm Amber)  
* Accent: `#FF6E6E` (Alert Coral)  
* Background: `#FFFFFF` (White)  
* Neutral Gray: `#ECEFF4`

### **Typography**

* Font: **Inter** (Google Fonts)  
* Headings: Bold, 24–32px  
* Body Text: Regular/Medium, 14–16px

### **Spacing & Interactivity**

* Consistent 8px grid system for padding, margins  
* Interactive buttons and elements with clear hover, active, and disabled states  
* Animations: Quick, subtle, purposeful (e.g., component highlight, modal transitions)

---

## **🔒 Security & Compliance Requirements**

* Secure Supabase configuration and strict user access control  
* Code compilation sandboxing (Edge Functions or Docker containers)  
* Data isolation between users  
* GDPR compliance for user data handling  
* PCI compliance via Stripe payment integration

---

## **🚧 Performance & Scalability Considerations**

* Lazy loading and dynamic imports for performance optimization  
* Efficient real-time data synchronization (Supabase channels)  
* Scalable backend architecture supporting concurrent users  
* Regular monitoring and analytics to identify performance bottlenecks

---

## **📌 Proposed Architecture Diagram**

plaintext  
CopyEdit  
`[Client Browser (React App)]`  
       `|`  
`[Vercel CDN & Deployment]`  
       `|`  
       `+---> [Supabase Backend]`  
       `|        |`  
       `|        +-- Auth, Database, Storage`  
       `|        +-- Real-Time Sync`  
       `|        +-- Edge Functions/Code Compilation`  
       `|`  
       `+---> [Stripe Billing & Subscriptions]`  
                `|`  
                `+-- Webhook Events`

---

## **📅 Implementation Timeline & Roadmap (Suggested)**

**Phase 1: MVP**

* Project setup  
* Authentication  
* Basic Circuit Editor and Simulation

**Phase 2: Core Features**

* Microcontroller compilation & debugging  
* Premium subscription with Stripe integration  
* Admin component management

**Phase 3: Premium Features**

* Version control  
* Real-time collaboration  
* Project export/import

**Phase 4: Polishing & Optimization**

* Performance tuning and security audit  
* Final UX/UI refinement  
* Full deployment and documentation

---

## **📚 References & Resources**

* React: [reactjs.org](https://reactjs.org)  
* Vite: [vitejs.dev](https://vitejs.dev)  
* Supabase: [supabase.com](https://supabase.com)  
* Wokwi-elements: elements.wokwi.com  
* Stripe: [stripe.com/docs](https://stripe.com/docs)

---

## **✨ Conclusion**

This Project Requirements Document clearly outlines all necessary aspects for successful development, implementation, and scaling of the Circuit Simulator Web Application. It serves as the authoritative guide to development and ensures alignment among all project stakeholders.

