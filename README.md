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

## Key Features

The key features of this project are:

* **Airtable integration**: The project includes functionality to integrate with Airtable for storing and retrieving content. This is implemented in files like `api/airtable-integration.js` and `components/AirtableIntegration.js`.
* **Audit trail**: The project logs actions and provides an endpoint to retrieve audit logs. This is implemented in `api/audit-trail.js` and `components/AuditTrail.js`.
* **Authentication**: The project includes user authentication using JWT tokens, with endpoints for login, logout, and user retrieval. This is implemented in `api/authentication.js` and `components/Authentication.js`.
* **Data persistence**: The project provides endpoints to store and track content, with support for pagination and analytics. This is implemented in `api/data-persistence.js`.
* **Image generation**: The project includes functionality to generate, approve, reject, and upload images using the Hugging Face API. This is implemented in `api/image-generation.js` and `components/ImageGeneration.js`.
* **Feedback mechanism**: The project allows users to submit feedback, which is implemented in `components/FeedbackMechanism.js`.
* **Notification system**: The project includes functionality to send notifications via email, Slack, and SMS. This is implemented in `api/notification-system.js` and `components/NotificationSystem.js`.
* **Platform connectors**: The project provides functionality to publish content to various platforms like Facebook, Instagram, LinkedIn, Twitter, and custom platforms. This is implemented in `api/multi-platform-publishing.js` and `components/PlatformConnectors.js`.
* **Summarization**: The project includes endpoints to generate and approve summaries of raw text. This is implemented in `api/summarization.js` and `components/SummarizationAPI.js`.
* **Text parsing**: The project provides functionality to parse and analyze text, with support for different implementations like DeepSeek, OpenAI, and Azure. This is implemented in `api/text-parser.js`.

## Detailed Deployment Process to Azure Web App

To document the deployment process for this project, follow these steps:

