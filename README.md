# Static Website with React and Next.js

This project is a static website built using React and Next.js. It includes a landing page with a hero section and a separate page for adding, editing, and modifying planned series. The website is designed to be deployed to Azure Static Websites.

## Project Setup

To set up the project locally, follow these steps:

1. Clone the repository:
   ```bash
   git clone https://github.com/githubnext/workspace-blank.git
   cd workspace-blank
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:3000` to see the website.

## Deployment to Azure Static Websites

To deploy the website to Azure Static Websites, follow these steps:

1. Build the project:
   ```bash
   npm run build
   ```

2. Create a new Azure Static Web App in the Azure portal.

3. Connect the Azure Static Web App to your GitHub repository.

4. Configure the build settings in the Azure portal:
   - **App location:** `/`
   - **Output location:** `out`

5. Save the settings and deploy the website.

6. Once the deployment is complete, you can access the website using the provided Azure Static Web App URL.
