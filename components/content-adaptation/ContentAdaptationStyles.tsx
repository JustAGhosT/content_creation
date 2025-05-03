import React from 'react';

const ContentAdaptationStyles: React.FC = () => {
  return (
    <style jsx global>{`
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
      .content-adaptation {
        margin: 2rem 0;
      }
      .adaptation-container {
        background-color: white;
        border-radius: 8px;
        padding: 1.5rem;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
      }
      .adaptation-examples {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 1.5rem;
        margin: 1.5rem 0;
      }
      .adaptation-card {
        background-color: #f8f9fa;
        border-radius: 8px;
        padding: 1.5rem;
      }
      .adaptation-card h4 {
        margin-top: 0;
        color: #2c3e50;
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      .adaptation-card h4 .platform-badge {
        background-color: #4a6491;
        color: white;
        padding: 0.2rem 0.5rem;
        border-radius: 4px;
        font-size: 0.8rem;
      }
      .adaptation-card .example {
        background-color: white;
        border: 1px solid #e9ecef;
        border-radius: 4px;
        padding: 1rem;
        margin: 1rem 0;
        font-size: 0.9rem;
      }
      .adaptation-card .example .title {
        font-weight: bold;
        color: #2c3e50;
        margin-bottom: 0.5rem;
      }
      .adaptation-card .notes {
        font-size: 0.85rem;
        color: #666;
      }
      @media (max-width: 768px) {
        .stage-steps, .adaptation-examples {
          grid-template-columns: 1fr;
        }
      }
    `}</style>
  );
};

export default ContentAdaptationStyles;