* **Prerequisites**: Ensure you have the necessary environment variables set up, including `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`, `AIRTABLE_API_KEY`, `AIRTABLE_BASE_ID`, `AIRTABLE_TABLE_NAME`, `JWT_SECRET`, `EMAIL_USER`, `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`, `SLACK_TOKEN`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_PHONE_NUMBER`.
* **GitHub Actions**: The deployment process is automated using GitHub Actions. The workflow file is located at `.github/workflows/azure-webapps-node.yml`.
* **Environment selection**: The workflow supports deployment to different environments (`dev`, `test`, `prod`). You can specify the environment using the `environment` input in the workflow dispatch.
* **Build process**: The build job sets up Node.js, installs dependencies, builds the project, runs tests, and zips the artifact for deployment.
* **Infrastructure setup**: The infrastructure job creates the necessary Azure resources using a Bicep template located at `infra/main.bicep`. It generates resource names using the script `infra/naming.sh` and deploys the resources.
* **Deployment**: The deploy job logs into Azure, generates resource names, and deploys the application to Azure Web App using the `azure/webapps-deploy@v3` action.
* **Configuration**: Ensure the `parameters.json` file in the `infra` directory is correctly configured with the appropriate values for `appName`, `location`, `sku`, and `linuxFxVersion`.
* **Running the workflow**: To trigger the deployment workflow, push changes to the `main` branch or manually dispatch the workflow from the GitHub Actions tab.

For more detailed instructions, refer to the comments and steps in the `.github/workflows/azure-webapps-node.yml` file. Additionally, ensure that all required environment variables are set in the GitHub repository secrets.

## Detailed Feature Descriptions

### Airtable Integration

To use the Airtable integration in this project, follow these steps:

* **Set up environment variables**: Ensure you have the necessary environment variables set up, including `AIRTABLE_API_KEY`, `AIRTABLE_BASE_ID`, and `AIRTABLE_TABLE_NAME`. These are required for the Airtable integration to function properly.
* **Initialize Airtable**: The Airtable integration is initialized in the `api/airtable-integration.js` file. The `initializeAirtable` function validates the required environment variables and sets up the Airtable base and table.
* **Check Airtable initialization**: The `checkAirtableInitialized` middleware in `api/airtable-integration.js` ensures that Airtable is properly initialized before processing any requests.
* **Store content**: Use the `/store-content` endpoint to store published content in Airtable. This endpoint is defined in `api/airtable-integration.js` and requires the `content` field in the request body.
* **Track content**: Use the `/track-content` endpoint to track published content. This endpoint supports pagination and filtering and is defined in `api/airtable-integration.js`.
* **Component integration**: The Airtable integration is also used in the `components/AirtableIntegration.js` component. This component fetches records from Airtable and displays them in a list.

For more detailed instructions, refer to the comments and code in the `api/airtable-integration.js` and `components/AirtableIntegration.js` files. Additionally, ensure that all required environment variables are set in your development environment.

### Audit Trail

The audit trail feature logs actions and provides an endpoint to retrieve audit logs. It is implemented in `api/audit-trail.js` and `components/AuditTrail.js`.

* **Log actions**: The `logAction` middleware in `api/audit-trail.js` logs actions by writing log entries to a file. The log entries include the action, user, and sanitized request body.
* **Retrieve audit logs**: Use the `/audit-logs` endpoint to retrieve audit logs. This endpoint is defined in `api/audit-trail.js` and requires user authentication.
* **Component integration**: The audit trail feature is also used in the `components/AuditTrail.js` component. This component fetches audit logs from the server and displays them in a list.

For more detailed instructions, refer to the comments and code in the `api/audit-trail.js` and `components/AuditTrail.js` files.

### Authentication

The authentication feature includes user authentication using JWT tokens, with endpoints for login, logout, and user retrieval. It is implemented in `api/authentication.js` and `components/Authentication.js`.

* **Login**: Use the `/login` endpoint to authenticate users. This endpoint is defined in `api/authentication.js` and requires the `username` and `password` fields in the request body.
* **Logout**: Use the `/logout` endpoint to log out users. This endpoint is defined in `api/authentication.js` and requires a valid JWT token in the request headers.
* **Retrieve user**: Use the `/user` endpoint to retrieve user information. This endpoint is defined in `api/authentication.js` and requires a valid JWT token in the request headers.
* **Component integration**: The authentication feature is also used in the `components/Authentication.js` component. This component provides a login form, displays user information, and handles user logout.

For more detailed instructions, refer to the comments and code in the `api/authentication.js` and `components/Authentication.js` files.

### Data Persistence

The data persistence feature provides endpoints to store and track content, with support for pagination and analytics. It is implemented in `api/data-persistence.js`.

* **Store content**: Use the `/store-content` endpoint to store published content. This endpoint is defined in `api/data-persistence.js` and requires the `content` field in the request body.
* **Track content**: Use the `/track-content-page` endpoint to track published content with pagination. This endpoint is defined in `api/data-persistence.js` and supports the `pageSize` and `offset` query parameters.
* **Analytics**: Use the `/analytics` endpoint to retrieve analytics data with pagination. This endpoint is defined in `api/data-persistence.js` and supports the `pageSize` and `offset` query parameters.

For more detailed instructions, refer to the comments and code in the `api/data-persistence.js` file.

### Image Generation

The image generation feature includes functionality to generate, approve, reject, and upload images using the Hugging Face API. It is implemented in `api/image-generation.js` and `components/ImageGeneration.js`.

* **Generate image**: Use the `/generate-image` endpoint to generate an image based on the provided context. This endpoint is defined in `api/image-generation.js` and requires the `context` field in the request body.
* **Approve image**: Use the `/approve-image` endpoint to approve an image. This endpoint is defined in `api/image-generation.js` and requires the `image` field in the request body.
* **Reject image**: Use the `/reject-image` endpoint to reject an image. This endpoint is defined in `api/image-generation.js` and requires the `image` field in the request body.
* **Regenerate image**: Use the `/regenerate-image` endpoint to regenerate an image based on the provided context. This endpoint is defined in `api/image-generation.js` and requires the `context` field in the request body.
* **Upload image**: Use the `/upload-image` endpoint to upload an image file. This endpoint is defined in `api/image-generation.js` and requires the `file` field in the request body.
* **Component integration**: The image generation feature is also used in the `components/ImageGeneration.js` component. This component provides buttons to generate, approve, reject, and regenerate images, as well as an input field to upload image files.

For more detailed instructions, refer to the comments and code in the `api/image-generation.js` and `components/ImageGeneration.js` files.

### Feedback Mechanism

The feedback mechanism allows users to submit feedback. It is implemented in `components/FeedbackMechanism.js`.

* **Submit feedback**: Use the `submitFeedback` function in the `components/FeedbackMechanism.js` component to submit feedback. This function sends a POST request to the `/api/submit-feedback` endpoint with the `reviewId` and `feedback` fields in the request body.

For more detailed instructions, refer to the comments and code in the `components/FeedbackMechanism.js` file.

### Notification System

The notification system includes functionality to send notifications via email, Slack, and SMS. It is implemented in `api/notification-system.js` and `components/NotificationSystem.js`.

* **Send notification**: Use the `/send-notification` endpoint to send a notification. This endpoint is defined in `api/notification-system.js` and requires the `type`, `message`, and `recipient` fields in the request body.
* **Retrieve notifications**: Use the `/notifications` endpoint to retrieve notifications. This endpoint is defined in `api/notification-system.js`.
* **Component integration**: The notification system is also used in the `components/NotificationSystem.js` component. This component provides a form to send notifications and displays a list of notifications.

For more detailed instructions, refer to the comments and code in the `api/notification-system.js` and `components/NotificationSystem.js` files.

### Platform Connectors

The platform connectors provide functionality to publish content to various platforms like Facebook, Instagram, LinkedIn, Twitter, and custom platforms. It is implemented in `api/multi-platform-publishing.js` and `components/PlatformConnectors.js`.

* **Publish content**: Use the `/publish-content` endpoint to publish content to specified platforms. This endpoint is defined in `api/multi-platform-publishing.js` and requires the `content` and `platforms` fields in the request body.
* **Add to queue**: Use the `/add-to-queue` endpoint to add content to the publishing queue. This endpoint is defined in `api/multi-platform-publishing.js` and requires the `content` and `platforms` fields in the request body.
* **Approve queue**: Use the `/approve-queue` endpoint to approve and publish the content in the queue. This endpoint is defined in `api/multi-platform-publishing.js` and requires the `queue` field in the request body.
* **Component integration**: The platform connectors are also used in the `components/PlatformConnectors.js` component. This component provides a list of available platforms, a pre-publishing queue, and buttons to add content to the queue and approve the queue.

For more detailed instructions, refer to the comments and code in the `api/multi-platform-publishing.js` and `components/PlatformConnectors.js` files.

### Summarization

The summarization feature includes endpoints to generate and approve summaries of raw text. It is implemented in `api/summarization.js` and `components/SummarizationAPI.js`.

* **Generate summary**: Use the `/summarize` endpoint to generate a summary of the provided raw text. This endpoint is defined in `api/summarization.js` and requires the `rawText` field in the request body.
* **Approve summary**: Use the `/approve-summary` endpoint to approve a summary. This endpoint is defined in `api/summarization.js` and requires the `summary` field in the request body.

For more detailed instructions, refer to the comments and code in the `api/summarization.js` and `components/SummarizationAPI.js` files.

### Text Parsing

The text parsing feature provides functionality to parse and analyze text, with support for different implementations like DeepSeek, OpenAI, and Azure. It is implemented in `api/text-parser.js`.

* **Parse text**: Use the `/parse-text` endpoint to parse and analyze the provided text. This endpoint is defined in `api/text-parser.js` and requires the `text` field in the request body.

For more detailed instructions, refer to the comments and code in the `api/text-parser.js` file.

## Step-by-Step Deployment Guide

### Prerequisites

Ensure you have the necessary environment variables set up, including:

* `AZURE_CLIENT_ID`
* `AZURE_TENANT_ID`
* `AZURE_SUBSCRIPTION_ID`
* `AIRTABLE_API_KEY`
* `AIRTABLE_BASE_ID`
* `AIRTABLE_TABLE_NAME`
* `JWT_SECRET`
* `EMAIL_USER`
* `GMAIL_CLIENT_ID`
* `GMAIL_CLIENT_SECRET`
* `GMAIL_REFRESH_TOKEN`
* `SLACK_TOKEN`
* `TWILIO_ACCOUNT_SID`
* `TWILIO_AUTH_TOKEN`
* `TWILIO_PHONE_NUMBER`

### Environment Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/githubnext/workspace-blank.git
   cd workspace-blank
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   export AZURE_CLIENT_ID=<your-azure-client-id>
   export AZURE_TENANT_ID=<your-azure-tenant-id>
   export AZURE_SUBSCRIPTION_ID=<your-azure-subscription-id>
   export AIRTABLE_API_KEY=<your-airtable-api-key>
   export AIRTABLE_BASE_ID=<your-airtable-base-id>
   export AIRTABLE_TABLE_NAME=<your-airtable-table-name>
   export JWT_SECRET=<your-jwt-secret>
   export EMAIL_USER=<your-email-user>
   export GMAIL_CLIENT_ID=<your-gmail-client-id>
   export GMAIL_CLIENT_SECRET=<your-gmail-client-secret>
   export GMAIL_REFRESH_TOKEN=<your-gmail-refresh-token>
   export SLACK_TOKEN=<your-slack-token>
   export TWILIO_ACCOUNT_SID=<your-twilio-account-sid>
   export TWILIO_AUTH_TOKEN=<your-twilio-auth-token>
   export TWILIO_PHONE_NUMBER=<your-twilio-phone-number>
   ```

