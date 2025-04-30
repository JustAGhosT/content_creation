import React from 'react';

const MobileResponsiveness = ({ children }) => {
  return (
    <div className="mobile-responsive">
      {children}
      <style jsx>{`
        .mobile-responsive {
          display: flex;
          flex-direction: column;
          padding: 1rem;
        }

        @media (min-width: 768px) {
          .mobile-responsive {
            flex-direction: row;
            padding: 2rem;
          }
        }

        @media (min-width: 1024px) {
          .mobile-responsive {
            padding: 3rem;
          }
        }
      `}</style>
    </div>
  );
};

export default MobileResponsiveness;
