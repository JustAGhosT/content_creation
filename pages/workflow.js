import React from 'react';

const WorkflowPage = () => {
  return (
    <html>
      <head>
        <style>
          {`
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 100%;
              margin: 0;
              padding: 0;
            }
            .container {
              display: flex;
              flex-direction: column;
              gap: 1.5rem;
              padding: 1.5rem;
            }
            .header {
              text-align: center;
              margin-bottom: 1.5rem;
              padding: 1.5rem;
              background: linear-gradient(135deg, #2c3e50, #4a6491);
              color: white;
              border-radius: 8px;
            }
            .header h1 {
              margin: 0;
              font-size: 2.2rem;
            }
            .header p {
              margin: 0.5rem 0 0;
              font-size: 1.2rem;
              opacity: 0.9;
            }
            .section {
              background-color: #f8f9fa;
              border-radius: 8px;
              padding: 1.5rem;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .section h2 {
              margin-top: 0;
              color: #2c3e50;
              border-bottom: 2px solid #4a6491;
              padding-bottom: 0.5rem;
            }
            .workflow {
              margin: 1.5rem 0;
            }
            .workflow-container {
              background-color: white;
              border-radius: 8px;
              padding: 1.5rem;
              box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
            }
            .workflow-diagram {
              display: flex;
              flex-direction: column;
              gap: 2rem;
              margin: 2rem 0;
            }
            .workflow-stage {
              display: flex;
              flex-direction: column;
              gap: 1rem;
            }
            .stage-header {
              background-color: #4a6491;
              color: white;
              padding: 1rem;
              border-radius: 8px;
              display: flex;
              align-items: center;
              gap: 1rem;
            }
            .stage-number {
              background-color: white;
              color: #4a6491;
              width: 36px;
              height: 36px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: bold;
              font-size: 1.2rem;
            }
            .stage-title {
              font-size: 1.3rem;
              font-weight: bold;
              margin: 0;
            }
            .stage-steps {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
              gap: 1rem;
            }
            .step-card {
              background-color: #f8f9fa;
              border-radius: 8px;
              padding: 1rem;
              border-left: 4px solid #4a6491;
            }
            .step-card h4 {
              margin-top: 0;
              color: #2c3e50;
              font-size: 1.1rem;
              margin-bottom: 0.5rem;
            }
            .step-card ul {
              padding-left: 1.2rem;
              margin: 0;
            }
            .step-card li {
              margin-bottom: 0.5rem;
              font-size: 0.9rem;
            }
            .step-card .tip {
              background-color: #e9f7fe;
              border-left: 4px solid #3498db;
              padding: 0.5rem;
              margin-top: 0.5rem;
              font-size: 0.85rem;
            }
            .step-card .tip strong {
              color: #3498db;
            }
            @media (max-width: 768px) {
              .stage-steps {
                grid-template-columns: 1fr;
              }
            }
          `}
        </style>
      </head>
      <body>
        <div className="container">
          <div className="header">
            <h1>Humanizing Technical Excellence</h1>
            <p>Expanded Content Production Workflow & Platform Analysis</p>
          </div>
          
          <div className="section">
            <h2>Comprehensive Content Production & Distribution Workflow</h2>
            <p>A detailed, step-by-step process for efficiently creating and distributing your technical content series across multiple platforms while maintaining quality and consistency.</p>
            
            <div className="workflow">
              <div className="workflow-container">
                <div className="workflow-diagram">
                  <div className="workflow-stage">
                    <div className="stage-header">
                      <div className="stage-number">1</div>
                      <h3 className="stage-title">Strategic Planning</h3>
                    </div>
                    <div className="stage-steps">
                      <div className="step-card">
                        <h4>Content Calendar Development</h4>
                        <ul>
                          <li>Schedule articles according to your quarterly series plan</li>
                          <li>Allocate 2-3 weeks of production time per article</li>
                          <li>Plan related content (tweets, notes, resources) for each piece</li>
                          <li>Identify strategic publication dates for maximum visibility</li>
                        </ul>
                        <div className="tip">
                          <strong>Pro Tip:</strong> Use a project management tool like Notion or Asana to maintain your content calendar with clear deadlines and dependencies.
                        </div>
                      </div>
                      
                      <div className="step-card">
                        <h4>Research & Resource Collection</h4>
                        <ul>
                          <li>Gather technical references and examples for each topic</li>
                          <li>Identify real-world case studies that illustrate concepts</li>
                          <li>Collect relevant code samples and technical diagrams</li>
                          <li>Research industry context and current relevance</li>
                        </ul>
                        <div className="tip">
                          <strong>Pro Tip:</strong> Create a dedicated research document for each article with links, quotes, and ideas that you can reference during writing.
                        </div>
                      </div>
                      
                      <div className="step-card">
                        <h4>Audience & Platform Analysis</h4>
                        <ul>
                          <li>Identify the primary audience segments for each article</li>
                          <li>Determine which platforms will reach each segment best</li>
                          <li>Plan platform-specific adaptations needed</li>
                          <li>Set specific engagement goals for each platform</li>
                        </ul>
                        <div className="tip">
                          <strong>Pro Tip:</strong> Create audience personas for your content and map each platform to the personas it best reaches.
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="workflow-stage">
                    <div className="stage-header">
                      <div className="stage-number">2</div>
                      <h3 className="stage-title">Primary Content Creation</h3>
                    </div>
                    <div className="stage-steps">
                      <div className="step-card">
                        <h4>Article Development</h4>
                        <ul>
                          <li>Create detailed outline with key sections and points</li>
                          <li>Write the full article optimized for phoenixvc.tech</li>
                          <li>Incorporate technical examples and code snippets</li>
                          <li>Develop practical applications and implementation guidance</li>
                          <li>Add cross-references to related articles in the series</li>
                        </ul>
                        <div className="tip">
                          <strong>Pro Tip:</strong> Write in modular sections that can be easily adapted or excerpted for different platforms.
                        </div>
                      </div>
                      
                      <div className="step-card">
                        <h4>Interactive Element Creation</h4>
                        <ul>
                          <li>Develop downloadable resources (templates, checklists)</li>
                          <li>Create technical diagrams and visualizations</li>
                          <li>Build interactive code examples where applicable</li>
                          <li>Design implementation worksheets for readers</li>
                          <li>Prepare supplementary materials for different expertise levels</li>
                        </ul>
                        <div className="tip">
                          <strong>Pro Tip:</strong> Create a consistent visual style guide for all diagrams and resources to maintain brand identity across platforms.
                        </div>
                      </div>
                      
                      <div className="step-card">
                        <h4>Review & Refinement</h4>
                        <ul>
                          <li>Technical accuracy review by subject matter experts</li>
                          <li>Readability and clarity assessment</li>
                          <li>SEO optimization for primary keywords</li>
                          <li>Feedback incorporation and revisions</li>
                          <li>Final proofread and technical verification</li>
                        </ul>
                        <div className="tip">
                          <strong>Pro Tip:</strong> Create a checklist of common issues to look for during review, such as technical accuracy, clarity of explanations, and consistent terminology.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
};

export default WorkflowPage;