### Running the Deployment Workflow

1. Push changes to the `main` branch or manually dispatch the workflow from the GitHub Actions tab.

2. Monitor the workflow progress in the GitHub Actions tab.

3. Once the deployment is complete, you can access the application using the provided Azure Web App URL.

## Troubleshooting Tips

### Common Issues

* **Missing environment variables**: Ensure all required environment variables are set in your development environment and GitHub repository secrets.
* **Failed to initialize Airtable**: Verify that the `AIRTABLE_API_KEY`, `AIRTABLE_BASE_ID`, and `AIRTABLE_TABLE_NAME` environment variables are correctly set.
* **Authentication errors**: Ensure the `JWT_SECRET` environment variable is set and matches the value used to sign JWT tokens.
* **Deployment failures**: Check the GitHub Actions workflow logs for detailed error messages and troubleshooting steps.

## Usage Instructions

### Airtable Integration

To use the Airtable integration, follow these steps:

1. Set up environment variables:
   ```bash
   export AIRTABLE_API_KEY=<your-airtable-api-key>
   export AIRTABLE_BASE_ID=<your-airtable-base-id>
   export AIRTABLE_TABLE_NAME=<your-airtable-table-name>
   ```

2. Initialize Airtable in the `api/airtable-integration.js` file.

3. Use the `/store-content` endpoint to store published content in Airtable.

4. Use the `/track-content` endpoint to track published content.

5. Integrate the `components/AirtableIntegration.js` component into your application to fetch and display records from Airtable.

### Audit Trail

To use the audit trail feature, follow these steps:

1. Log actions using the `logAction` middleware in the `api/audit-trail.js` file.

2. Retrieve audit logs using the `/audit-logs` endpoint.

3. Integrate the `components/AuditTrail.js` component into your application to fetch and display audit logs.

### Authentication

To use the authentication feature, follow these steps:

1. Set up environment variables:
   ```bash
   export JWT_SECRET=<your-jwt-secret>
   ```

2. Use the `/login` endpoint to authenticate users.

3. Use the `/logout` endpoint to log out users.

4. Use the `/user` endpoint to retrieve user information.

5. Integrate the `components/Authentication.js` component into your application to provide a login form, display user information, and handle user logout.

### Data Persistence

To use the data persistence feature, follow these steps:

1. Use the `/store-content` endpoint to store published content.

2. Use the `/track-content-page` endpoint to track published content with pagination.

3. Use the `/analytics` endpoint to retrieve analytics data with pagination.

### Image Generation

To use the image generation feature, follow these steps:

1. Set up environment variables:
   ```bash
   export HUGGING_FACE_API_KEY=<your-hugging-face-api-key>
   ```

2. Use the `/generate-image` endpoint to generate an image based on the provided context.

3. Use the `/approve-image` endpoint to approve an image.

4. Use the `/reject-image` endpoint to reject an image.

5. Use the `/regenerate-image` endpoint to regenerate an image based on the provided context.

6. Use the `/upload-image` endpoint to upload an image file.

7. Integrate the `components/ImageGeneration.js` component into your application to provide buttons to generate, approve, reject, and regenerate images, as well as an input field to upload image files.

### Feedback Mechanism

To use the feedback mechanism, follow these steps:

1. Integrate the `components/FeedbackMechanism.js` component into your application.

2. Use the `submitFeedback` function in the `components/FeedbackMechanism.js` component to submit feedback.

### Notification System

To use the notification system, follow these steps:

1. Set up environment variables:
   ```bash
   export EMAIL_USER=<your-email-user>
   export GMAIL_CLIENT_ID=<your-gmail-client-id>
   export GMAIL_CLIENT_SECRET=<your-gmail-client-secret>
   export GMAIL_REFRESH_TOKEN=<your-gmail-refresh-token>
   export SLACK_TOKEN=<your-slack-token>
   export TWILIO_ACCOUNT_SID=<your-twilio-account-sid>
   export TWILIO_AUTH_TOKEN=<your-twilio-auth-token>
   export TWILIO_PHONE_NUMBER=<your-twilio-phone-number>
   ```

2. Use the `/send-notification` endpoint to send a notification.

3. Use the `/notifications` endpoint to retrieve notifications.

4. Integrate the `components/NotificationSystem.js` component into your application to provide a form to send notifications and display a list of notifications.

### Platform Connectors

To use the platform connectors, follow these steps:

1. Set up environment variables:
   ```bash
   export FACEBOOK_API_URL=<your-facebook-api-url>
   export FACEBOOK_API_KEY=<your-facebook-api-key>
   export INSTAGRAM_API_URL=<your-instagram-api-url>
   export INSTAGRAM_API_KEY=<your-instagram-api-key>
   export LINKEDIN_API_URL=<your-linkedin-api-url>
   export LINKEDIN_API_KEY=<your-linkedin-api-key>
   export TWITTER_API_URL=<your-twitter-api-url>
   export TWITTER_API_KEY=<your-twitter-api-key>
   export CUSTOM_API_URL=<your-custom-api-url>
   export CUSTOM_API_KEY=<your-custom-api-key>
   ```

2. Use the `/publish-content` endpoint to publish content to specified platforms.

3. Use the `/add-to-queue` endpoint to add content to the publishing queue.

4. Use the `/approve-queue` endpoint to approve and publish the content in the queue.

5. Integrate the `components/PlatformConnectors.js` component into your application to provide a list of available platforms, a pre-publishing queue, and buttons to add content to the queue and approve the queue.

### Summarization

To use the summarization feature, follow these steps:

1. Set up environment variables:
   ```bash
   export SUMMARIZATION_API_URL=<your-summarization-api-url>
   export APPROVAL_API_URL=<your-approval-api-url>
   ```

2. Use the `/summarize` endpoint to generate a summary of the provided raw text.

3. Use the `/approve-summary` endpoint to approve a summary.

### Text Parsing

To use the text parsing feature, follow these steps:

1. Set up environment variables:
   ```bash
   export DEEPSEEK_API_URL=<your-deepseek-api-url>
   export OPENAI_API_URL=<your-openai-api-url>
   export AZURE_API_URL=<your-azure-api-url>
   ```

2. Use the `/parse-text` endpoint to parse and analyze the provided text.
